// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service'; // Ajusta la ruta
import { User, UserDocument } from '../users/schemas/user.schema'; // Ajusta la ruta
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RegisterDto } from 'src/users/dto/register.dto';
import * as crypto from 'crypto'; // Para generar el token
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<UserDocument, 'passwordHash'> | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = user.toObject(); // Quita el passwordHash antes de devolver
      return result;
    }
    return null;
  }

  async login(user: Omit<UserDocument, 'passwordHash'>) {
    // user viene validado de LocalStrategy
    console.log('login', user);
    const payload: JwtPayload = {
      email: user.email,
      sub: user._id?.toString() || ' ', // Asegúrate de que _id es un string
      // Opcional: incluir roles en el payload si decides hacerlo
      // systemRoles: user.systemRoles,
      // rolesInAcademies: user.rolesInAcademies.map(r => ({ academyId: r.academyId.toString(), role: r.role })),
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user, // Devuelve también la info del usuario (sin password)
    };
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<Omit<UserDocument, 'passwordHash'>> {
    const { nombre, email, password, systemRoles } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('El email ya está registrado.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const newUser = await this.usersService.create({
        nombre,
        email,
        passwordHash: hashedPassword,
        systemRoles: systemRoles || ['USER'], // Rol por defecto si no se especifica
        rolesInAcademies: [], // Los roles de academia se asignan después
        isActive: true,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = newUser.toObject();
      return result;
    } catch (error) {
      // Manejar errores de duplicidad u otros de la BD si no se capturaron antes
      if (error.code === 11000) {
        // Código de error de MongoDB para duplicados
        throw new ConflictException(
          'El email ya está registrado (error de BD).',
        );
      }
      console.error(error);
      throw new InternalServerErrorException('Error al registrar el usuario.');
    }
  }

  async changeUserPassword(
    userId: string,
    currentPassword_plain: string,
    newPassword_plain: string,
  ): Promise<void> {
    if (currentPassword_plain === newPassword_plain) {
      throw new BadRequestException(
        'La nueva contraseña no puede ser igual a la contraseña actual.',
      );
    }

    const user = await this.usersService.findUserByIdWithPassword(userId); // Necesitas un método que devuelva el user CON passwordHash
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.'); // Aunque no debería pasar si está autenticado
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword_plain,
      user.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    const newHashedPassword = await bcrypt.hash(newPassword_plain, 10);
    await this.usersService.updatePassword(userId, newHashedPassword); // Nuevo método en UsersService
  }

  async createPasswordResetToken(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // No lanzar error para no revelar si un email existe. Simplemente no hagas nada.
      console.warn(`Solicitud de reseteo para email no existente: ${email}`);
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex'); // Hashea el token antes de guardarlo

    const expirationMinutes = 10; // Token expira en 10 minutos
    const passwordResetExpires = new Date(
      Date.now() + expirationMinutes * 60 * 1000,
    );

    await this.usersService.setPasswordResetToken(
      user._id,
      hashedToken,
      passwordResetExpires,
    );

    // Enviar email (pseudo-código, necesitas implementar esto con tu servicio de email)
    const resetURL = `https://TU_FRONTEND_URL/reset-password?token=${resetToken}`; // El token sin hashear va en la URL
    console.log(`Password reset URL (para desarrollo): ${resetURL}`); // Log para desarrollo

    try {
      await this.mailService.sendPasswordResetEmail(
        user.email,
        user.nombre,
        resetURL,
      );
    } catch (error) {
      console.error('Error enviando email de reseteo:', error);
      // Podrías querer limpiar el token si el email falla, o reintentar.
      // Por ahora, no lanzamos error al cliente para no revelar info.
      await this.usersService.clearPasswordResetToken(user._id); // Opcional: limpiar token si falla email
      // No lanzar error al cliente
    }
  }

  async resetPasswordWithToken(
    token_plain: string,
    newPassword_plain: string,
  ): Promise<void> {
    const hashedToken = crypto
      .createHash('sha256')
      .update(token_plain)
      .digest('hex');

    const user = await this.usersService.findUserByResetToken(hashedToken);

    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Token inválido o expirado.');
    }

    if (!user.isActive) {
      throw new BadRequestException('La cuenta de usuario no está activa.');
    }

    const newHashedPassword = await bcrypt.hash(newPassword_plain, 10);
    await this.usersService.updatePasswordAndClearResetToken(
      user._id,
      newHashedPassword,
    );
  }
}
