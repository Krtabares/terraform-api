/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/users/users.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Inject } from '@nestjs/common';
import { FilterQuery, Model, SortOrder, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { AcademyRole } from 'src/auth/enum/academyRole.enum';
import { SystemRole } from 'src/auth/enum/systemRole.enum';
import { PersonAcademyMembershipsService } from 'src/person-academy-memberships/person-academy-memberships.service';
import {
  AcademyUserDto,
  PaginatedAcademyUsersDto,
} from './dto/academy-user.dto';
import { QueryParamsDto } from 'src/shared/dto/query-params.dto';
import { PersonsService } from 'src/persons/persons.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(PersonsService) private readonly personsService: PersonsService,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async create(createUserDto: Partial<User>): Promise<UserDocument> {
    // Usar Partial<User> o un DTO específico
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async updateUserProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    // O tu UserResponseDto
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    // Validar si el nuevo email ya existe (si se está cambiando)
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUserWithNewEmail = await this.findByEmail(
        updateUserDto.email,
      );
      if (
        existingUserWithNewEmail &&
        existingUserWithNewEmail._id?.toString() !== user._id?.toString()
      ) {
        throw new ConflictException(
          'El nuevo email ya está en uso por otro usuario.',
        );
      }
      // Aquí podrías añadir lógica para marcar el email como no verificado
      // y enviar un correo de verificación.
      user.email = updateUserDto.email;
    }

    if (updateUserDto.nombre) {
      user.nombre = updateUserDto.nombre;
    }

    await user.save();
    const userObject = user.toObject();
    const { passwordHash, __v, ...resultForClient } = userObject;
    return resultForClient as UserDocument; // Ajusta el tipo de retorno si es necesario
  }

  async findUserByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+passwordHash').exec(); // Incluye el passwordHash
  }

  async updatePassword(
    userId: string,
    newHashedPassword: string,
  ): Promise<void> {
    const result = await this.userModel.updateOne(
      { _id: userId },
      { $set: { passwordHash: newHashedPassword } },
    );
    if (result.matchedCount === 0) {
      throw new NotFoundException(
        'Usuario no encontrado para actualizar contraseña.',
      );
    }
  }

  async setPasswordResetToken(
    userId: Types.ObjectId | string,
    tokenHash: string,
    expires: Date,
  ): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          passwordResetToken: tokenHash,
          passwordResetExpires: expires,
        },
      },
    );
  }

  async clearPasswordResetToken(
    userId: Types.ObjectId | string,
  ): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      },
    );
  }

  async findUserByResetToken(
    hashedToken: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() }, // Token no expirado
      })
      .select('+passwordResetToken +passwordResetExpires')
      .exec(); // Incluir campos para la lógica
  }

  async updatePasswordAndClearResetToken(
    userId: Types.ObjectId | string,
    newHashedPassword: string,
  ): Promise<void> {
    const result = await this.userModel.updateOne(
      { _id: userId },
      {
        $set: {
          passwordHash: newHashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      },
    );
    if (result.matchedCount === 0) {
      throw new NotFoundException(
        'Usuario no encontrado para actualizar contraseña y limpiar token.',
      );
    }
  }

  async assignOrUpdateAcademyRole(
    assigningUser: UserDocument, // Usuario que realiza la acción
    targetUserId: string,
    academyId: string,
    roleToAssign: AcademyRole,
  ): Promise<UserDocument> {
    // O tu UserResponseDto
    const targetUser = await this.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException('Usuario objetivo no encontrado.');
    }

    // TODO: Verificar que la academia (academyId) existe.
    // Si tienes un AcademiesService:
    // const academy = await this.academiesService.findById(academyId);
    // if (!academy) {
    //   throw new NotFoundException('Academia no encontrada.');
    // }

    // Lógica de permisos:
    // 1. Si assigningUser es ROOT, puede asignar cualquier rol.
    // 2. Si assigningUser es DIRECTOR, solo puede asignar roles en academias que dirige
    //    y no puede asignar el rol de DIRECTOR a otro (o solo si es el único director y quiere transferir).
    let canAssign = false;
    if (assigningUser.systemRoles?.includes(SystemRole.ROOT)) {
      canAssign = true;
    } else {
      const isDirectorOfTargetAcademy = assigningUser.rolesInAcademies?.some(
        (r) =>
          r.role === AcademyRole.DIRECTOR &&
          r.academyId.toString() === academyId,
      );
      if (isDirectorOfTargetAcademy) {
        // Un director NO puede asignar el rol de DIRECTOR a otro usuario en su propia academia
        // a menos que implementes una lógica específica de "transferencia de propiedad" o co-directores.
        if (
          roleToAssign === AcademyRole.DIRECTOR &&
          assigningUser._id?.toString() !== targetUserId
        ) {
          // Podrías permitir que un director se asigne a sí mismo el rol si no lo tiene,
          // pero no a otros. O manejar esto con más granularidad.
          // Por simplicidad, un director no puede nombrar a otro director.
          throw new ForbiddenException(
            'Un Director no puede asignar el rol de Director a otro usuario en su academia.',
          );
        }
        canAssign = true;
      }
    }

    if (!canAssign) {
      throw new ForbiddenException(
        'No tienes permiso para asignar este rol en esta academia.',
      );
    }

    // Lógica para añadir o actualizar el rol
    const existingRoleIndex = targetUser.rolesInAcademies.findIndex(
      (r) => r.academyId.toString() === academyId,
    );

    const newRoleEntry = {
      academyId: new Types.ObjectId(academyId),
      role: roleToAssign,
    };

    if (existingRoleIndex > -1) {
      // Si ya tiene un rol en esa academia, lo actualizamos
      // Podrías querer permitir múltiples roles en la misma academia si tu modelo lo soporta,
      // pero el ejemplo actual asume un rol por academia por usuario.
      targetUser.rolesInAcademies[existingRoleIndex] = newRoleEntry;
    } else {
      targetUser.rolesInAcademies.push(newRoleEntry);
    }

    // Marcar el array como modificado para asegurar que Mongoose lo guarde
    targetUser.markModified('rolesInAcademies');
    await targetUser.save();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, __v, ...result } = targetUser.toObject();
    return result as UserDocument;
  }

  async findUsersAssociatedWithAcademy(
    academyId: string,
    queryParams: QueryParamsDto,
  ): Promise<PaginatedAcademyUsersDto> {
    if (!Types.ObjectId.isValid(academyId)) {
      // Lanzar NotFound o BadRequest según prefieras para un ID de academia inválido
      throw new BadRequestException('ID de academia inválido.');
    }
    const academyObjectId = new Types.ObjectId(academyId);

    const limit = queryParams.limit || 10;
    const page = queryParams.page || 1;
    const skip = (page - 1) * limit;

    // Construir el query para el modelo User
    const userQuery: FilterQuery<UserDocument> = {
      // Filtrar usuarios que tengan una entrada en rolesInAcademies
      // que coincida con la academyId proporcionada.
      'rolesInAcademies.academyId': academyObjectId,
    };

    // Si se especifica un rol en los queryParams, añadirlo al filtro de rolesInAcademies
    if (queryParams.role) {
      userQuery['rolesInAcademies.role'] = queryParams.role;
    }

    // Aplicar búsqueda si existe (buscará en campos de User como email, name)
    // Si quieres que busque en campos de Person (firstName, lastName), la lógica es más compleja.
    // Por ahora, asumimos que la búsqueda es sobre campos del User.
    if (queryParams.search) {
      const searchRegex = new RegExp(queryParams.search, 'i');
      userQuery.$or = [
        { email: searchRegex },
        // Si tu modelo User tiene un campo 'name' directamente:
        // { name: searchRegex },
        // Para buscar en Person.firstName/lastName, necesitarías otro enfoque (ver nota abajo)
      ];
    }

    let sortOptions: { [key: string]: SortOrder } = { email: 1 }; // Ordenar por email por defecto
    if (queryParams.sortBy) {
      const [field, order] = queryParams.sortBy.split(':');
      if (field && (order === 'asc' || order === 'desc')) {
        sortOptions = { [field]: order === 'asc' ? 1 : -1 };
      }
    }

    const users = await this.userModel
      .find(userQuery)
      .select('_id email name systemRoles isActive rolesInAcademies personId') // Incluir personId
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    const totalUsersInAcademy = await this.userModel.countDocuments(userQuery);

    if (!users || users.length === 0) {
      return { data: [], count: 0, totalPages: 0, currentPage: page };
    }

    // Opcional: Enriquecer con datos de Person si es necesario para el DTO
    const personIdsToFetch = users
      .map((u: any) => u.personId)
      .filter((pid) => pid) as Types.ObjectId[];
    const personsMap = new Map<string, any>(); // Usar 'any' o un tipo Person resumido

    if (personIdsToFetch.length > 0) {
      const persons = await this.personsService.personModel
        .find({ _id: { $in: personIdsToFetch } })
        .select('firstName lastName') // Solo los campos que necesitas
        .exec();
      persons.forEach((p) => personsMap.set(p._id.toString(), p));
    }

    // Mapear al DTO de respuesta, incluyendo el rol específico de esta academia
    const academyUsersDto: AcademyUserDto[] = users.map(
      (user: any): AcademyUserDto => {
        const personDetails = user.personId
          ? personsMap.get(user.personId?.toString())
          : null;
        const roleInThisAcademyEntry = user?.rolesInAcademies?.find(
          (roleInAcademy: any) =>
            roleInAcademy.academyId.toString() === academyId, // Comparar como string por seguridad
        );

        return {
          userId: user?._id?.toString(),
          personId: user?.personId?.toString() || '',
          email: user?.email,
          name: personDetails
            ? `${personDetails.firstName} ${personDetails.lastName}`
            : user?.name || user?.email, // Fallback si no hay persona o nombre en user
          systemRoles: user?.systemRoles,
          roleInThisAcademy: roleInThisAcademyEntry?.role || AcademyRole.ALUMNO, // Rol en ESTA academia. Fallback a STUDENT o un rol por defecto.
          isUserAccountActive: user.isActive ?? false,
          personFirstName: personDetails?.firstName,
          personLastName: personDetails?.lastName,
        };
      },
    );

    return {
      data: academyUsersDto,
      count: totalUsersInAcademy,
      totalPages: Math.ceil(totalUsersInAcademy / limit),
      currentPage: page,
    };
  }
}
