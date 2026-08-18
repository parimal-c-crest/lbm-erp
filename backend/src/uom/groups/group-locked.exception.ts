import { ConflictException } from '@nestjs/common';

// BR-020/ADR-190/VR-018 — a locked-field edit (or any delete) on a transaction-referenced Group.
// `8-api.md`'s documented error shape: `{ code: "GROUP_LOCKED", lockedFields: [...] }`.
export class GroupLockedException extends ConflictException {
  constructor(lockedFields: string[]) {
    super({
      code: 'GROUP_LOCKED',
      message: 'This Group is transaction-referenced; the requested fields are locked.',
      lockedFields,
    });
  }
}
