// src/reservation-requests/schemas/reservation-request.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum ReservationRequestStatus {
  PENDING = 'pending', // Solicitud inicial del estudiante
  APPROVED = 'approved', // Admin aprobó, inscripción creada
  REJECTED = 'rejected', // Admin rechazó
  CANCELLED_BY_USER = 'cancelled_by_user', // Estudiante canceló su solicitud antes de ser procesada
}

export type ReservationRequestDocument = ReservationRequest & Document;

@Schema({ timestamps: true })
export class ReservationRequest {
  _id: string;

  @ApiProperty({
    type: String,
    description: 'ID del Estudiante (User) que solicita',
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  studentId: Types.ObjectId;

  @ApiProperty({ type: String, description: 'ID de la Clase solicitada' })
  @Prop({ type: Types.ObjectId, ref: 'Class', required: true, index: true })
  classId: Types.ObjectId;

  @ApiProperty({
    type: String,
    description: 'ID de la Academia (denormalizado)',
  })
  @Prop({ type: Types.ObjectId, ref: 'Academy', required: true, index: true })
  academyId: Types.ObjectId; // Para facilitar queries del admin

  @ApiProperty({
    enum: ReservationRequestStatus,
    default: ReservationRequestStatus.PENDING,
  })
  @Prop({
    type: String,
    enum: ReservationRequestStatus,
    default: ReservationRequestStatus.PENDING,
    required: true,
  })
  status: ReservationRequestStatus;

  @ApiProperty({ description: 'Fecha de la solicitud' })
  @Prop({ default: Date.now })
  requestDate: Date;

  @ApiProperty({
    description: 'Notas del estudiante para el admin',
    required: false,
  })
  @Prop({ trim: true })
  studentNotes?: string;

  @ApiProperty({
    description: 'Notas del admin al procesar la solicitud',
    required: false,
  })
  @Prop({ trim: true })
  adminNotes?: string;

  @ApiProperty({
    type: String,
    description: 'ID de la Inscripción creada si se aprueba',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'Inscription' }) // Enlace a la inscripción formal
  inscriptionId?: Types.ObjectId;
}
export const ReservationRequestSchema =
  SchemaFactory.createForClass(ReservationRequest);
ReservationRequestSchema.index(
  { studentId: 1, classId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: ReservationRequestStatus.PENDING },
  },
); // Evitar múltiples solicitudes PENDIENTES para la misma clase/estudiante
