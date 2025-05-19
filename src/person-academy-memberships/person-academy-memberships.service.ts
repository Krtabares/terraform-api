/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/person-academy-memberships/person-academy-memberships.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  PersonAcademyMembership,
  PersonAcademyMembershipDocument,
  PersonAcademyRelationType,
} from './schemas/person-academy-membership.schema';
import { PersonsService } from '../persons/persons.service'; // Para validar personId
import { AcademiesService } from '../academies/academies.service'; // Para validar academyId

export interface CreateMembershipDto {
  personId: string;
  academyId: string;
  relationType: PersonAcademyRelationType;
  isActive?: boolean;
  metadata?: Record<string, any>;
  startDate?: Date;
}

export interface UpdateMembershipDto {
  relationType?: PersonAcademyRelationType;
  isActive?: boolean;
  metadata?: Record<string, any>;
  endDate?: Date | null; // null para borrar la fecha de fin
  startDate?: Date;
}

@Injectable()
export class PersonAcademyMembershipsService {
  constructor(
    @InjectModel(PersonAcademyMembership.name)
    private pamModel: Model<PersonAcademyMembershipDocument>,
    // private readonly academiesService: AcademiesService, // Inyectado para validación
    // private readonly personsService: PersonsService, // Inyectado para validación
  ) {}

  /**
   * Asocia una persona con una academia con un tipo de relación específico.
   * Si ya existe una asociación activa con el mismo tipo, podría lanzar error o actualizarla.
   */
  async associatePersonWithAcademy(
    dto: CreateMembershipDto,
  ): Promise<PersonAcademyMembershipDocument> {
    const {
      personId,
      academyId,
      relationType,
      metadata,
      isActive = true,
      startDate,
    } = dto;

    // 1. Validar que la persona y la academia existan
    // await this.personsService.findOne(personId); // findOne lanza NotFoundException si no existe
    // await this.academiesService.findOne(academyId); // findOne lanza NotFoundException si no existe

    // 2. Verificar si ya existe una asociación activa similar (opcional, basado en tu lógica de negocio)
    // Por ejemplo, una persona no debería ser 'STUDENT' activo dos veces en la misma academia.
    const existingActiveMembership = await this.pamModel.findOne({
      personId: new Types.ObjectId(personId),
      academyId: new Types.ObjectId(academyId),
      relationType: relationType,
      isActive: true,
    });

    if (existingActiveMembership) {
      // Podrías actualizar la existente o lanzar un error
      // throw new ConflictException(`La persona ya tiene una asociación activa como ${relationType} en esta academia.`);
      // O, si quieres permitir múltiples pero solo una activa con ese `relationType`, o actualizar:
      // existingActiveMembership.metadata = { ...existingActiveMembership.metadata, ...metadata };
      // existingActiveMembership.startDate = startDate || existingActiveMembership.startDate;
      // return existingActiveMembership.save();
      // Por ahora, vamos a lanzar un error para evitar duplicados activos con el mismo relationType.
      // Ajusta esto según tus reglas de negocio.
      throw new ConflictException(
        `La persona ${personId} ya tiene una asociación activa como '${relationType}' en la academia ${academyId}.`,
      );
    }

    const newMembership = new this.pamModel({
      personId: new Types.ObjectId(personId),
      academyId: new Types.ObjectId(academyId),
      relationType,
      isActive,
      metadata,
      startDate: startDate || new Date(), // Usar fecha provista o la actual
    });

    return newMembership.save();
  }

  /**
   * Desactiva una asociación específica entre una persona y una academia para un tipo de relación,
   * o la elimina si se prefiere.
   * Por defecto, la desactiva (borrado lógico).
   */
  async removePersonFromAcademy(
    personId: string,
    academyId: string,
    relationType: PersonAcademyRelationType,
    hardDelete: boolean = false, // Parámetro para borrado físico
  ): Promise<PersonAcademyMembershipDocument | { deleted: boolean }> {
    const personObjectId = new Types.ObjectId(personId);
    const academyObjectId = new Types.ObjectId(academyId);

    const membership = await this.pamModel.findOne({
      personId: personObjectId,
      academyId: academyObjectId,
      relationType: relationType,
      // Podrías querer buscar solo activas: isActive: true
    });

    if (!membership) {
      throw new NotFoundException(
        `No se encontró asociación como ${relationType} para la persona ${personId} en la academia ${academyId}.`,
      );
    }

    if (hardDelete) {
      await this.pamModel.deleteOne({ _id: membership._id });
      return { deleted: true };
    } else {
      // Borrado lógico: desactivar y opcionalmente poner fecha de fin
      membership.isActive = false;
      if (!membership.endDate) {
        // Solo poner endDate si no tiene ya una
        membership.endDate = new Date();
      }
      return membership.save();
    }
  }

  /**
   * Actualiza una asociación existente.
   */
  async updateAssociation(
    membershipId: string, // Actualizar por ID de la membresía/asociación
    updateDto: UpdateMembershipDto,
  ): Promise<PersonAcademyMembershipDocument> {
    const membership = await this.pamModel.findById(membershipId);
    if (!membership) {
      throw new NotFoundException(
        `Asociación con ID ${membershipId} no encontrada.`,
      );
    }

    if (updateDto.relationType !== undefined)
      membership.relationType = updateDto.relationType;
    if (updateDto.isActive !== undefined)
      membership.isActive = updateDto.isActive;
    if (updateDto.metadata !== undefined)
      membership.metadata = { ...membership.metadata, ...updateDto.metadata }; // Fusionar metadata
    if (updateDto.startDate !== undefined)
      membership.startDate = updateDto.startDate;

    if (updateDto.endDate !== undefined) {
      // Permite poner endDate o quitarlo (haciéndolo null)
      //membership.endDate = updateDto.endDate; // puede ser Date o null
    }

    // Si se reactiva una membresía, podrías querer quitar la fecha de fin
    if (updateDto.isActive === true && membership.isActive === true) {
      // isActive se acaba de poner a true
      membership.endDate = undefined; // o null, según tu preferencia para "sin fecha de fin"
    }

    return membership.save();
  }

  /**
   * Obtiene todas las asociaciones (academias y roles) para una persona específica.
   */
  async getPersonAcademies(
    personId: string,
    onlyActive: boolean = true,
  ): Promise<PersonAcademyMembershipDocument[]> {
    const query: any = { personId: new Types.ObjectId(personId) };
    if (onlyActive) {
      query.isActive = true;
    }

    return this.pamModel
      .find(query)
      .populate('academyId', 'name logo') // Populate con datos de la academia
      .exec();
  }

  /**
   * Obtiene todas las personas asociadas a una academia específica con un tipo de relación.
   */
  async getPersonsInAcademy(
    academyId: string,
    relationType?: PersonAcademyRelationType,
    onlyActive: boolean = true,
  ): Promise<PersonAcademyMembershipDocument[]> {
    const query: any = { academyId: new Types.ObjectId(academyId) };
    if (relationType) {
      query.relationType = relationType;
    }
    if (onlyActive) {
      query.isActive = true;
    }
    return this.pamModel
      .find(query)
      .populate('personId', 'firstName lastName email') // Populate con datos de la persona
      .exec();
  }

  /**
   * Encuentra una membresía/asociación específica.
   */
  async findOneMembership(
    personId: string,
    academyId: string,
    relationType: PersonAcademyRelationType,
  ): Promise<PersonAcademyMembershipDocument | null> {
    return this.pamModel
      .findOne({
        personId: new Types.ObjectId(personId),
        academyId: new Types.ObjectId(academyId),
        relationType: relationType,
      })
      .exec();
  }
}
export { PersonAcademyRelationType };
