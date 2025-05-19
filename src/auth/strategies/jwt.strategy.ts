// src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service'; // Ajusta la ruta
import { JwtPayload } from '../interfaces/jwt-payload.interface';
// Crearemos esta interfaz

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error(
        'JWT_SECRET no está definido en las variables de entorno.',
      ); // Lanza error si no existe
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    const { sub: userId } = payload; // 'sub' es el ID del usuario
    
    const user = await this.usersService.findById(userId); // Necesitas un método findById en UsersService

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo.');
    }
    // Podrías querer quitar la contraseña del objeto usuario antes de devolverlo
    // Opcionalmente, podrías devolver el payload directamente si no necesitas el objeto User completo
    // o si el payload ya contiene los roles que necesitas.
    // Para el RolesGuard, es útil tener los roles en el objeto user.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user.toObject(); // Quita el passwordHash
    return result; // Passport adjuntará 'result' a request.user
  }
}
