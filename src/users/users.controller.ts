import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
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
import { AcademyRole, SystemRole } from './dto/register.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserDocument } from './schemas/user.schema';

@ApiTags('Users', 'Profile')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('me/profile') // Ruta para que el usuario actualice su propio perfil
  @ApiBearerAuth()
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

  // Endpoint para asignar un rol de academia a un usuario
  @UseGuards(JwtAuthGuard, RolesGuard) // RolesGuard necesitará manejar la lógica de permisos
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR) // Solo ROOT o un DIRECTOR (de esa academia) pueden asignar roles
  @Post(':userId/assign-academy-role')
  @ApiBearerAuth()
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

  @ApiBearerAuth('access-token') // Para Swagger
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: any) {
    return req.user;
  }
}
