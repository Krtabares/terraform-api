// src/classes/dto/update-class.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateClassDto } from './create-class.dto';

export class UpdateClassDto extends PartialType(CreateClassDto) {}