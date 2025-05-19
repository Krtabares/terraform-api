// src/reservation-requests/dto/create-reservation-request.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReservationRequestDto {
  @ApiProperty({ example: '60d5f3f5c8b9c8a0b8f0e1c6', description: 'ID de la Clase a la que se solicita cupo' })
  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @ApiPropertyOptional({ example: 'Tengo muchas ganas de tomar esta clase!', description: 'Notas opcionales del estudiante para el administrador' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  studentNotes?: string;
}