// src/classes/dto/create-class.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsNumber,
  Min,
  IsArray,
  IsBoolean,
  ValidateIf,
} from 'class-validator';

export class CreateClassDto {
  @ApiProperty({
    example: 'Clase de Yoga Matutino',
    description: 'Nombre de la clase',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Una clase energizante para empezar el día.',
    description: 'Descripción de la clase',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '60d5f3f5c8b9c8a0b8f0e1c3',
    description: 'ID de la Academia',
  })
  @IsNotEmpty()
  @IsMongoId()
  academyId: string; // Se guardará como Types.ObjectId

  @ApiPropertyOptional({
    example: '60d5f3f5c8b9c8a0b8f0e1c4',
    description: 'ID del Profesor (Usuario)',
  })
  @IsOptional()
  @IsMongoId()
  teacherId?: string; // Se guardará como Types.ObjectId

  @ApiProperty({
    example: '2024-09-15T10:00:00.000Z',
    description: 'Fecha y hora de inicio',
  })
  @IsNotEmpty()
  startTime: Date;

  @ApiProperty({
    example: '2024-09-15T11:30:00.000Z',
    description: 'Fecha y hora de fin',
  })
  @IsNotEmpty()
  // Deberías añadir validación para que endTime sea posterior a startTime
  endTime: Date;

  @ApiProperty({ example: 20, description: 'Capacidad máxima de estudiantes' })
  @IsNumber()
  @Min(0) // 0 podría ser ilimitado, o considera @Min(1)
  capacity: number;

  @ApiPropertyOptional({
    example: 15.99,
    description: 'Precio de la clase (si se paga individualmente)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'USD', description: 'Moneda del precio' })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.price !== undefined && o.price > 0) // Validar currency solo si hay precio
  @IsNotEmpty({
    message: 'Currency is required if price is provided and greater than 0',
  })
  currency?: string;

  @ApiPropertyOptional({
    example: ['Yoga', 'Principiantes'],
    type: [String],
    description: 'Etiquetas o categorías',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si la clase está activa y visible para inscripciones',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
