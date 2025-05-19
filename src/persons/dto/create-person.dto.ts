// src/persons/dto/create-person.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsArray,
  IsObject,
} from 'class-validator';
import { PersonGender, PersonStatus } from '../schemas/person.schema';
import { Type } from 'class-transformer';

export class CreatePersonDto {
  @ApiProperty({ example: 'Juan', description: 'Nombre de pila' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Rodríguez', description: 'Apellido(s)' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional({
    example: 'juan.rod@example.com',
    description: 'Correo electrónico',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+34600000000', description: 'Teléfono' })
  @IsOptional()
  @IsString() // Podrías usar @IsPhoneNumber con una librería
  phone?: string;

  @ApiPropertyOptional({
    example: '1990-01-20',
    description: 'Fecha de nacimiento (YYYY-MM-DD)',
  })
  @IsOptional()
  dateOfBirth?: Date;

  @ApiPropertyOptional({ enum: PersonGender, description: 'Género' })
  @IsOptional()
  @IsEnum(PersonGender)
  gender?: PersonGender;

  @ApiPropertyOptional({
    example: 'Calle Sol 123, Madrid',
    description: 'Dirección',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'Interesado en curso de verano.',
    description: 'Notas internas',
  })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({
    description: 'ID de la academia a la que se asocia esta persona',
  })
  @IsOptional() // Puede ser opcional si la persona no está ligada a una academia específica inicialmente
  @IsMongoId()
  associatedAcademyId?: string;

  @ApiPropertyOptional({
    enum: PersonStatus,
    default: PersonStatus.LEAD,
    description: 'Estado inicial',
  })
  @IsOptional()
  @IsEnum(PersonStatus)
  status?: PersonStatus = PersonStatus.LEAD;

  @ApiPropertyOptional({
    example: ['prospecto-web', 'verano-2024'],
    description: 'Etiquetas',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    type: Object,
    example: { referralSource: 'Website' },
    description: 'Campos personalizados',
  })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;
}
