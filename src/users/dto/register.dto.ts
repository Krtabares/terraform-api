import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';
import { SystemRole } from 'src/auth/enum/systemRole.enum';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  // Para asignar roles al registrar (opcional, podría ser manejado por un admin)
  @IsOptional()
  @IsArray()
  @IsEnum(SystemRole, { each: true })
  systemRoles?: SystemRole[];

  // rolesInAcademies sería más complejo de asignar directamente en el registro público
  // usualmente se asignan después por un director o admin.
}
