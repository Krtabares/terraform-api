// src/persons/persons.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PersonsService } from './persons.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { QueryPersonDto } from './dto/query-person.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Person } from './schemas/person.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemRole } from '../auth/enum/systemRole.enum';
import { AcademyRole } from '../auth/enum/academyRole.enum';

interface AuthenticatedRequestWithAcademy extends Request {
  user: {
    // Estructura del payload del token
    userId: string;
    systemRoles: SystemRole[];
    rolesInAcademies?: Array<{ academyId: string; role: AcademyRole }>;
    // O si un admin de academia solo tiene una:
    // managedAcademyId?: string;
  };
}

// CAMBIO: La ruta base del controlador ahora incluye el parámetro de la academia
@ApiTags('Persons (Contacts/Students) per Academy')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard) // RolesGuard ahora entiende :academyId
@Controller('academies/:academyId/persons')
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @Post()
  // RolesGuard verifica si el usuario (ej. DIRECTOR) puede operar en :academyId
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR, AcademyRole.ADMIN)
  @ApiOperation({
    summary: 'Crear una nueva persona para la academia especificada',
  })
  async create(
    @Param('academyId') academyId: string,
    @Req() req: AuthenticatedRequestWithAcademy, // Para obtener el creador, si es necesario
    @Body() createPersonDto: CreatePersonDto,
  ) {
    // El servicio ahora siempre recibe el academyId de la ruta
    // El DTO podría ya no necesitar associatedAcademyId si siempre se toma de la ruta.
    // O se puede usar para asociar a OTRA academia si el rol es ROOT.
    const dtoForService = { ...createPersonDto };
    if (
      !dtoForService.associatedAcademyId &&
      !req.user.systemRoles.includes(SystemRole.ROOT)
    ) {
      dtoForService.associatedAcademyId = academyId;
    } else if (
      !dtoForService.associatedAcademyId &&
      req.user.systemRoles.includes(SystemRole.ROOT)
    ) {
      // ROOT podría crear una persona sin asociarla o asociarla a la de la ruta
      dtoForService.associatedAcademyId = academyId; // Opcional, o dejar que el DTO lo defina
    }

    return this.personsService.create(dtoForService, academyId);
  }

  @Get()
  @Roles(
    SystemRole.ROOT,
    AcademyRole.DIRECTOR,
    AcademyRole.ADMIN,
    AcademyRole.PROFESOR,
  )
  @ApiOperation({
    summary: 'Obtener lista de personas de la academia especificada',
  })
  async findAll(
    @Param('academyId') academyId: string,
    @Req() req: AuthenticatedRequestWithAcademy,
    @Query() queryPersonDto: QueryPersonDto,
  ) {
    // Si es ROOT, puede ignorar el academyId si el query lo permite (ej. queryPersonDto.associatedAcademyId = 'all')
    // Si no es ROOT, el RolesGuard ya aseguró que solo ve su academia.
    // El servicio siempre filtrará por el academyId a menos que se anule explícitamente para ROOT.
    const effectiveAcademyId =
      req.user.systemRoles.includes(SystemRole.ROOT) &&
      queryPersonDto.associatedAcademyId === 'GLOBAL_OVERRIDE'
        ? undefined // ROOT puede solicitar ver todo si hay un query param especial
        : academyId;

    return this.personsService.findAll(queryPersonDto, effectiveAcademyId);
  }

  @Get(':personId')
  @Roles(
    SystemRole.ROOT,
    AcademyRole.DIRECTOR,
    AcademyRole.ADMIN,
    AcademyRole.PROFESOR,
  )
  @ApiOperation({
    summary:
      'Obtener una persona por su ID, dentro de la academia especificada',
  })
  async findOne(
    @Param('academyId') academyId: string,
    @Param('personId') personId: string,
    @Req() req: AuthenticatedRequestWithAcademy,
  ) {
    const effectiveAcademyId = req.user.systemRoles.includes(SystemRole.ROOT)
      ? undefined
      : academyId;
    return this.personsService.findOne(personId, effectiveAcademyId);
  }

  @Patch(':personId')
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR, AcademyRole.ADMIN)
  @ApiOperation({
    summary: 'Actualizar una persona existente en la academia especificada',
  })
  async update(
    @Param('academyId') academyId: string,
    @Param('personId') personId: string,
    @Req() req: AuthenticatedRequestWithAcademy,
    @Body() updatePersonDto: UpdatePersonDto,
  ) {
    const effectiveAcademyId = req.user.systemRoles.includes(SystemRole.ROOT)
      ? undefined
      : academyId;
    return this.personsService.update(
      personId,
      updatePersonDto,
      effectiveAcademyId,
    );
  }

  @Delete(':personId')
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR, AcademyRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar una persona de la academia especificada' })
  async remove(
    @Param('academyId') academyId: string,
    @Param('personId') personId: string,
    @Req() req: AuthenticatedRequestWithAcademy,
  ) {
    const effectiveAcademyId = req.user.systemRoles.includes(SystemRole.ROOT)
      ? undefined
      : academyId;
    return this.personsService.remove(personId, effectiveAcademyId);
  }

  // Endpoints de link/unlink (estos son más globales, podrían estar en un controlador de Users o Admin)
  // Si se mantienen aquí, deberían ser accedidos por ROOT y no depender de academyId.
  // Por lo tanto, se moverían a un controlador '/persons/admin-ops/' o similar sin :academyId.
  // O si es vincular una persona DE ESTA academia a un usuario:
  @Post(':personId/link-user/:userId')
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR) // Director puede vincular personas de SU academia
  @ApiOperation({
    summary: 'Vincular una persona (de esta academia) a una cuenta de usuario',
  })
  async linkPersonToUser(
    @Param('academyId') academyId: string, // RolesGuard valida acceso a esta academia
    @Param('personId') personId: string,
    @Param('userId') userId: string,
  ): Promise<Person> {
    // El servicio PersonsService.linkToUser podría necesitar el academyId para validar
    // que la persona pertenece a la academia donde el director tiene permiso.
    return this.personsService.linkToUser(personId, userId);
  }

  @Post(':personId/unlink-user')
  @Roles(SystemRole.ROOT, AcademyRole.DIRECTOR)
  @ApiOperation({
    summary:
      'Desvincular una persona (de esta academia) de su cuenta de usuario',
  })
  async unlinkPersonFromUser(
    @Param('academyId') academyId: string,
    @Param('personId') personId: string,
  ): Promise<Person> {
    return this.personsService.unlinkFromUser(personId);
  }
}
