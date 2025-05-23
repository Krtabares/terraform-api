/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/persons/persons.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery, SortOrder } from 'mongoose';
import { Person, PersonDocument, PersonStatus } from './schemas/person.schema';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { QueryPersonDto } from './dto/query-person.dto';
import {
  PersonAcademyMembershipsService, // Asume que este servicio existe y está inyectado
  PersonAcademyRelationType,
} from '../person-academy-memberships/person-academy-memberships.service'; // Ajusta la ruta

@Injectable()
export class PersonsService {
  // Las propiedades personAcademyMembershipService y personAcademyMembershipModel
  // no son necesarias si pamService está correctamente inyectado y encapsula su propio modelo.
  // Las quito para evitar confusión.

  constructor(
    @InjectModel(Person.name) public personModel: Model<PersonDocument>,
    private readonly pamService: PersonAcademyMembershipsService,
  ) {}

  async create(
    createPersonDto: CreatePersonDto,
    // El initialAcademyId se usa para crear la primera asociación
    initialAcademyId?: string,
    // El initialRelationType se usa para el tipo de esa primera asociación
    initialRelationType: PersonAcademyRelationType = PersonAcademyRelationType.STUDENT, // Un default razonable
  ): Promise<PersonDocument> {
    // Devolver PersonDocument
    if (createPersonDto.email) {
      const existingPersonByEmail = await this.personModel
        .findOne({ email: createPersonDto.email.toLowerCase() })
        .exec();
      if (existingPersonByEmail) {
        throw new ConflictException(
          `Una persona con el email "${createPersonDto.email}" ya existe.`,
        );
      }
    }

    // Crear la persona. El DTO no debería tener associatedAcademyId ya que se maneja por membresía.
    const { associatedAcademyId, ...personDataToCreate } = createPersonDto;
    if (associatedAcademyId) {
      // Advertir o ignorar, ya que la asociación se hace explícitamente ahora
      console.warn(
        `CreatePersonDto contenía associatedAcademyId (${associatedAcademyId}), se ignorará. Use initialAcademyId.`,
      );
    }

    const newPerson = new this.personModel(personDataToCreate);
    const savedPerson = await newPerson.save();

    if (initialAcademyId) {
      try {
        await this.pamService.associatePersonWithAcademy({
          personId: savedPerson._id.toString(),
          academyId: initialAcademyId,
          relationType: initialRelationType,
        });
      } catch (error) {
        // Manejar el error, ej. si la asociación falla, la persona ya está creada.
        // Podrías querer borrar la persona o loguear el error y continuar.
        console.error(
          `Persona ${savedPerson.id} creada, pero falló la asociación inicial a academia ${initialAcademyId} como ${initialRelationType}: ${error.message}`,
        );
        // throw error; // O re-lanzar si la asociación es crítica
      }
    }
    return savedPerson;
  }

  async findAll(
    queryDto: QueryPersonDto,
    requestingAcademyId?: string, // Usado para filtrar si el usuario no es ROOT y no especifica otra academia
  ): Promise<{
    data: PersonDocument[]; // Devolver PersonDocument
    count: number;
    totalPages: number;
    currentPage: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      tags,
      hasUserAccount,
      sortBy,
    } = queryDto;
    const skip = (page - 1) * limit;

    const personQuery: FilterQuery<PersonDocument> = {};
    let academyIdToFilterForMemberships: string | undefined =
      queryDto.associatedAcademyId;

    // Si es un usuario de academia (no ROOT) y no se ha especificado un filtro de academia,
    // se filtra por su propia academia.
    if (requestingAcademyId && !queryDto.associatedAcademyId) {
      academyIdToFilterForMemberships = requestingAcademyId;
    }

    if (academyIdToFilterForMemberships) {
      // 1. Obtener los personIds de las membresías activas para la academia especificada
      const activeMemberships = await this.pamService.getPersonsInAcademy(
        academyIdToFilterForMemberships,
        undefined, // sin filtrar por relationType específico aquí, solo por academia
        true, // solo activas
      );
      const personIdsFromMemberships = activeMemberships.map((m) =>
        m.personId.toString(),
      );

      if (personIdsFromMemberships.length === 0) {
        return { data: [], count: 0, totalPages: 0, currentPage: Number(page) };
      }
      personQuery._id = {
        $in: personIdsFromMemberships.map((id) => new Types.ObjectId(id)),
      };
    }
    // Si no hay academyIdToFilterForMemberships, se buscan todas las personas (ej. para un ROOT).

    // Aplicar otros filtros a la colección Persons
    if (search) {
      /* ...tu lógica de search... */
    }
    if (status) personQuery.status = status;
    if (tags)
      personQuery.tags = { $in: tags.split(',').map((tag) => tag.trim()) };
    if (hasUserAccount !== undefined) {
      /* ...tu lógica de hasUserAccount... */
    }

    const sortOptions: { [key: string]: SortOrder } = {
      lastName: 1,
      firstName: 1,
    };
    if (sortBy) {
      /* ...tu lógica de sortBy... */
    }

    const persons = await this.personModel
      .find(personQuery) // personQuery ya está filtrado por _id si academyIdToFilterForMemberships se aplicó
      .populate('userId', 'email systemRoles')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    const count = await this.personModel.countDocuments(personQuery);
    return {
      data: persons,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
    };
  }

  async findOne(
    id: string,
    requestingAcademyId?: string, // Si se provee, se valida que la persona pertenezca a esta academia (si no es ROOT)
    // Para indicar si el que llama es ROOT y puede saltarse el filtro de academia
    // Esto debería venir del controlador basado en los roles del usuario.
    // Si el controlador ya valida esto (ej. un ROOT no pasa requestingAcademyId), no se necesita aquí.
    // Por ahora, lo mantendré simple: si requestingAcademyId se pasa, se valida.
  ): Promise<PersonDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID de persona inválido.');
    }

    const person = await this.personModel
      .findById(id)
      .populate('userId', 'email')
      .exec();

    if (!person) {
      throw new NotFoundException(`Persona con ID "${id}" no encontrada.`);
    }

    if (requestingAcademyId) {
      // Validar que esta persona tiene una membresía activa en la requestingAcademyId
      const memberships = await this.pamService.getPersonAcademies(id, true); // Solo activas
      const isAssociated = memberships.some(
        (m) => m.academyId.toString() === requestingAcademyId,
      );
      if (!isAssociated) {
        throw new NotFoundException(
          `Persona con ID "${id}" no encontrada o no asociada activamente a la academia especificada (${requestingAcademyId}).`,
        );
      }
    }
    return person;
  }

  // Helper para crear un objeto Person "vacío"
  createEmptyPerson(): Omit<Person, '_id' | 'createdAt' | 'updatedAt'> & {
    _id?: Types.ObjectId;
  } {
    return {
      // _id: undefined, // _id no debería estar si es "nuevo" o "vacío"
      firstName: '',
      lastName: '',
      email: undefined, // o '' si prefieres
      phone: undefined,
      dateOfBirth: undefined,
      gender: undefined, // o un valor por defecto si tiene sentido
      address: undefined,
      internalNotes: undefined,
      userId: null,
      status: PersonStatus.PROSPECT, // O un estado por defecto para "no encontrado" / "nuevo"
      tags: [],
      customFields: {},
      // createdAt y updatedAt no se incluyen ya que no es un registro real
    };
  }

  async findByUserId(userId: string): Promise<PersonDocument | null> {
    // Devolver PersonDocument
    if (!Types.ObjectId.isValid(userId)) return null;
    return this.personModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  async findByUserIdOrPersonId(id: string): Promise<PersonDocument | Person> {
    if (!Types.ObjectId.isValid(id)) {
      // Devolver un objeto Person vacío si el ID es inválido y así lo deseas
      return this.createEmptyPerson() as Person; // Castear a Person, ya que no es un Document
    }

    const findForUser = await this.findByUserId(id);
    if (findForUser) {
      return findForUser; // Esto es PersonDocument
    }

    const findByPerson = await this.personModel
      .findById(id)
      .populate('userId', 'email')
      .exec();

    if (findByPerson) {
      return findByPerson; // Esto es PersonDocument
    }

    // Si no se encontró, devolver un objeto Person "vacío"
    // Esto NO será un PersonDocument (no tendrá métodos de Mongoose)
    return this.createEmptyPerson() as Person; // Castear a Person
  }

  async customUpsert(
    id: string,
    dataToSave: CreatePersonDto | UpdatePersonDto,
  ): Promise<PersonDocument> {
    const item = await this.findByUserId(id);

    if (item) {
      // Actualizar el item existente
      Object.assign(item, dataToSave);
      // Si usas DTOs, asegúrate de que solo los campos permitidos se asignen.
      // item.set(dataToSave); // Otra forma de actualizar con Mongoose

      return await this.UpdatePersonLogic(item, dataToSave);
      //return item.save(); // Ejecuta validadores y middleware de save
    } else {
      // Crear un nuevo item
      // Asegúrate de que dataToSave contenga el identifierField y su valor
      const createData = { ...dataToSave, userId: id };
      const newItem = new this.personModel(createData as CreatePersonDto);
      return newItem.save(); // Ejecuta validadores y middleware de save
    }
  }

  private async UpdatePersonLogic(
    personToUpdate: PersonDocument,
    updatePersonDto: UpdatePersonDto,
  ): Promise<PersonDocument> {
    if (
      updatePersonDto.email &&
      updatePersonDto.email !== personToUpdate.email
    ) {
      const existing = await this.personModel
        .findOne({
          email: updatePersonDto.email.toLowerCase(),
          _id: { $ne: personToUpdate._id },
        })
        .exec();
      if (existing) {
        throw new ConflictException(
          `El email "${updatePersonDto.email}" ya está en uso por otra persona.`,
        );
      }

      // `associatedAcademyId` ya no se maneja aquí.
      // Si el DTO lo trae, se ignora o se usa para crear/actualizar una membresía separadamente.
      const { associatedAcademyId, ...personDataToUpdate } = updatePersonDto;
      if (associatedAcademyId) {
        console.warn(
          `UpdatePersonDto contenía associatedAcademyId (${associatedAcademyId}). Las asociaciones se gestionan separadamente.`,
        );
        // Si se quisiera actualizar/añadir una membresía aquí, se llamaría a pamService.
        // Ejemplo: await this.pamService.associatePersonWithAcademy(...) o this.pamService.updateAssociation(...)
        // Esto requeriría más lógica y permisos.
      }

      Object.assign(personToUpdate, personDataToUpdate);

      if (updatePersonDto.userId === null) {
        personToUpdate.userId = null;
      } else if (
        updatePersonDto.userId &&
        updatePersonDto.userId !== personToUpdate.userId?.toString()
      ) {
        const existingPersonForUser = await this.personModel
          .findOne({
            userId: new Types.ObjectId(updatePersonDto.userId),
            _id: { $ne: personToUpdate._id },
          })
          .exec();
        if (existingPersonForUser) {
          throw new ConflictException(
            `El usuario ${updatePersonDto.userId} ya está vinculado a otra persona (ID: ${existingPersonForUser.id}).`,
          );
        }
        personToUpdate.userId = new Types.ObjectId(updatePersonDto.userId);
      }
    }

    return personToUpdate.save();
  }

  async update(
    id: string,
    updatePersonDto: UpdatePersonDto,
    requestingAcademyId?: string,
  ): Promise<PersonDocument> {
    // Devolver PersonDocument
    // findOne validará si la persona existe y si el usuario tiene acceso (si requestingAcademyId se pasa)
    const personToUpdate = await this.findOne(id, requestingAcademyId);

    return await this.UpdatePersonLogic(personToUpdate, updatePersonDto);
  }

  async linkToUser(personId: string, userId: string): Promise<PersonDocument> {
    // Al vincular, no necesariamente filtramos por requestingAcademyId, ya que un ROOT puede hacerlo.
    // La validación de si personId existe se hace en findOne sin filtro de academia.
    const person = await this.findOne(personId);
    const userObjectId = new Types.ObjectId(userId);

    const existingPersonForUser = await this.personModel
      .findOne({ userId: userObjectId, _id: { $ne: person._id } })
      .exec();
    if (existingPersonForUser) {
      throw new ConflictException(
        `El usuario ${userId} ya está vinculado a otra persona (ID: ${existingPersonForUser.id}).`, // Mostrando _id de la persona
      );
    }

    person.userId = userObjectId;
    return person.save();
  }

  async unlinkFromUser(personId: string): Promise<PersonDocument> {
    const person = await this.findOne(personId);
    person.userId = null;
    return person.save();
  }

  async remove(
    id: string,
    requestingAcademyId?: string,
  ): Promise<{ deleted: boolean; message?: string }> {
    // Valida acceso y existencia de la persona
    const personToDelete = await this.findOne(id, requestingAcademyId);

    // 1. Eliminar todas sus asociaciones (membresías) a academias
    const memberships = await this.pamService.getPersonAcademies(id, false); // Obtener todas
    for (const membership of memberships) {
      try {
        await this.pamService.removePersonFromAcademy(
          id,
          membership.academyId.toString(),
          membership.relationType,
          true, // Hard delete de la membresía
        );
      } catch (error) {
        console.error(
          `Error eliminando la membresía ${membership.id} para la persona ${id}: ${error.message}`,
        );
        // Decidir si continuar o abortar. Por ahora, continuamos.
      }
    }

    // 2. Eliminar la persona
    const result = await this.personModel
      .deleteOne({ _id: personToDelete._id })
      .exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Persona con ID "${id}" no encontrada para eliminar (después de eliminar membresías).`,
      );
    }
    return {
      deleted: true,
      message: `Persona con ID "${id}" y todas sus asociaciones han sido eliminadas.`,
    };
  }

  // --- Métodos que actúan como fachada o usan pamService ---
  async getPersonMemberships(
    personId: string,
    requestingAcademyId?: string,
  ): Promise<any[]> {
    // Valida acceso a la persona si requestingAcademyId se proporciona
    await this.findOne(personId, requestingAcademyId);
    return this.pamService.getPersonAcademies(personId, true); // Por defecto solo activas
  }

  async addPersonToAcademy(
    personId: string,
    academyIdToAssociate: string,
    relationType: PersonAcademyRelationType,
    metadata?: Record<string, any>,
    // El requestingAcademyId se usa para validar permisos de QUIÉN hace la acción
    // Si el usuario no es ROOT, solo puede asociar personas a SU academia (requestingAcademyId === academyIdToAssociate)
    requestingAcademyId?: string,
    // isUserRoot: boolean = false, // Ya no es necesario si el controlador pasa el requestingAcademyId correcto o undefined
  ): Promise<any> {
    await this.findOne(personId); // Validar que la persona exista (sin filtro de academia)

    // Aquí va la lógica de permisos: ¿Puede el usuario actual (del token, que da requestingAcademyId)
    // realizar esta asociación en `academyIdToAssociate`?
    // Esto usualmente lo haría el RolesGuard en el controlador o una capa de autorización.
    // Si `requestingAcademyId` está presente (no es ROOT) y es diferente de `academyIdToAssociate`, denegar.
    if (requestingAcademyId && requestingAcademyId !== academyIdToAssociate) {
      throw new BadRequestException(
        'No tienes permiso para asociar esta persona a la academia especificada.',
      );
    }

    return this.pamService.associatePersonWithAcademy({
      personId,
      academyId: academyIdToAssociate,
      relationType,
      metadata,
    });
  }

  async removePersonAssociationFromAcademy(
    personId: string,
    academyIdToRemoveFrom: string,
    relationType: PersonAcademyRelationType,
    hardDelete: boolean = false,
    requestingAcademyId?: string,
  ): Promise<any> {
    await this.findOne(personId); // Validar que la persona exista

    if (requestingAcademyId && requestingAcademyId !== academyIdToRemoveFrom) {
      throw new BadRequestException(
        'No tienes permiso para desasociar esta persona de la academia especificada.',
      );
    }
    return this.pamService.removePersonFromAcademy(
      personId,
      academyIdToRemoveFrom,
      relationType,
      hardDelete,
    );
  }
}
