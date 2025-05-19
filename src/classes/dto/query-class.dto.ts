// src/classes/dto/query-class.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsMongoId,
  IsDateString,
  IsString,
  IsBooleanString,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum ClassSortBy {
  START_TIME_ASC = 'startTime:asc',
  START_TIME_DESC = 'startTime:desc',
  NAME_ASC = 'name:asc',
  NAME_DESC = 'name:desc',
  PRICE_ASC = 'price:asc',
  PRICE_DESC = 'price:desc',
}

export class QueryClassDto {
  @IsOptional()
  academyId?: string;

  @ApiPropertyOptional({ description: 'ID del Profesor para filtrar clases' })
  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @ApiPropertyOptional({
    description: 'Fecha mínima de inicio (YYYY-MM-DDTHH:mm:ss.sssZ)',
  })
  @IsOptional()
  @IsDateString()
  minStartTime?: Date;

  @ApiPropertyOptional({
    description: 'Fecha máxima de inicio (YYYY-MM-DDTHH:mm:ss.sssZ)',
  })
  @IsOptional()
  @IsDateString()
  maxStartTime?: Date;

  @ApiPropertyOptional({
    description: 'Filtrar por etiqueta(s), separadas por coma si son varias',
  })
  @IsOptional()
  @IsString()
  tags?: string; // Se procesará para convertir a array

  @ApiPropertyOptional({
    description: 'Filtrar por estado activo (true/false)',
  })
  @IsOptional()
  @IsBooleanString() // Acepta 'true' o 'false' como strings
  isActive?: string;

  @ApiPropertyOptional({
    description: 'Término de búsqueda para el nombre de la clase',
  })
  @IsOptional()
  @IsString()
  searchName?: string;

  @ApiPropertyOptional({
    enum: ClassSortBy,
    description: 'Campo y dirección para ordenar los resultados',
  })
  @IsOptional()
  @IsEnum(ClassSortBy)
  sortBy?: ClassSortBy;

  // Paginación (opcional, pero buena práctica)
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
}
