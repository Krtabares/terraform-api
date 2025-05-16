// src/auth/dto/reset-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de reseteo de contraseña recibido por email.',
    example: 'a1b2c3d4e5...',
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Nueva contraseña.',
    example: 'NuevaP@$$wOrd789',
    minLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  newPassword: string;
}
