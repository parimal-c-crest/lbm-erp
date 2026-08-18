import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';

import { REDIS_LOCK_CLIENT } from './redis-lock-client.provider';

export const DEFAULT_LOCK_TTL_MS = 30_000;

// Compare-and-extend / compare-and-delete via Lua — atomic so a lock can't be renewed or
// released by anyone but its current holder, even under concurrent requests.
const EXTEND_IF_OWNER_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("PEXPIRE", KEYS[1], ARGV[2])
else
  return 0
end
`;
const DELETE_IF_OWNER_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

export interface LockAcquireResult {
  acquired: boolean;
  heldByUserId?: string;
}

// Project-wide standing concurrent-edit lock (ADR-079/080/084) — Redis TTL-based, heartbeat-
// renewed, instant release on clean close. This is the **first implementation** of the shared
// utility (T-063); every future module with a real editable record reuses this exact class
// rather than inventing its own concurrency answer. Deliberately domain-agnostic: it knows
// nothing about "time clock records" or "sales orders" — callers pass their own
// `resourceType:resourceId` key and resolve a blocked lock's `heldByUserId` to a display name
// themselves (a name lookup belongs to the caller's own data, not this generic primitive).
@Injectable()
export class ConcurrencyLockService {
  constructor(@Inject(REDIS_LOCK_CLIENT) private readonly redis: Redis) {}

  private key(resourceType: string, resourceId: string): string {
    return `lock:${resourceType}:${resourceId}`;
  }

  async acquire(
    resourceType: string,
    resourceId: string,
    userId: string,
    ttlMs = DEFAULT_LOCK_TTL_MS,
  ): Promise<LockAcquireResult> {
    const key = this.key(resourceType, resourceId);
    const set = await this.redis.set(key, userId, 'PX', ttlMs, 'NX');
    if (set === 'OK') return { acquired: true };

    const heldByUserId = await this.redis.get(key);
    return { acquired: false, heldByUserId: heldByUserId ?? undefined };
  }

  async heartbeat(
    resourceType: string,
    resourceId: string,
    userId: string,
    ttlMs = DEFAULT_LOCK_TTL_MS,
  ): Promise<boolean> {
    const key = this.key(resourceType, resourceId);
    const result = await this.redis.eval(EXTEND_IF_OWNER_SCRIPT, 1, key, userId, ttlMs);
    return result === 1;
  }

  async release(resourceType: string, resourceId: string, userId: string): Promise<boolean> {
    const key = this.key(resourceType, resourceId);
    const result = await this.redis.eval(DELETE_IF_OWNER_SCRIPT, 1, key, userId);
    return result === 1;
  }

  async isHeldBy(resourceType: string, resourceId: string, userId: string): Promise<boolean> {
    const key = this.key(resourceType, resourceId);
    const holder = await this.redis.get(key);
    return holder === userId;
  }
}
