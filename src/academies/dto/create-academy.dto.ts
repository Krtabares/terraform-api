// src/academies/dto/create-academy.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
  IsMongoId,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';

// Suponiendo que tienes un enum para el status
export enum AcademyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

export class CreateAcademyDto {
  @ApiProperty({
    example: 'Academia de Código Avanzado',
    description: 'Nombre de la academia',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Calle Falsa 123, Ciudad Ejemplo',
    description: 'Dirección de la academia',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    example: '+1-555-123-4567',
    description: 'Teléfono de contacto',
  })
  @IsString()
  @IsNotEmpty()
  // Podrías añadir @IsPhoneNumber si instalas libphonenumber-js y un validador custom
  phone: string;

  @ApiProperty({
    example: 'https://example.com/logo.png',
    description: 'URL del logo',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  logo?: string;

  @ApiProperty({
    example: '60d5f3f5c8b9c8a0b8f0e1c3',
    description: 'ID del usuario director',
  })
  @IsNotEmpty()
  @IsMongoId() // Valida que sea un string con formato de ObjectId de MongoDB
  director: string;

  @ApiProperty({
    example: AcademyStatus.ACTIVE,
    description: 'Estado de la academia',
    enum: AcademyStatus,
    default: AcademyStatus.ACTIVE,
    required: false, // El default se aplica en el schema de Mongoose
  })
  @IsOptional()
  @IsEnum(AcademyStatus)
  status?: AcademyStatus;

  @ApiProperty({
    example: ['Desarrollo Web Full Stack', 'Ciencia de Datos con Python'],
    description: 'Lista de cursos principales',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mainCourses?: string[];

  @ApiProperty({
    example: '2015-08-20',
    description: 'Fecha de fundación (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  foundedDate?: Date;
}
