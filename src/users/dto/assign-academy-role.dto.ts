import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { AcademyRole } from 'src/auth/enum/academyRole.enum';

export class AssignAcademyRoleDto {
  @ApiProperty({
    description: 'ID de la academia a la que se asigna el rol.',
    example: '60c72b2f9b1d8c001f8e4a3c',
  })
  @IsNotEmpty()
  @IsString() // Asumimos que el ID viene como string
  academyId: string;

  @ApiProperty({
    description: 'Rol a asignar en la academia.',
    enum: AcademyRole,
    example: AcademyRole.PROFESOR,
  })
  @IsNotEmpty()
  @IsEnum(AcademyRole)
  role: AcademyRole;
}
