// src/payments/schemas/payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentStatus {
  PENDING = 'pending', // Esperando acción del estudiante o confirmación del gateway
  COMPLETED = 'completed', // Pago exitoso
  FAILED = 'failed', // Pago fallido
  CANCELLED = 'cancelled', // Pago cancelado por admin o sistema
  REFUNDED = 'refunded',
  // PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum PaymentItemType {
  CLASS_INSCRIPTION = 'class_inscription',
  // CLASS_PACKAGE = 'class_package',
  // MEMBERSHIP_RENEWAL = 'membership_renewal',
}

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @ApiProperty({ type: String })
  _id?: Types.ObjectId;

  @ApiProperty({
    type: String,
    description: 'ID del Usuario que debe/realizó el pago',
  })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId; // Estudiante

  @ApiProperty({
    type: String,
    description: 'ID del ítem asociado (ej. Inscripción, Clase)',
  })
  @Prop({ type: Types.ObjectId, required: true, index: true })
  itemId: Types.ObjectId; // Podría ser InscriptionID o ClassID directamente

  @ApiProperty({ enum: PaymentItemType, description: 'Tipo de ítem pagado' })
  @Prop({ type: String, enum: PaymentItemType, required: true })
  itemType: PaymentItemType;

  @ApiProperty({
    type: String,
    description: 'ID de la Academia (denormalizado)',
  })
  @Prop({ type: Types.ObjectId, ref: 'Academy', required: true, index: true })
  academyId: Types.ObjectId;

  @ApiProperty({ description: 'Descripción del pago' })
  @Prop({ required: true })
  description: string;

  @ApiProperty()
  @Prop({ required: true, min: 0 })
  amount: number;

  @ApiProperty({ default: 'USD' })
  @Prop({ required: true, default: 'USD' }) // O la moneda por defecto de la academia
  currency: string;

  @ApiProperty({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    required: true,
  })
  status: PaymentStatus;

  @ApiProperty({
    example: 'stripe_pi_xxxxxxxx',
    description: 'ID del intento de pago del gateway (si se usa pasarela)',
    required: false,
  })
  @Prop({ unique: true, sparse: true }) // paymentIntentId de Stripe, por ejemplo
  gatewayPaymentIntentId?: string;

  @ApiProperty({
    example: 'stripe_ch_xxxxxxxx',
    description: 'ID de la transacción/cargo del gateway',
    required: false,
  })
  @Prop({ unique: true, sparse: true })
  gatewayChargeId?: string;

  @ApiProperty({
    description: 'Método de pago utilizado (ej. stripe, manual)',
    required: false,
  })
  @Prop()
  paymentMethod?: string;

  @ApiProperty({
    description: 'Metadata adicional del pago',
    type: Object,
    required: false,
  })
  @Prop({ type: Object })
  metadata?: Record<string, any>; // Para guardar info como inscriptionId si itemId es ClassId

  @ApiProperty({
    description: 'Fecha en que el pago fue procesado/completado',
    required: false,
  })
  @Prop()
  processedAt?: Date;

  @ApiProperty({
    description: 'ID del Admin que generó/procesó este pago (si aplica)',
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  processedByAdminId?: Types.ObjectId;
}
export const PaymentSchema = SchemaFactory.createForClass(Payment);
