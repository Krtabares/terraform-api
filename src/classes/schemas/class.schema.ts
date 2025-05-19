import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ClassDocument = Class & Document;

@Schema({ timestamps: true })
export class Class {

  _id: string;
  
  @ApiProperty()
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ required: false })
  @Prop({ trim: true })
  description?: string;

  @ApiProperty({
    type: String,
    description: 'ID de la Academia a la que pertenece la clase',
  })
  @Prop({ type: Types.ObjectId, ref: 'Academy', required: true, index: true })
  academyId: Types.ObjectId; // O tu tipo de Academy si no es ObjectId

  @ApiProperty({
    type: String,
    description: 'ID del Profesor (User) que imparte la clase',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  teacherId?: Types.ObjectId;

  @ApiProperty({
    example: '2024-09-15T10:00:00.000Z',
    description: 'Fecha y hora de inicio',
  })
  @Prop({ required: true })
  startTime: Date;

  @ApiProperty({
    example: '2024-09-15T11:30:00.000Z',
    description: 'Fecha y hora de fin',
  })
  @Prop({ required: true })
  endTime: Date;

  @ApiProperty({ example: 20, description: 'Capacidad máxima de estudiantes' })
  @Prop({ required: true, min: 0 }) // 0 podría significar ilimitado, o validar > 0
  capacity: number;

  @ApiProperty({
    example: 15.99,
    description: 'Precio por esta clase (si aplica)',
    required: false,
  })
  @Prop()
  price?: number; // Si es 0 o nulo, podría ser parte de un paquete/membresía

  @ApiProperty({
    example: 'USD',
    description: 'Moneda del precio',
    required: false,
  })
  @Prop({ default: 'USD' }) // O tu moneda por defecto
  currency?: string;

  @ApiProperty({
    example: ['Yoga', 'Principiantes'],
    type: [String],
    required: false,
  })
  @Prop([String])
  tags?: string[];

  @ApiProperty({ default: true })
  @Prop({ default: true })
  isActive: boolean; // Para habilitar/deshabilitar la clase

  @ApiProperty({
    example: 5,
    description: 'Número actual de estudiantes inscritos',
    default: 0,
  })
  @Prop({ default: 0, min: 0 })
  enrolledCount: number;
}
export const ClassSchema = SchemaFactory.createForClass(Class);
