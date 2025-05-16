import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Añade lógica personalizada si es necesario antes de llamar a super.canActivate
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // Puedes lanzar una excepción personalizada aquí
    if (err || !user) {
      // console.error('JWT Auth Guard Error:', info?.message || err?.message);
      throw err || new UnauthorizedException(info?.message || 'No autorizado');
    }
    return user;
  }
}
