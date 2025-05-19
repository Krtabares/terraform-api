// src/reservation-requests/dto/query-reservation-request.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { ReservationRequestStatus } from '../schemas/reservation-request.schema';
import { Transform } from 'class-transformer';

export class QueryReservationRequestDto {
  @ApiPropertyOptional({ description: 'Filtrar por ID de academia' })
  @IsOptional()
  @IsMongoId()
  academyId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de clase' })
  @IsOptional()
  @IsMongoId()
  classId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por ID de estudiante (para admin)',
  })
  @IsOptional()
  @IsMongoId()
  studentId?: string;

  @ApiPropertyOptional({
    enum: ReservationRequestStatus,
    description: 'Filtrar por estado de la solicitud',
  })
  @IsOptional()
  @IsEnum(ReservationRequestStatus)
  status?: ReservationRequestStatus;

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
    description: 'Campo para ordenar (ej: createdAt:desc o requestDate:asc)',
  })
  @IsOptional()
  @IsString()
  sortBy?: string; // Formato: "field:direction" e.g., "createdAt:desc"
}
