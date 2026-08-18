import { PartialType } from '@nestjs/swagger';

import { CreateFunctionalRoleDto } from './create-functional-role.dto';

export class UpdateFunctionalRoleDto extends PartialType(CreateFunctionalRoleDto) {}
