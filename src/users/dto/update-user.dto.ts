import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Juan Carlos Pérez',
    description: 'Nuevo nombre completo del usuario.',
  })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    example: 'juan.nuevo@example.com',
    description: 'Nuevo email del usuario (requerirá verificación).',
  })
  @IsOptional()
  @IsEmail()
  email?: string; // Si cambias el email, considera un flujo de verificación
}
