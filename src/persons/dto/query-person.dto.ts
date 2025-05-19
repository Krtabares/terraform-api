// src/persons/dto/query-person.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { PersonStatus } from '../schemas/person.schema';
import { Transform } from 'class-transformer';

export class QueryPersonDto {
  @ApiPropertyOptional({ description: 'Buscar por nombre, apellido o email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de academia asociada' })
  @IsOptional()
  @IsMongoId()
  associatedAcademyId?: string;

  @ApiPropertyOptional({
    enum: PersonStatus,
    description: 'Filtrar por estado',
  })
  @IsOptional()
  @IsEnum(PersonStatus)
  status?: PersonStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por etiqueta(s), separadas por coma',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: 'Filtrar si tiene o no cuenta de usuario (true/false/any)',
  })
  @IsOptional()
  @IsString() // Se parseará a booleano o se manejará especial
  hasUserAccount?: string;

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

  @ApiPropertyOptional({ description: 'Campo para ordenar (ej: lastName:asc)' })
  @IsOptional()
  @IsString()
  sortBy?: string;
}
