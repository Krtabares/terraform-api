// src/reservation-requests/dto/process-reservation-request.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReservationRequestStatus } from '../schemas/reservation-request.schema'; // Asumiendo esta ruta
import { InscriptionPaymentType } from 'src/inscriptions/schemas/inscription.schema';

// Definición básica de PaymentDetailsDto para el admin
// Esto se expandirá cuando definas bien los tipos de pago
export class AdminPaymentDetailsDto {
  @ApiProperty({
    enum: InscriptionPaymentType,
    description: 'Cómo se cubrirá el costo de esta inscripción',
  })
  @IsNotEmpty()
  @IsEnum(InscriptionPaymentType)
  paymentType: InscriptionPaymentType;

  @ApiPropertyOptional({
    example: 25.0,
    description: 'Monto pagado (si el admin registra pago manual)',
  })
  @IsOptional()
  @Type(() => Number)
  amountPaid?: number;

  @ApiPropertyOptional({
    example: 'USD',
    description: 'Moneda (si amountPaid se provee)',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    example: '60d5f3f5c8b9c8a0b8f0e1d0',
    description:
      'ID de la membresía de usuario a utilizar (si paymentType es MEMBERSHIP)',
  })
  @IsOptional()
  userMembershipId?: string;

  @ApiPropertyOptional({
    description: 'Notas del administrador sobre la inscripción',
  })
  @IsOptional()
  adminNotes?: string;

  // Puedes añadir más campos según sea necesario, ej. studentIdToCharge
}

export class ProcessReservationRequestDto {
  @ApiProperty({
    enum: [
      ReservationRequestStatus.APPROVED,
      ReservationRequestStatus.REJECTED,
    ],
    description: 'Nuevo estado para la solicitud (APPROVED o REJECTED)',
  })
  @IsNotEmpty()
  @IsEnum([
    ReservationRequestStatus.APPROVED,
    ReservationRequestStatus.REJECTED,
  ])
  status: ReservationRequestStatus.APPROVED | ReservationRequestStatus.REJECTED;

  @ApiPropertyOptional({
    example: 'Aprobado. Bienvenido!',
    description: 'Notas opcionales del administrador',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  adminNotes?: string;

  // paymentDetails solo es relevante y requerido si status es APPROVED y la clase tiene costo
  @ApiPropertyOptional({
    description:
      'Detalles del pago/cobertura si la solicitud es aprobada y la clase tiene costo. Requerido si la clase tiene precio y status es APPROVED.',
    type: AdminPaymentDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminPaymentDetailsDto)
  paymentDetails?: AdminPaymentDetailsDto;
}
