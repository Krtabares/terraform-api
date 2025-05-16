// src/academies/academies.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
  HttpCode,
  HttpStatus,
  UseGuards, // Importar UseGuards
} from '@nestjs/common';
import { AcademiesService } from './academies.service';
import { CreateAcademyDto } from './dto/create-academy.dto';
import { UpdateAcademyDto } from './dto/update-academy.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Academy } from './schemas/academy.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Ajusta la ruta a tu JwtAuthGuard
import { RolesGuard } from '../auth/guards/roles.guard'; // Ajusta la ruta a tu RolesGuard
import { Roles } from '../auth/decorators/roles.decorator'; // Ajusta la ruta a tu decorador Roles
import { SystemRole } from '../auth/enum/systemRole.enum'; // Ajusta la ruta a tu enum Role
import { AcademyRole } from '../auth/enum/academyRole.enum'; // Ajusta la ruta a tu enum Role

@ApiTags('Academies')
@ApiBearerAuth('access-token') // Indica que se requiere un Bearer token para estos endpoints
@UseGuards(JwtAuthGuard, RolesGuard) // Aplicar guards a todo el controlador
@Controller('academies')
export class AcademiesController {
  constructor(private readonly academiesService: AcademiesService) {}

  @Post()
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR) // Solo Admin o Director pueden crear
  @ApiOperation({
    summary: 'Crear una nueva academia (Requiere Rol: Admin o Director)',
  })
  @ApiBody({ type: CreateAcademyDto })
  @ApiResponse({
    status: 201,
    description: 'La academia ha sido creada exitosamente.',
    type: Academy,
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Prohibido (Rol no permitido).' })
  async create(@Body() createAcademyDto: CreateAcademyDto) {
    return this.academiesService.create(createAcademyDto);
  }

  @Get()
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR, SystemRole.USER) // Todos los roles autenticados pueden ver
  @ApiOperation({
    summary:
      'Obtener todas las academias (Requiere Rol: Admin, Director o User)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todas las academias.',
    type: [Academy],
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async findAll() {
    return this.academiesService.findAll();
  }

  @Get(':id')
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR, SystemRole.USER) // Todos los roles autenticados pueden ver
  @ApiOperation({
    summary:
      'Obtener una academia por su ID (Requiere Rol: Admin, Director o User)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la academia (MongoDB ObjectId)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'La academia encontrada.',
    type: Academy,
  })
  @ApiResponse({ status: 404, description: 'Academia no encontrada.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  async findOne(
    @Param('id' /*, ParseMongoIdPipe (si lo creaste) */) id: string,
  ) {
    // class-validator y ParseMongoIdPipe se encargarían de la validación del formato del ID.
    // Mongoose también lanza un error si el ID no tiene un formato válido.
    const academy = await this.academiesService.findOne(id);
    if (!academy) {
      throw new NotFoundException(`Academy with ID "${id}" not found`);
    }
    return academy;
  }

  @Patch(':id')
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR) // Solo Admin o Director pueden actualizar
  @ApiOperation({
    summary:
      'Actualizar una academia existente (Requiere Rol: Admin o Director)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la academia',
    type: String,
  })
  @ApiBody({ type: UpdateAcademyDto })
  @ApiResponse({
    status: 200,
    description: 'La academia ha sido actualizada exitosamente.',
    type: Academy,
  })
  @ApiResponse({ status: 404, description: 'Academia no encontrada.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Prohibido (Rol no permitido).' })
  async update(
    @Param('id' /*, ParseMongoIdPipe */) id: string,
    @Body() updateAcademyDto: UpdateAcademyDto,
  ) {
    const updatedAcademy = await this.academiesService.update(
      id,
      updateAcademyDto,
    );
    if (!updatedAcademy) {
      throw new NotFoundException(`Academy with ID "${id}" not found`);
    }
    return updatedAcademy;
  }

  @Delete(':id')
  @Roles(SystemRole.ROOT) // Solo Admin puede eliminar
  @HttpCode(HttpStatus.OK) // O HttpStatus.NO_CONTENT (204) si no devuelves cuerpo
  @ApiOperation({ summary: 'Eliminar una academia (Requiere Rol: Admin)' })
  @ApiParam({
    name: 'id',
    description: 'ID único de la academia',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'La academia ha sido eliminada exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Academia no encontrada.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Prohibido (Rol no permitido).' })
  async remove(@Param('id' /*, ParseMongoIdPipe */) id: string) {
    const result = await this.academiesService.remove(id);
    if (!result.deleted) {
      // El servicio ya lanza NotFoundException, pero podrías añadir otra capa
      throw new NotFoundException(
        `Academy with ID "${id}" not found or could not be deleted.`,
      );
    }
    return result; // Devuelve { deleted: true, message: ... }
  }
}
