// src/inscriptions/schemas/inscription.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum InscriptionStatus {
  CONFIRMED = 'confirmed',
  PENDING_PAYMENT = 'pending_payment', // Si el admin confirma pero el pago del estudiante está pendiente
  ATTENDED = 'attended',
  NO_SHOW = 'no-show',
  CANCELLED_BY_ADMIN = 'cancelled_by_admin',
}

export enum InscriptionPaymentType {
  PAID_PER_CLASS = 'paid_per_class', // Pago individual por la clase
  MEMBERSHIP = 'membership', // Cubierto por una membresía activa
  COMPLIMENTARY = 'complimentary', // Cortesía, sin costo directo
  // OTHER = 'other', // Podrías añadir más si es necesario
}

export type InscriptionDocument = Inscription & Document;

@Schema({ timestamps: true })
export class Inscription {
  @ApiProperty({ type: String })
  _id?: Types.ObjectId;

  @ApiProperty({ type: String, description: 'ID del Estudiante (User)' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  studentId: Types.ObjectId;

  @ApiProperty({ type: String, description: 'ID de la Clase' })
  @Prop({ type: Types.ObjectId, ref: 'Class', required: true, index: true })
  classId: Types.ObjectId;

  @ApiProperty({ type: String, description: 'ID de la Academia' })
  @Prop({ type: Types.ObjectId, ref: 'Academy', required: true, index: true })
  academyId: Types.ObjectId;

  @ApiProperty({
    type: String,
    description: 'ID del Admin que procesó la inscripción',
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  processedByAdminId: Types.ObjectId;

  @ApiProperty({
    type: String,
    description: 'ID de la Solicitud de Reserva original (si aplica)',
    required: false,
  })
  @Prop({
    type: Types.ObjectId,
    ref: 'ReservationRequest',
    unique: true,
    sparse: true,
  })
  reservationRequestId?: Types.ObjectId;

  @ApiProperty({
    enum: InscriptionStatus,
    default: InscriptionStatus.CONFIRMED,
  })
  @Prop({
    type: String,
    enum: InscriptionStatus,
    default: InscriptionStatus.CONFIRMED,
    required: true,
  })
  status: InscriptionStatus;

  @ApiProperty({
    enum: InscriptionPaymentType,
    description: 'Cómo se cubrió el costo de esta inscripción',
  })
  @Prop({ type: String, enum: InscriptionPaymentType, required: true })
  paymentType: InscriptionPaymentType;

  @ApiProperty({
    type: String,
    description:
      'ID del Pago asociado (si paymentType es PAID_PER_CLASS y se genera un pago)',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  paymentId?: Types.ObjectId;

  @ApiProperty({
    type: String,
    description:
      'ID de la Membresía de Usuario utilizada (si paymentType es MEMBERSHIP)',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'UserMembership' })
  userMembershipId?: Types.ObjectId;

  @ApiProperty({
    description:
      'Monto registrado por el admin (si aplica, para PAID_PER_CLASS manual)',
    required: false,
  })
  @Prop()
  amountPaid?: number;

  @ApiProperty({
    description: 'Moneda (si amountPaid aplica)',
    required: false,
  })
  @Prop()
  currency?: string;

  @ApiProperty({
    description: 'Notas del admin sobre la inscripción',
    required: false,
  })
  @Prop({ trim: true })
  adminNotes?: string;

  @ApiProperty({ description: 'Fecha de inscripción efectiva' })
  @Prop({ default: Date.now })
  inscriptionDate: Date;

  @ApiProperty()
  createdAt?: Date;

  @ApiProperty()
  updatedAt?: Date;
}
export const InscriptionSchema = SchemaFactory.createForClass(Inscription);
InscriptionSchema.index({ studentId: 1, classId: 1 }, { unique: true });
