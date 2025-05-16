// src/users/users.service.ts
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { AcademyRole } from 'src/auth/enum/academyRole.enum';
import { SystemRole } from 'src/auth/enum/systemRole.enum';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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
}
