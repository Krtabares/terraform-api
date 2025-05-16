export interface JwtPayload {
  sub: string; // ID del usuario (subject)
  email: string;
  // Podrías incluir roles aquí si no quieres consultar la BD en cada validación de JWT,
  // pero ten en cuenta que los roles podrían desactualizarse si cambian y el token no se refresca.
  // systemRoles?: string[];
  // rolesInAcademies?: { academyId: string, role: string }[];
}
