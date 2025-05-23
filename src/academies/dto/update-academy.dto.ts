// src/academies/dto/update-academy.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateAcademyDto } from './create-academy.dto';

export class UpdateAcademyDto extends PartialType(CreateAcademyDto) {}
