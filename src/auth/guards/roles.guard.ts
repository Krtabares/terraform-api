/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/auth/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  ConsoleLogger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserDocument } from '../../users/schemas/user.schema'; // Ajusta la ruta
import { Types } from 'mongoose';
import { AcademyRole } from '../enum/academyRole.enum';
import { SystemRole } from '../enum/systemRole.enum';

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
    const hasRequiredRole = requiredRoles.some((currentRequiredRole) => {
      // Log para cada rol requerido que se está evaluando
      // console.log(`Evaluando si el usuario cumple con el rol requerido: "${currentRequiredRole}"`);

      // 1. Verificar si el rol requerido es un SystemRole y si el usuario lo tiene
      //    Necesitas una forma de saber si 'currentRequiredRole' es un SystemRole.
      //    Una forma es verificar si el valor de currentRequiredRole existe en el enum SystemRole.
      const isSystemRoleRequirement = Object.values(SystemRole).includes(
        currentRequiredRole as SystemRole,
      );

      if (isSystemRoleRequirement) {
        const userHasSystemRole = user.systemRoles?.includes(
          currentRequiredRole as SystemRole,
        );
        // console.log(` - Es un SystemRole. Usuario lo tiene?: ${userHasSystemRole}`);
        if (userHasSystemRole) {
          return true; // El usuario tiene este SystemRole requerido, el 'some' termina.
        }
      }

      // 2. Verificar si el rol requerido es un AcademyRole y si el usuario lo tiene en la academia correcta
      //    Similarmente, verificar si 'currentRequiredRole' es un AcademyRole.
      const isAcademyRoleRequirement = Object.values(AcademyRole).includes(
        currentRequiredRole as AcademyRole,
      );

      if (isAcademyRoleRequirement) {
        const request = context.switchToHttp().getRequest(); // Obtener request aquí, ya que academyIdFromParams solo es relevante para AcademyRoles
        const academyIdFromParams = request.params.academyId; // Cubrir varios nombres de parámetros

        if (academyIdFromParams) {
          return user.rolesInAcademies?.some(
            (ar) =>
              ar.role === currentRequiredRole &&
              ar.academyId.toString() === academyIdFromParams,
          );
        } else {
          // Si no hay academyId en la ruta pero el rol requerido es específico de academia,
          // podría denegar o tener una lógica diferente.
          // Por ahora, si el rol no es de sistema y no hay academyId, no coincide.
          return false;
        }
      }

      // Si después de verificar SystemRole y AcademyRole, este 'currentRequiredRole' no se cumplió.
      return false; // 'some' continuará con el siguiente 'requiredRole'.
    });

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `No tienes los permisos necesarios. Roles requeridos: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
