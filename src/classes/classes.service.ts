// src/classes/classes.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery, SortOrder } from 'mongoose';
import { Class, ClassDocument } from './schemas/class.schema';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { QueryClassDto, ClassSortBy } from './dto/query-class.dto';
// import { UsersService } from '../users/users.service'; // Si necesitas validar existencia de teacherId

@Injectable()
export class ClassesService {
  constructor(
    @InjectModel(Class.name) private classModel: Model<ClassDocument>,
    // @Inject(UsersService) private readonly usersService: UsersService, // Ejemplo de inyección
  ) {}

  async create(
    academyId: string,
    createClassDto: CreateClassDto,
  ): Promise<Class> {
    // Validación adicional (ej. endTime > startTime)
    if (
      new Date(createClassDto.endTime) <= new Date(createClassDto.startTime)
    ) {
      throw new BadRequestException('End time must be after start time.');
    }

    // Opcional: Validar que teacherId (si se provee) existe en la colección de Users
    // if (createClassDto.teacherId) {
    //   const teacherExists = await this.usersService.findOne(createClassDto.teacherId); // Asume que UsersService tiene findOne
    //   if (!teacherExists) {
    //     throw new NotFoundException(`Teacher with ID "${createClassDto.teacherId}" not found.`);
    //   }
    // }
    // Opcional: Validar que academyId existe

    const createdClass = new this.classModel({
      ...createClassDto,
      academyId: academyId, // Convertir a ObjectId
      teacherId: createClassDto.teacherId
        ? new Types.ObjectId(createClassDto.teacherId)
        : undefined,
    });
    return createdClass.save();
  }

  async findAll(
    academyId: string,
    queryDto: QueryClassDto,
  ): Promise<{
    data: Class[];
    count: number;
    totalPages: number;
    currentPage: number;
  }> {
    const {
      page = 1,
      limit = 10,
      teacherId,
      minStartTime,
      maxStartTime,
      tags,
      isActive,
      searchName,
      sortBy,
    } = queryDto;
    const skip = (page - 1) * limit;

    const query: FilterQuery<ClassDocument> = {};

    if (academyId) {
      query.academyId = academyId;
    }
    if (teacherId) {
      query.teacherId = new Types.ObjectId(teacherId);
    }
    if (minStartTime || maxStartTime) {
      query.startTime = {};
      if (minStartTime) {
        query.startTime.$gte = new Date(minStartTime);
      }
      if (maxStartTime) {
        query.startTime.$lte = new Date(maxStartTime);
      }
    }
    if (tags) {
      query.tags = { $in: tags.split(',').map((tag) => tag.trim()) };
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (searchName) {
      query.name = { $regex: searchName, $options: 'i' }; // Búsqueda case-insensitive
    }

    let sortOptions: { [key: string]: SortOrder } = { startTime: 1 }; // Default sort
    if (sortBy) {
      const [field, order] = sortBy.split(':') as [keyof Class, SortOrder];
      sortOptions = { [field]: order === 'desc' ? -1 : 1 };
    }

    const classes = await this.classModel
      .find(query)
      .populate('academyId', 'name') // Opcional: popular nombre de la academia
      .populate('teacherId', 'name email') // Opcional: popular datos del profesor
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    const count = await this.classModel.countDocuments(query);
    const totalPages = Math.ceil(count / limit);

    return { data: classes, count, totalPages, currentPage: Number(page) };
  }

  async findOne(id: string): Promise<Class> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid MongoDB ObjectId');
    }
    const classFound = await this.classModel
      .findById(id)
      .populate('academyId', 'name')
      .populate('teacherId', 'name email')
      .exec();
    if (!classFound) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }
    return classFound;
  }

  async update(
    academyId: string,
    id: string,
    updateClassDto: UpdateClassDto,
  ): Promise<Class> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid MongoDB ObjectId');
    }
    // Validación adicional (ej. endTime > startTime si se actualizan ambas)
    if (
      updateClassDto.startTime &&
      updateClassDto.endTime &&
      new Date(updateClassDto.endTime) <= new Date(updateClassDto.startTime)
    ) {
      throw new BadRequestException('End time must be after start time.');
    } else if (updateClassDto.startTime && !updateClassDto.endTime) {
      const existingClass = await this.findOne(id);
      if (
        new Date(existingClass.endTime) <= new Date(updateClassDto.startTime)
      ) {
        throw new BadRequestException('End time must be after start time.');
      }
    } else if (!updateClassDto.startTime && updateClassDto.endTime) {
      const existingClass = await this.findOne(id);
      if (
        new Date(updateClassDto.endTime) <= new Date(existingClass.startTime)
      ) {
        throw new BadRequestException('End time must be after start time.');
      }
    }

    // Convertir IDs a ObjectId si se proveen
    const updateData: any = { ...updateClassDto };
    if (updateClassDto.academyId) {
      updateData.academyId = new Types.ObjectId(updateClassDto.academyId);
    }
    if (updateClassDto.teacherId) {
      updateData.teacherId = new Types.ObjectId(updateClassDto.teacherId);
    }

    const updatedClass = await this.classModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('academyId', 'name')
      .populate('teacherId', 'name email')
      .exec();

    if (!updatedClass) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }
    return updatedClass;
  }

  async remove(
    academyId: string,
    id: string,
  ): Promise<{ deleted: boolean; message?: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid MongoDB ObjectId');
    }
    // Considerar: ¿Qué pasa si hay inscripciones activas en esta clase?
    // Podrías añadir lógica para prevenir el borrado o manejar las inscripciones.
    const result = await this.classModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Class with ID "${id}" not found`);
    }
    return {
      deleted: true,
      message: `Class with ID "${id}" successfully deleted.`,
    };
  }

  async checkAndDecrementCapacity(classId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException(
        'ID de clase inválido para decrementar capacidad.',
      );
    }

    const classToUpdate = await this.classModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(classId),
          // Condición: Asegurarse de que aún hay cupo.
          // Esto se hace comparando enrolledCount con capacity.
          // Usamos $expr para comparar dos campos del mismo documento.
          $expr: { $lt: ['$enrolledCount', '$capacity'] },
          isActive: true, // Solo permitir en clases activas
        },
        {
          // Operación atómica para incrementar enrolledCount
          $inc: { enrolledCount: 1 },
        },
        {
          new: true, // Devuelve el documento modificado (opcional, pero útil para logging)
        },
      )
      .exec();

    if (!classToUpdate) {
      // Si no se encontró el documento o no cumplió la condición $expr,
      // significa que no hay capacidad o la clase no está activa.
      console.log(
        `Intento de decrementar capacidad fallido para clase ${classId}: Sin cupo o clase inactiva.`,
      );
      return false; // No se pudo decrementar (sin cupo o clase inactiva)
    }

    console.log(
      `Capacidad decrementada para clase ${classId}. Nuevo enrolledCount: ${classToUpdate.enrolledCount}`,
    );
    return true; // Capacidad decrementada exitosamente
  }

  async incrementCapacity(classId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(classId)) {
      throw new BadRequestException(
        'ID de clase inválido para incrementar capacidad.',
      );
    }

    const classToUpdate = await this.classModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(classId),
          // Condición: Asegurarse de que enrolledCount > 0 para no tener negativos.
          enrolledCount: { $gt: 0 },
        },
        {
          // Operación atómica para decrementar enrolledCount
          $inc: { enrolledCount: -1 },
        },
        {
          new: true,
        },
      )
      .exec();

    if (!classToUpdate) {
      // Si no se actualizó, puede ser que la clase no exista o enrolledCount ya era 0.
      console.log(
        `Intento de incrementar capacidad fallido para clase ${classId}: Clase no encontrada o enrolledCount ya era 0.`,
      );
      return false;
    }
    console.log(
      `Capacidad incrementada para clase ${classId}. Nuevo enrolledCount: ${classToUpdate.enrolledCount}`,
    );
    return true;
  }

  // Funciones adicionales que podrías necesitar:
  // - findClassesByTeacher(teacherId: string)
  // - findUpcomingClasses(academyId: string, limit: number)
  // - decrementCapacity(classId: string) -> Usado por InscriptionsModule
  // - incrementCapacity(classId: string) -> Usado por InscriptionsModule
}
