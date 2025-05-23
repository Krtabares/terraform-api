// src/shared/dto/query-params.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryParamsDto {
  @ApiPropertyOptional({
    description: 'Número de página',
    default: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Resultados por página',
    default: 10,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Término de búsqueda' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Campo para ordenar (ej: name:asc o createdAt:desc)',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  // Puedes añadir más filtros comunes aquí, como 'role' para este caso específico
  @ApiPropertyOptional({ description: 'Filtrar por rol específico' })
  @IsOptional()
  @IsString() // O un enum si los roles son fijos
  role?: string;
}
