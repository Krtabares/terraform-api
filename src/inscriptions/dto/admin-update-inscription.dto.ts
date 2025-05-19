// src/inscriptions/dto/admin-update-inscription.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InscriptionStatus } from '../schemas/inscription.schema';

export class AdminUpdateInscriptionDto {
  @ApiPropertyOptional({
    enum: [InscriptionStatus.ATTENDED, InscriptionStatus.NO_SHOW],
    description: 'Nuevo estado de asistencia para la inscripción',
  })
  @IsOptional()
  @IsEnum([InscriptionStatus.ATTENDED, InscriptionStatus.NO_SHOW])
  status?: InscriptionStatus.ATTENDED | InscriptionStatus.NO_SHOW;

  @ApiPropertyOptional({ description: 'Notas adicionales del administrador' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
