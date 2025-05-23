/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';
import { AnyARecord } from 'dns';
import { AssignAcademyRoleDto } from './dto/assign-academy-role.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserDocument } from './schemas/user.schema';
import { SystemRole } from 'src/auth/enum/systemRole.enum';
import { AcademyRole } from 'src/auth/enum/academyRole.enum';
import { QueryParamsDto } from 'src/shared/dto/query-params.dto';
import { PaginatedAcademyUsersDto } from './dto/academy-user.dto';

@ApiTags('Users', 'Profile')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile') // Ruta para que el usuario actualice su propio perfil
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Actualizar perfil del usuario autenticado' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  async updateMyProfile(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<any> {
    // O el tipo de retorno que uses
    const userId = req.user._id; // _id del usuario autenticado
    return this.usersService.updateUserProfile(userId, updateUserDto);
  }

  @Get(':userId')
  @Roles(SystemRole.ROOT, SystemRole.USER)
  @ApiTags('Users')
  @ApiOperation({
    summary: 'Obtener usuario por ID',
  })
  async getperson(
    @Param('userId') userId: string,
    @Req() req: any,
  ): Promise<any> {
    return this.usersService.findById(userId);
  }

  // Endpoint para asignar un rol de academia a un usuario
  @UseGuards(JwtAuthGuard, RolesGuard) // RolesGuard necesitará manejar la lógica de permisos
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR) // Solo ROOT o un DIRECTOR (de esa academia) pueden asignar roles
  @Post(':userId/assign-academy-role')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '[Admin/Director] Asignar un rol de academia a un usuario',
  })
  @ApiBody({ type: AssignAcademyRoleDto })
  @ApiResponse({
    status: 200,
    description: 'Rol asignado exitosamente.',
    type: UserResponseDto,
  }) // O UserDocument
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({ status: 403, description: 'Permiso denegado.' }) // Si no es ROOT o Director de la academia
  @ApiResponse({
    status: 404,
    description: 'Usuario o Academia no encontrados.',
  })
  async assignAcademyRole(
    @Request() req, // Para obtener el usuario que realiza la acción (y su rol/academia si es Director)
    @Param('userId') targetUserId: string,
    @Body() assignAcademyRoleDto: AssignAcademyRoleDto,
  ): Promise<any> {
    const assigningUser = req.user as UserDocument; // Usuario que realiza la asignación
    return this.usersService.assignOrUpdateAcademyRole(
      assigningUser,
      targetUserId,
      assignAcademyRoleDto.academyId,
      assignAcademyRoleDto.role,
    );
  }

  @Get(':academyId/users') // O /staff
  @UseGuards(JwtAuthGuard, RolesGuard)
  // Un ROOT puede ver los usuarios de cualquier academia.
  // Un DIRECTOR solo puede ver los usuarios de SU academia (RolesGuard debe validar esto).
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR, AcademyRole.ADMIN) // Ajusta roles según necesidad
  @ApiOperation({
    summary: 'Obtener usuarios/personal asociados a una academia específica',
  })
  @ApiParam({
    name: 'academyId',
    description: 'ID de la Academia',
    type: String,
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
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Término de búsqueda para usuarios',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: AcademyRole,
    description: 'Filtrar por rol en la academia',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios de la academia.',
    type: PaginatedAcademyUsersDto,
  })
  @ApiResponse({ status: 401, description: 'No autorizado.' })
  @ApiResponse({
    status: 403,
    description: 'Prohibido (Rol no permitido para esta academia).',
  })
  @ApiResponse({ status: 404, description: 'Academia no encontrada.' })
  async getAcademyUsers(
    @Param('academyId') academyId: string,
    @Query() queryParams: QueryParamsDto, // Usar el DTO para los query params
    @Req() req: any, // Para acceder a req.user si es necesario para lógica de permisos adicional
  ): Promise<PaginatedAcademyUsersDto> {
    // El RolesGuard ya debería haber validado si el usuario (req.user)
    // tiene permiso para acceder a la información de esta 'academyId'.
    return this.usersService.findUsersAssociatedWithAcademy(
      academyId,
      queryParams,
    );
  }

  @ApiBearerAuth('access-token') // Para Swagger
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: any) {
    return req.user;
  }
}
