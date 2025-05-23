// src/users/dto/academy-user.dto.ts (o en un lugar compartido)
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SystemRole } from '../../auth/enum/systemRole.enum'; // Ajusta ruta
import { AcademyRole } from '../../auth/enum/academyRole.enum'; // Ajusta ruta

export class AcademyUserDto {
  @ApiProperty()
  userId: string; // _id del User

  @ApiProperty()
  personId: string; // _id de la Person

  @ApiProperty()
  email: string;

  @ApiProperty({ example: 'Juan Pérez' })
  name?: string; // Combinación de firstName y lastName de Person

  @ApiProperty({ type: [String], enum: SystemRole })
  systemRoles: SystemRole[];

  @ApiProperty({
    enum: AcademyRole,
    description: 'Rol específico en ESTA academia',
  })
  roleInThisAcademy: AcademyRole;

  @ApiProperty({ description: 'Estado de la cuenta de usuario global' })
  isUserAccountActive: boolean;

  // Podrías añadir más campos de Person si son necesarios
  @ApiPropertyOptional()
  personFirstName?: string;

  @ApiPropertyOptional()
  personLastName?: string;
}

export class PaginatedAcademyUsersDto {
  @ApiProperty({ type: [AcademyUserDto] })
  data: AcademyUserDto[];

  @ApiProperty()
  count: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  currentPage: number;
}
