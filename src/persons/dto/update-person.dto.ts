// src/persons/dto/update-person.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreatePersonDto } from './create-person.dto';
import { IsMongoId, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePersonDto extends PartialType(CreatePersonDto) {
  // Opcional: Si permites cambiar el userId desde aquí (generalmente se haría desde el módulo Users)
  @ApiPropertyOptional({
    description: 'ID del usuario del sistema vinculado (usar con precaución)',
  })
  @IsOptional()
  @IsMongoId()
  userId?: string | null;
}
