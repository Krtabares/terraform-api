// src/users/schemas/user.schema.ts (o src/personas/schemas/persona.schema.ts)
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
// Importaríamos RoleInAcademy si lo definimos en otro lado, o lo embebemos/referenciamos aquí

// Opcional: Si tienes un schema separado para RoleInAcademy y quieres referenciarlo
// import { RoleInAcademy } from './role-in-academy.schema';

export type UserDocument = User & Document; // O PersonaDocument = Persona & Document

@Schema({ timestamps: true, versionKey: false })
export class User { // O class Persona
  // ID Único Global es _id por defecto en MongoDB
  _id: string;

  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string; // Almacenaremos el hash de la contraseña

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  lastLoginAt?: Date;

  @Prop({ type: String, select: false, default: null }) // select: false para no enviarlo por defecto
  passwordResetToken?: string;

  @Prop({ type: Date, select: false, default: null })
  passwordResetExpires?: Date;

  // Referencia a RolesDeAcademia:
  // Esto dependerá de cómo quieras modelarlo.
  // Opción 1: Array de ObjectIds si RoleInAcademy es una colección separada (recomendado para flexibilidad)
  // @Prop({ type: [{ type: Types.ObjectId, ref: 'RoleInAcademy' }] }) // 'RoleInAcademy' es el nombre del modelo Mongoose
  // rolesInAcademies: Types.ObjectId[];

  // Opción 2: Array embebido (si los roles son simples y no necesitan su propia colección)
  // Este es un ejemplo simplificado, necesitarías definir la estructura de RoleInAcademy
  @Prop({ type: [{ academyId: Types.ObjectId, role: String }] , default: [] })
  rolesInAcademies: { academyId: Types.ObjectId; role: string }[]; // Ej: 'DIRECTOR', 'PROFESOR', 'ALUMNO', 'ROOT'

  // Opción 3: Un rol global para el sistema (ROOT) puede ser un campo separado
  @Prop({ type: [String], enum: ['ROOT', 'USER'], default: ['USER'] }) // 'USER' podría ser un rol base
  systemRoles?: string[]; // Para roles que no dependen de una academia, como ROOT

  // createdAt y updatedAt son añadidos por timestamps: true
}

export const UserSchema = SchemaFactory.createForClass(User); // O PersonaSchema