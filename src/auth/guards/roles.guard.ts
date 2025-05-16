// src/auth/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserDocument } from '../../users/schemas/user.schema'; // Ajusta la ruta

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // Si no se especifican roles, se permite el acceso (asumiendo que JwtAuthGuard ya pasó)
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user: UserDocument }>();

    if (!user) {
      // Esto no debería suceder si JwtAuthGuard se ejecuta antes
      throw new ForbiddenException('Usuario no autenticado.');
    }

    // Lógica para verificar roles
    const hasRequiredRole = requiredRoles.some((role) => {
      // 1. Verificar systemRoles (ej. 'ROOT')
      if (user.systemRoles?.includes(role)) {
        return true;
      }

      // 2. Verificar rolesInAcademies (ej. 'DIRECTOR', 'PROFESOR', 'ALUMNO')
      // Para esto, necesitarías el contexto de la academia.
      // Si la ruta es /api/academies/:academyId/some-resource
      // puedes obtener academyId de los parámetros de la ruta.
      const request = context.switchToHttp().getRequest();
      const academyIdFromParams = request.params.academyId; // O como obtengas el ID de la academia

      if (academyIdFromParams) {
        return user.rolesInAcademies?.some(
          (ar) =>
            ar.role === role && ar.academyId.toString() === academyIdFromParams,
        );
      } else {
        // Si no hay academyId en la ruta pero el rol requerido es específico de academia,
        // podría denegar o tener una lógica diferente.
        // Por ahora, si el rol no es de sistema y no hay academyId, no coincide.
        return false;
      }
    });

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `No tienes los permisos necesarios. Roles requeridos: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
