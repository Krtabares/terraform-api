// src/reservation-requests/reservation-requests.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req, // Para obtener el usuario del token
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReservationRequestsService } from './reservation-requests.service';
import { CreateReservationRequestDto } from './dto/create-reservation-request.dto';
import { ProcessReservationRequestDto } from './dto/process-reservation-request.dto';
import { QueryReservationRequestDto } from './dto/query-reservation-request.dto';
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
  ReservationRequest,
  ReservationRequestStatus,
} from './schemas/reservation-request.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Ajusta ruta
import { RolesGuard } from '../auth/guards/roles.guard'; // Ajusta ruta
import { Roles } from '../auth/decorators/roles.decorator'; // Ajusta ruta
import { SystemRole } from '../auth/enum/systemRole.enum'; // Ajusta la ruta a tu enum Role
import { AcademyRole } from '../auth/enum/academyRole.enum'; // Ajusta la ruta a tu enum Role
import { AuthenticatedRequest } from 'src/interfaces/autenticateRequest.interface';

@ApiTags('Reservation Requests')
@Controller('reservation-requests')
export class ReservationRequestsController {
  constructor(
    private readonly reservationRequestsService: ReservationRequestsService,
  ) {}

  // --- Endpoints para Estudiantes ---
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.USER)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Estudiante crea una solicitud de reserva de cupo (Rol: User)',
  })
  @ApiBody({ type: CreateReservationRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Solicitud creada exitosamente.',
    type: ReservationRequest,
  })
  @ApiResponse({ status: 400, description: 'Datos incorrectos.' })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({
    status: 409,
    description: 'Conflicto (ej. ya existe solicitud pendiente).',
  })
  async createByUser(
    @Req() req: AuthenticatedRequest,
    @Body() createDto: CreateReservationRequestDto,
  ) {
    return this.reservationRequestsService.create(req.user.userId, createDto);
  }

  @Get('my-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.USER)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Estudiante obtiene sus solicitudes de reserva (Rol: User)',
  })
  @ApiQuery({ name: 'status', required: false, enum: ReservationRequestStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt:desc',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de solicitudes del estudiante.' /* Deberías definir un tipo de respuesta paginada */,
  })
  async findMyRequests(
    @Req() req: AuthenticatedRequest,
    @Query() queryDto: QueryReservationRequestDto,
  ) {
    // Aseguramos que studentId no pueda ser sobreescrito por el query si viene de un User
    const sanitizedQuery: QueryReservationRequestDto = {
      ...queryDto,
      studentId: undefined,
      academyId: undefined,
    };
    return this.reservationRequestsService.findByStudent(
      req.user.userId,
      sanitizedQuery,
    );
  }

  @Patch('my-requests/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.USER)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Estudiante cancela su propia solicitud de reserva PENDIENTE (Rol: User)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la solicitud de reserva',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud cancelada.',
    type: ReservationRequest,
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede cancelar (ej. no está pendiente o no es tuya).',
  })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada.' })
  async cancelMyRequest(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.reservationRequestsService.cancelByUser(id, req.user.userId);
  }

  // --- Endpoints para Administradores ---
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ROOT, AcademyRole.ADMIN, AcademyRole.DIRECTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Admin obtiene todas las solicitudes de reserva (Rol: Admin, Director)',
  })
  @ApiQuery({
    name: 'academyId',
    required: false,
    type: String,
    description: 'Filtrar por ID de academia (si el admin gestiona varias)',
  })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: ReservationRequestStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    example: 'createdAt:desc',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de todas las solicitudes.' /* Tipo de respuesta paginada */,
  })
  async findAllForAdmin(
    @Req() req: AuthenticatedRequest,
    @Query() queryDto: QueryReservationRequestDto,
  ) {
    // Si el admin está atado a una academia específica por su token, se podría forzar el filtro aquí:
    // if (req.user.academyId && !queryDto.academyId) queryDto.academyId = req.user.academyId;
    return this.reservationRequestsService.findAllForAdmin(queryDto);
  }

  @Get('admin/:id') // Para que el admin vea el detalle de una solicitud específica
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ROOT, AcademyRole.ADMIN, AcademyRole.DIRECTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Admin obtiene una solicitud de reserva por ID (Rol: Admin, Director)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la solicitud de reserva',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la solicitud.',
    type: ReservationRequest,
  })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada.' })
  async findOneForAdmin(@Param('id') id: string) {
    // Aquí podrías añadir validación de que la solicitud pertenece a la academia del admin
    return this.reservationRequestsService.findOne(id);
  }

  @Patch('admin/:id/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ROOT, AcademyRole.ADMIN, AcademyRole.DIRECTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Admin aprueba o rechaza una solicitud de reserva (Rol: Admin, Director)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la solicitud de reserva a procesar',
    type: String,
  })
  @ApiBody({ type: ProcessReservationRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Solicitud procesada exitosamente.',
    type: ReservationRequest,
  })
  @ApiResponse({
    status: 400,
    description:
      'Error al procesar (ej. ya procesada, datos de pago faltantes).',
  })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada.' })
  async processRequestByAdmin(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() processDto: ProcessReservationRequestDto,
  ) {
    // Aquí podrías añadir validación de que la solicitud pertenece a la academia del admin
    return this.reservationRequestsService.processRequest(
      id,
      req.user.userId,
      processDto,
    );
  }
}
