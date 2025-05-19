import Request from '@nestjs/common';
import { SystemRole } from 'src/auth/enum/systemRole.enum';

export interface AuthenticatedRequest extends Request {
  user: {
    // Define la estructura de tu payload de usuario del token
    userId: string;
    systemRoles: SystemRole[];
    // academyId?: string; // Si el admin está asociado a una academia específica en el token
  };
}
