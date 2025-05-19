// src/inscriptions/inscriptions.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InscriptionsService } from './inscriptions.service';
import { AdminCreateInscriptionDto } from './dto/admin-create-inscription.dto';
import { AdminUpdateInscriptionDto } from './dto/admin-update-inscription.dto';
import { QueryInscriptionDto } from './dto/query-inscription.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  Inscription,
  InscriptionStatus,
  InscriptionPaymentType,
} from './schemas/inscription.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '../auth/enum/systemRole.enum'; // Ajusta la ruta a tu enum Role
import { AcademyRole } from '../auth/enum/academyRole.enum'; // Ajusta la ruta a tu enum Role
import { AuthenticatedRequest } from 'src/interfaces/autenticateRequest.interface';

@ApiTags('Inscriptions')
@Controller('academies/:academyId/inscriptions')
export class InscriptionsController {
  constructor(private readonly inscriptionsService: InscriptionsService) {}

  // --- Endpoints para Administradores ---
  @Post('admin/direct')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ROOT, AcademyRole.ADMIN, AcademyRole.DIRECTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Admin crea una inscripción directamente (Rol: Admin, Director)',
  })
  @ApiBody({ type: AdminCreateInscriptionDto })
  @ApiResponse({
    status: 201,
    description: 'Inscripción creada exitosamente.',
    type: Inscription,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos incorrectos o validación fallida.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto (ej. estudiante ya inscrito).',
  })
  async adminCreateDirectInscription(
    @Req() req: AuthenticatedRequest,
    @Body() createDto: AdminCreateInscriptionDto,
  ) {
    return this.inscriptionsService.adminCreateDirectInscription(
      req.user.userId,
      createDto,
    );
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ROOT, AcademyRole.ADMIN, AcademyRole.DIRECTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Admin obtiene todas las inscripciones (Rol: Admin, Director)',
  })
  @ApiQuery({ name: 'academyId', required: false, type: String })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: InscriptionStatus })
  @ApiQuery({
    name: 'paymentType',
    required: false,
    enum: InscriptionPaymentType,
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiResponse({
    status: 200,
    description:
      'Lista de inscripciones.' /* Definir tipo de respuesta paginada */,
  })
  async findAllForAdmin(@Query() queryDto: QueryInscriptionDto) {
    return this.inscriptionsService.findAllForAdmin(queryDto);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ROOT, AcademyRole.ADMIN, AcademyRole.DIRECTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Admin obtiene una inscripción por ID (Rol: Admin, Director)',
  })
  @ApiParam({ name: 'id', description: 'ID de la inscripción', type: String })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la inscripción.',
    type: Inscription,
  })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada.' })
  async findOneForAdmin(@Param('id') id: string) {
    return this.inscriptionsService.findOneForAdmin(id);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ROOT, AcademyRole.ADMIN, AcademyRole.DIRECTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Admin actualiza una inscripción (ej. marcar asistencia) (Rol: Admin, Director)',
  })
  @ApiParam({ name: 'id', description: 'ID de la inscripción', type: String })
  @ApiBody({ type: AdminUpdateInscriptionDto })
  @ApiResponse({
    status: 200,
    description: 'Inscripción actualizada.',
    type: Inscription,
  })
  @ApiResponse({
    status: 400,
    description: 'Actualización no permitida o datos incorrectos.',
  })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada.' })
  async adminUpdateInscription(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateDto: AdminUpdateInscriptionDto,
  ) {
    return this.inscriptionsService.adminUpdateInscription(
      id,
      req.user.userId,
      updateDto,
    );
  }

  @Delete('admin/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ROOT, AcademyRole.ADMIN, AcademyRole.DIRECTOR)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin cancela una inscripción (Rol: Admin, Director)',
  })
  @ApiParam({ name: 'id', description: 'ID de la inscripción', type: String })
  @ApiBody({
    schema: {
      properties: { reason: { type: 'string', example: 'Clase reprogramada' } },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Inscripción cancelada.',
    type: Inscription,
  })
  @ApiResponse({ status: 404, description: 'Inscripción no encontrada.' })
  async adminCancelInscription(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.inscriptionsService.adminCancelInscription(
      id,
      req.user.userId,
      reason,
    );
  }

  // --- Endpoints para Estudiantes ---
  @Get('my-inscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.USER) // Solo usuarios autenticados pueden ver sus inscripciones
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Estudiante obtiene sus inscripciones confirmadas (Rol: User)',
  })
  @ApiQuery({ name: 'status', required: false, enum: InscriptionStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiResponse({
    status: 200,
    description:
      'Lista de inscripciones del estudiante.' /* Tipo de respuesta paginada */,
  })
  async findMyInscriptions(
    @Req() req: AuthenticatedRequest,
    @Query() queryDto: QueryInscriptionDto,
  ) {
    const sanitizedQuery: QueryInscriptionDto = {
      ...queryDto,
      studentId: undefined,
      academyId: undefined,
      classId: undefined,
      paymentType: undefined,
    };
    return this.inscriptionsService.findMyInscriptions(
      req.user.userId,
      sanitizedQuery,
    );
  }
}
