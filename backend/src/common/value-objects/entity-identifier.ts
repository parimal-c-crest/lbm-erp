import { BadRequestException } from '@nestjs/common';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Shared identifier-validation boundary (ADR-154, closes USR-RISK-001) — every delete command
// (User/Role/Profile/Group) constructs one of these before running any query. Rejects
// empty/malformed input at construction, structurally preventing the exact legacy
// `deleteRole()` failure mode (empty/missing id reaching a destructive query unchecked) that
// caused a real data-loss incident.
export class EntityIdentifier {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static from(raw: unknown): EntityIdentifier {
    if (typeof raw !== 'string' || raw.trim().length === 0) {
      throw new BadRequestException('Identifier must be a non-empty string.');
    }
    if (!UUID_PATTERN.test(raw)) {
      throw new BadRequestException('Identifier must be a valid UUID.');
    }
    return new EntityIdentifier(raw);
  }

  toString(): string {
    return this.value;
  }
}
