// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
  HttpStatus,
  Param, // <--- Importar Param
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UserDocument, User } from '../users/schemas/user.schema'; // Importa User también para el tipo de respuesta
import { Roles } from './decorators/roles.decorator';
import { RegisterDto } from '../users/dto/register.dto'; // Ajusta la ruta si RegisterDto está en users/dto
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth, // <--- Para endpoints protegidos
  ApiParam, // <--- Para parámetros de ruta
  ApiProperty,
} from '@nestjs/swagger';
import { ChangePasswordDto } from 'src/users/dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SystemRole } from './enum/systemRole.enum';
import { AcademyRole } from './enum/academyRole.enum';

// DTO para la respuesta del login
class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ type: () => User }) // Asumiendo que User no expone la contraseña
  user: Omit<UserDocument, 'passwordHash'>;
}

// DTO para la respuesta del perfil (similar a User, pero sin contraseña)
// Podrías crear un UserProfileDto si quieres ser más explícito
class UserProfileResponseDto extends User {}

@ApiTags('Auth') // <--- Agrupa todos los endpoints de este controlador bajo la etiqueta "Auth"
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(AuthGuard('local'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión de usuario',
    description: 'Autentica un usuario y devuelve un token JWT.',
  })
  @ApiBody({
    description: 'Credenciales de acceso',
    type: LoginDto,
    examples: {
      example1: {
        summary: 'Usuario válido',
        value: {
          email: 'root@terraform.com',
          password: 'rootpassword',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login exitoso, devuelve token de acceso y datos del usuario.',
    type: LoginResponseDto, // <--- Tipo de respuesta
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Credenciales inválidas.',
  })
  async login(
    @Request() req,
    @Body() loginDto: LoginDto,
  ): Promise<LoginResponseDto> {
    // loginDto es solo para validación y swagger, la lógica real usa req.user
    return this.authService.login(
      req.user as Omit<UserDocument, 'passwordHash'>,
    );
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar un nuevo usuario',
    description: 'Crea una nueva cuenta de usuario en el sistema.',
  })
  @ApiBody({
    description: 'Datos necesarios para registrar un nuevo usuario.',
    type: RegisterDto, // <-- Swagger leerá las anotaciones de RegisterDto
    examples: {
      // Puedes añadir ejemplos específicos aquí también si quieres
      a_standard_user: {
        summary: 'Usuario estándar',
        description: 'Un ejemplo de registro para un usuario normal.',
        value: {
          nombre: 'Elena Gómez',
          email: 'elena.gomez@example.com',
          password: 'passwordElena123',
        },
      },
      an_admin_user_if_allowed: {
        summary: 'Usuario con rol específico (si permitido)',
        description:
          'Un ejemplo de registro para un usuario con un rol de sistema específico (ej. USER).',
        value: {
          nombre: 'Roberto Diaz',
          email: 'roberto.diaz@example.com',
          password: 'passwordRoberto456',
          systemRoles: ['USER'],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Usuario registrado exitosamente.',
    type: UserProfileResponseDto, // <--- Asumiendo que devuelve el perfil del usuario sin contraseña
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El email ya está registrado.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos.',
  })
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<Omit<UserDocument, 'passwordHash'>> {
    return this.authService.register(registerDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token') // <--- Indica que este endpoint requiere un Bearer Token
  @ApiOperation({
    summary: 'Obtener perfil del usuario autenticado',
    description: 'Devuelve los datos del usuario actualmente logueado.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Perfil del usuario obtenido exitosamente.',
    type: UserProfileResponseDto, // <--- Tipo de respuesta
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado o token inválido.',
  })
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar la contraseña del usuario autenticado' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Contraseña cambiada exitosamente.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado o contraseña actual incorrecta.',
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos.' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const userId = req.user._id;
    await this.authService.changeUserPassword(
      userId,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Contraseña cambiada exitosamente.' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar reseteo de contraseña' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Si el usuario existe, se enviará un email con instrucciones.',
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.createPasswordResetToken(forgotPasswordDto.email);
    // ¡No reveles si el email existe o no por seguridad!
    return {
      message:
        'Si tu email está registrado, recibirás un enlace para resetear tu contraseña.',
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resetear contraseña usando un token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Contraseña reseteada exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido o expirado, o datos inválidos.',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPasswordWithToken(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
    return { message: 'Tu contraseña ha sido actualizada.' };
  }

  // Ejemplo de ruta protegida por rol ROOT
  @Get('admin-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROOT')
  @ApiBearerAuth('access-token')
  @ApiTags('Admin') // <--- Puedes usar múltiples tags o uno más específico
  @ApiOperation({
    summary: '[ADMIN] Endpoint de prueba para rol ROOT',
    description: 'Solo accesible por usuarios con el rol ROOT.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Acceso concedido a ROOT.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado (token inválido).',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acceso denegado (rol incorrecto).',
  })
  adminTest(@Request() req) {
    return { message: 'Bienvenido Admin ROOT!', user: req.user };
  }

  // Ejemplo de ruta protegida por rol DIRECTOR en una academia específica
  @Get('academy/:academyId/director-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR)
  @ApiBearerAuth('access-token')
  @ApiTags('Admin', 'Academies') // <--- Múltiples tags
  @ApiOperation({
    summary: '[DIRECTOR] Endpoint de prueba para rol DIRECTOR en una academia',
    description:
      'Solo accesible por usuarios con el rol DIRECTOR para la academia especificada.',
  })
  @ApiParam({
    name: 'academyId',
    description: 'ID de la academia',
    type: String,
    example: '60c72b2f9b1d8c001f8e4a3c',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Acceso concedido a DIRECTOR.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'No autorizado (token inválido).',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Acceso denegado (rol incorrecto o academia incorrecta).',
  })
  directorTest(@Request() req, @Param('academyId') academyId: string) {
    // <--- Añadido @Param
    // academyId ya está disponible para el RolesGuard a través de request.params
    return {
      message: `Bienvenido Director de la Academia ${academyId}!`,
      user: req.user,
    };
  }
}
