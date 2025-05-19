// src/classes/classes.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query, // Para query parameters
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassSortBy, QueryClassDto } from './dto/query-class.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Class } from './schemas/class.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Ajusta la ruta
import { RolesGuard } from '../auth/guards/roles.guard'; // Ajusta la ruta
import { Roles } from '../auth/decorators/roles.decorator'; // Ajusta la ruta
import { AcademyRole } from 'src/auth/enum/academyRole.enum';
import { SystemRole } from 'src/auth/enum/systemRole.enum';

@ApiTags('Classes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('academies/:academyId/classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR) // Solo Admin o Director pueden crear clases
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Crear una nueva clase (Requiere Rol: Admin o Director)',
  })
  @ApiBody({ type: CreateClassDto })
  @ApiResponse({
    status: 201,
    description: 'La clase ha sido creada exitosamente.',
    type: Class,
  })
  @ApiResponse({ status: 400, description: 'Solicitud incorrecta.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Prohibido (Rol no permitido).' })
  async create(
    @Param('academyId') academyRouteId: string,
    @Body() createClassDto: CreateClassDto,
  ) {
    return this.classesService.create(academyRouteId, createClassDto);
  }

  @Get()
  // Podría ser público o requerir autenticación básica
  @UseGuards(JwtAuthGuard, RolesGuard) // Descomentar si se requiere autenticación para ver clases
  @Roles(
    SystemRole.ROOT,
    AcademyRole.DIRECTOR,
    AcademyRole.ADMIN,
    AcademyRole.ALUMNO,
  )
  @ApiBearerAuth('access-token') // Si se requiere autenticación
  @ApiOperation({
    summary: 'Obtener todas las clases con filtros y paginación',
  })
  @ApiParam({ name: 'academyId', description: 'ID de academia', type: String })
  @ApiQuery({
    name: 'teacherId',
    required: false,
    type: String,
    description: 'Filtrar por ID de profesor',
  })
  @ApiQuery({
    name: 'minStartTime',
    required: false,
    type: Date,
    description: 'Fecha mínima de inicio',
  })
  @ApiQuery({
    name: 'maxStartTime',
    required: false,
    type: Date,
    description: 'Fecha máxima de inicio',
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    type: String,
    description: 'Filtrar por etiquetas (separadas por coma)',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado activo',
  })
  @ApiQuery({
    name: 'searchName',
    required: false,
    type: String,
    description: 'Buscar por nombre de clase',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ClassSortBy,
    description: 'Campo para ordenar',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Resultados por página',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de clases.',
    // Deberías crear un DTO de respuesta para paginación si quieres ser más explícito en Swagger
    // Por ahora, el tipo Class[] es una simplificación
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/Class' } },
        count: { type: 'number' },
        totalPages: { type: 'number' },
        currentPage: { type: 'number' },
      },
    },
  })
  async findAll(
    @Param('academyId') academyRouteId: string,
    @Query() queryClassDto: QueryClassDto,
  ) {
    console.log(academyRouteId);

    return this.classesService.findAll(academyRouteId, queryClassDto);
  }

  @Get(':id')
  // @UseGuards(JwtAuthGuard) // Descomentar si se requiere autenticación
  // @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtener una clase por su ID' })
  @ApiParam({ name: 'id', description: 'ID único de la clase', type: String })
  @ApiResponse({
    status: 200,
    description: 'La clase encontrada.',
    type: Class,
  })
  @ApiResponse({ status: 404, description: 'Clase no encontrada.' })
  async findOne(
    @Param('academyId') _academyRouteId: string,
    @Param('id') id: string,
  ) {
    return this.classesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Actualizar una clase existente (Requiere Rol: Admin o Director)',
  })
  @ApiParam({ name: 'id', description: 'ID único de la clase', type: String })
  @ApiBody({ type: UpdateClassDto })
  @ApiResponse({
    status: 200,
    description: 'La clase ha sido actualizada exitosamente.',
    type: Class,
  })
  @ApiResponse({ status: 404, description: 'Clase no encontrada.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Prohibido.' })
  async update(
    @Param('academyId') academyRouteId: string,
    @Param('id') id: string,
    @Body() updateClassDto: UpdateClassDto,
  ) {
    return this.classesService.update(academyRouteId, id, updateClassDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR) // O solo SystemRole.ROOT si es más restrictivo
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar una clase (Requiere Rol: Admin o Director)',
  })
  @ApiParam({ name: 'id', description: 'ID único de la clase', type: String })
  @ApiResponse({
    status: 200,
    description: 'La clase ha sido eliminada exitosamente.',
  })
  @ApiResponse({ status: 404, description: 'Clase no encontrada.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Prohibido.' })
  async remove(
    @Param('academyId') academyRouteId: string,
    @Param('id') id: string,
  ) {
    return this.classesService.remove(academyRouteId, id);
  }
}
