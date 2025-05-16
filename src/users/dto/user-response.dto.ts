// src/users/dto/user-response.dto.ts (Ejemplo)
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

class RoleInAcademyDto {
  @ApiProperty({ example: '60c72b2f9b1d8c001f8e4a3b' })
  academyId: Types.ObjectId;

  @ApiProperty({
    example: 'DIRECTOR',
    enum: ['DIRECTOR', 'PROFESOR', 'ALUMNO'],
  })
  role: string;
}

export class UserResponseDto {
  // Este DTO representaría la info pública del usuario
  @ApiProperty({ example: '60c72b2f9b1d8c001f8e4a3d' })
  _id: Types.ObjectId;

  @ApiProperty({ example: 'Juan Pérez' })
  nombre: string;

  @ApiProperty({ example: 'juan.perez@example.com' })
  email: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: [String], example: ['USER'], enum: ['ROOT', 'USER'] })
  systemRoles?: string[];

  @ApiProperty({ type: [RoleInAcademyDto], default: [] })
  rolesInAcademies?: RoleInAcademyDto[];

  @ApiProperty({ example: '2023-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-01-16T11:00:00.000Z' })
  updatedAt: Date;

  // NO incluir passwordHash
}
