import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'El email no puede estar vacío.' })
  @IsEmail({}, { message: 'El email debe ser un correo válido.' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña no puede estar vacía.' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;
}
