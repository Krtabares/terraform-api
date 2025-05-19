// src/persons/schemas/person-academy-membership.schema.ts (NUEVO ARCHIVO)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum PersonAcademyRelationType { // O rol de la persona EN la academia
  STUDENT = 'student',
  PROSPECT = 'prospect',
  STAFF = 'staff_member', // Podría ser más granular si el staff tiene roles
  CONTACT = 'general_contact',
}

export type PersonAcademyMembershipDocument = PersonAcademyMembership &
  Document;

@Schema({ timestamps: true })
export class PersonAcademyMembership {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Person', required: true, index: true })
  personId: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Academy', required: true, index: true })
  academyId: Types.ObjectId;

  @ApiProperty({
    enum: PersonAcademyRelationType,
    description:
      'Tipo de relación o rol de la persona en esta academia específica',
  })
  @Prop({ type: String, enum: PersonAcademyRelationType, required: true })
  relationType: PersonAcademyRelationType; // Ej: 'student', 'prospect', 'staff'

  @ApiProperty({
    description:
      'Fecha desde que la persona está asociada con esta academia con este rol',
  })
  @Prop({ default: Date.now })
  startDate: Date;

  @ApiProperty({
    required: false,
    description: 'Fecha hasta que la persona estuvo asociada (si aplica)',
  })
  @Prop()
  endDate?: Date;

  @ApiProperty({
    default: true,
    description: '¿Está activa esta membresía/asociación?',
  })
  @Prop({ default: true })
  isActive: boolean; // Para desactivar una asociación sin borrarla

  @ApiProperty({
    type: Object,
    description:
      'Metadata específica de esta relación (ej. número de estudiante en esta academia)',
  })
  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const PersonAcademyMembershipSchema = SchemaFactory.createForClass(
  PersonAcademyMembership,
);
// Índice único para evitar duplicados de la misma persona en la misma academia con el mismo rol activo (si es necesario)
PersonAcademyMembershipSchema.index(
  { personId: 1, academyId: 1, relationType: 1, isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true }, // Solo si isActive es true
  },
);
