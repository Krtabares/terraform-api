// src/inscriptions/dto/query-inscription.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  InscriptionStatus,
  InscriptionPaymentType,
} from '../schemas/inscription.schema';

export class QueryInscriptionDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID de academia' })
  @IsOptional()
  @IsMongoId()
  academyId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de clase' })
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de estudiante' })
  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @ApiPropertyOptional({
    enum: InscriptionStatus,
    description: 'Filtrar por estado de la inscripción',
  })
  @IsOptional()
  @IsEnum(InscriptionStatus)
  status?: InscriptionStatus;

  @ApiPropertyOptional({
    enum: InscriptionPaymentType,
    description: 'Filtrar por tipo de pago',
  })
  @IsOptional()
  @IsEnum(InscriptionPaymentType)
  paymentType?: InscriptionPaymentType;

  @ApiPropertyOptional({
    description: 'Número de página',
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Número de ítems por página',
    default: 10,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Campo para ordenar (ej: createdAt:desc)',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;
}
