// src/persons/schemas/person.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type PersonDocument = Person & Document;

export enum PersonGender { // Opcional, pero común
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum PersonStatus { // Estado del contacto/alumno dentro de la academia
  PROSPECT = 'prospect', // Interesado, aún no inscrito
  ACTIVE_STUDENT = 'active_student', // Actualmente tomando clases
  INACTIVE_STUDENT = 'inactive_student', // Estuvo activo, ahora no
  ALUMNI = 'alumni', // Egresado
  LEAD = 'lead', // Contacto general
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class Person {
  @ApiProperty({ type: String, description: 'ID único de la persona' })
  _id?: Types.ObjectId; // Mongoose lo añade, pero es bueno tenerlo para los tipos

  @ApiProperty({ example: 'Ana', description: 'Nombre de pila' })
  @Prop({ required: true, trim: true })
  firstName: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido(s)' })
  @Prop({ required: true, trim: true })
  lastName: string;

  @ApiPropertyOptional({
    example: 'ana.perez@example.com',
    description: 'Correo electrónico principal',
  })
  @Prop({ trim: true, lowercase: true, sparse: true }) // sparse: true si puede ser null y quieres un índice único condicional
  email?: string; // Puede ser opcional si no todos los contactos tienen email o si no es el identificador único

  @ApiPropertyOptional({
    example: '+34600123456',
    description: 'Número de teléfono principal',
  })
  @Prop({ trim: true })
  phone?: string;

  @ApiPropertyOptional({
    example: '1995-05-15',
    type: Date,
    description: 'Fecha de nacimiento',
  })
  @Prop()
  dateOfBirth?: Date;

  @ApiPropertyOptional({ enum: PersonGender, description: 'Género' })
  @Prop({ type: String, enum: PersonGender })
  gender?: PersonGender;

  @ApiPropertyOptional({ description: 'Dirección completa' })
  @Prop({ trim: true })
  address?: string; // Podría ser un objeto más complejo: street, city, zip, country

  @ApiPropertyOptional({
    description: 'Notas internas sobre esta persona/alumno',
  })
  @Prop({ trim: true })
  internalNotes?: string;

  @ApiPropertyOptional({
    type: String,
    description:
      'ID del Usuario del sistema vinculado (si esta persona tiene una cuenta)',
    readOnly: true,
  })
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    unique: true,
    sparse: true,
    index: true,
    default: null,
  }) // unique si un usuario solo puede estar ligado a una persona
  userId?: Types.ObjectId | null; // Enlace a la colección Users

  @ApiProperty({
    enum: PersonStatus,
    default: PersonStatus.LEAD,
    description: 'Estado del contacto/alumno',
  })
  @Prop({ type: String, enum: PersonStatus, default: PersonStatus.LEAD })
  status: PersonStatus;

  @ApiPropertyOptional({
    description: 'Tags o etiquetas para categorizar a la persona',
  })
  @Prop([String])
  tags?: string[];

  @ApiPropertyOptional({
    type: Object,
    description: 'Campos personalizados definidos por la academia',
  })
  @Prop({ type: Object }) // Para flexibilidad: { "nivel_ingles": "B2", "interes_principal": "Yoga" }
  customFields?: Record<string, any>;

  @ApiProperty({ description: 'Fecha de creación del registro' })
  createdAt?: Date;

  @ApiProperty({ description: 'Fecha de última actualización del registro' })
  updatedAt?: Date;
}

export const PersonSchema = SchemaFactory.createForClass(Person);

// Índice para búsquedas comunes, ej. por email dentro de una academia (si email es importante)
// PersonSchema.index({ email: 1, associatedAcademyId: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });
// Considera si el email debe ser único globalmente o por academia, o si puede haber personas sin email.
