// src/auth/dto/change-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario.',
    example: 'P@$$wOrdActual123',
  })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description:
      'Nueva contraseña (mínimo 6 caracteres, al menos una mayúscula, una minúscula y un número).',
    example: 'Nuev@P@$$wOrd456',
    minLength: 6,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  // @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
  //   message: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número/símbolo.',
  // }) // Descomenta para una validación de contraseña más fuerte
  newPassword: string;
}
