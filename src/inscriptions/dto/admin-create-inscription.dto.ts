// src/inscriptions/dto/admin-create-inscription.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InscriptionPaymentType } from '../schemas/inscription.schema';

export class AdminCreateInscriptionDto {
  @ApiProperty({ description: 'ID del Estudiante a inscribir' })
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @ApiProperty({ description: 'ID de la Clase a la que se inscribe' })
  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @ApiProperty({
    enum: InscriptionPaymentType,
    description: 'Método de pago/cobertura de la inscripción',
  })
  @IsNotEmpty()
  @IsEnum(InscriptionPaymentType)
  paymentType: InscriptionPaymentType;

  @ApiPropertyOptional({
    description:
      'Monto pagado (requerido si paymentType es PAID_PER_CLASS y no se genera pago al estudiante)',
  })
  @IsOptional()
  @ValidateIf((o) => o.paymentType === InscriptionPaymentType.PAID_PER_CLASS)
  // @IsNotEmpty({ message: 'Amount paid is required for PAID_PER_CLASS if not generating a student payment link.' }) // Comentado por ahora
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amountPaid?: number;

  @ApiPropertyOptional({
    description: 'Moneda (requerido si amountPaid se provee)',
  })
  @IsOptional()
  @ValidateIf((o) => o.amountPaid !== undefined && o.amountPaid > 0)
  @IsNotEmpty({
    message:
      'Currency is required if amountPaid is provided and greater than 0.',
  })
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description:
      'ID de la membresía del usuario (requerido si paymentType es MEMBERSHIP)',
  })
  @IsOptional()
  @ValidateIf((o) => o.paymentType === InscriptionPaymentType.MEMBERSHIP)
  @IsNotEmpty({
    message: 'User Membership ID is required for MEMBERSHIP payment type.',
  })
  @IsMongoId()
  userMembershipId?: string;

  @ApiPropertyOptional({
    description: 'Notas del administrador sobre la inscripción',
  })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
