// src/academies/schemas/academy.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type AcademyDocument = Academy & Document;

@Schema({ timestamps: true })
export class Academy {
  // No es necesario extender Document aquí, AcademyDocument se encarga de eso
  @ApiProperty({
    example: 'Academia de Código Avanzado',
    description: 'Nombre de la academia',
  })
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @ApiProperty({
    example: 'Calle Falsa 123, Ciudad Ejemplo',
    description: 'Dirección de la academia',
  })
  @Prop({ required: true, trim: true })
  address: string;

  @ApiProperty({
    example: '+1-555-123-4567',
    description: 'Teléfono de contacto de la academia',
  })
  @Prop({ required: true, trim: true })
  phone: string;

  @ApiProperty({
    example: 'https://example.com/logo.png',
    description: 'URL del logo de la academia',
    required: false,
  })
  @Prop({ trim: true })
  logo?: string;

  @ApiProperty({
    example: '60d5f3f5c8b9c8a0b8f0e1c3',
    description: 'ID del usuario director de la academia (referencia a User)',
  })
  @Prop({ required: true }) // Podrías usar type: mongoose.Schema.Types.ObjectId, ref: 'User' si tienes un modelo User
  director: string; // userId

  @ApiProperty({
    example: 'active',
    description: 'Estado de la academia',
    enum: ['active', 'inactive', 'pending'],
    default: 'active',
  })
  @Prop({ default: 'active', enum: ['active', 'inactive', 'pending'] })
  status: string;

  @ApiProperty({
    example: ['Desarrollo Web Full Stack', 'Ciencia de Datos con Python'],
    description: 'Lista de cursos principales ofrecidos',
    type: [String],
    required: false,
  })
  @Prop([String])
  mainCourses?: string[];

  @ApiProperty({
    example: '2015-08-20T00:00:00.000Z',
    description: 'Fecha de fundación de la academia',
    required: false,
  })
  @Prop()
  foundedDate?: Date;

  // Los campos createdAt y updatedAt son añadidos automáticamente por { timestamps: true }
  @ApiProperty({
    description: 'Fecha de creación del registro',
    readOnly: true,
  })
  createdAt?: Date;

  @ApiProperty({
    description: 'Fecha de última actualización del registro',
    readOnly: true,
  })
  updatedAt?: Date;
}

export const AcademySchema = SchemaFactory.createForClass(Academy);
