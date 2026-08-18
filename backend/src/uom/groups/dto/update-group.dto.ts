import { PartialType } from '@nestjs/swagger';

import { CreateGroupDto } from './create-group.dto';

// All fields optional/partial per `8-api.md` — BR-020's lock check inspects which top-level keys
// were actually present on the raw request body (via `Object.keys`), not just which resolved to a
// non-undefined value, so a partial PATCH correctly reports only its own submitted fields.
export class UpdateGroupDto extends PartialType(CreateGroupDto) {}
