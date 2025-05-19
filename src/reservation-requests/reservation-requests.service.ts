// src/reservation-requests/reservation-requests.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery, SortOrder } from 'mongoose';
import {
  ReservationRequest,
  ReservationRequestDocument,
  ReservationRequestStatus,
} from './schemas/reservation-request.schema';
import { CreateReservationRequestDto } from './dto/create-reservation-request.dto';
import { ProcessReservationRequestDto } from './dto/process-reservation-request.dto';
import { QueryReservationRequestDto } from './dto/query-reservation-request.dto';
import { ClassesService } from '../classes/classes.service';
import { InscriptionsService } from '../inscriptions/inscriptions.service'; // Asumimos que este servicio existe
import { Class } from '../classes/schemas/class.schema'; // Para el tipo

@Injectable()
export class ReservationRequestsService {
  private readonly logger = new Logger(ReservationRequestsService.name);

  constructor(
    @InjectModel(ReservationRequest.name)
    private reservationRequestModel: Model<ReservationRequestDocument>,
    private readonly classesService: ClassesService,
    @Inject(forwardRef(() => InscriptionsService)) // Para dependencia circular
    private readonly inscriptionsService: InscriptionsService,
    // Asumimos que también tienes InscriptionsModel en InscriptionsService para verificar inscripciones existentes
  ) {}

  async create(
    studentId: string,
    createDto: CreateReservationRequestDto,
  ): Promise<ReservationRequest> {
    const studentObjectId = new Types.ObjectId(studentId);
    const classObjectId = new Types.ObjectId(createDto.classId);

    const targetClass = await this.classesService.findOne(createDto.classId); // findOne ya debería lanzar NotFound si no existe
    if (!targetClass.isActive) {
      throw new BadRequestException('La clase solicitada no está activa.');
    }
    // Aquí podrías añadir una verificación de capacidad si quieres un pre-filtro,
    // pero la verificación final de capacidad ocurre al crear la inscripción.
    // Ejemplo: if (targetClass.enrolledCount >= targetClass.capacity) throw new BadRequestException('La clase ya está llena.');

    // Verificar si ya existe una solicitud PENDIENTE o una inscripción ACTIVA para este estudiante y clase
    const existingPendingRequest = await this.reservationRequestModel.findOne({
      studentId: studentObjectId,
      classId: classObjectId,
      status: ReservationRequestStatus.PENDING,
    });
    if (existingPendingRequest) {
      throw new ConflictException(
        'Ya tienes una solicitud pendiente para esta clase.',
      );
    }

    // Esta verificación necesita acceso al InscriptionsService y su modelo
    const existingInscription =
      await this.inscriptionsService.findActiveByStudentAndClass(
        studentId,
        createDto.classId,
      );
    if (existingInscription) {
      throw new ConflictException('Ya estás inscrito en esta clase.');
    }

    const newRequest = new this.reservationRequestModel({
      ...createDto,
      studentId: studentObjectId,
      classId: classObjectId,
      academyId: targetClass.academyId, // Tomamos el academyId de la clase
      status: ReservationRequestStatus.PENDING,
    });

    return newRequest.save();
  }

  async findAllForAdmin(queryDto: QueryReservationRequestDto): Promise<{
    data: ReservationRequest[];
    count: number;
    totalPages: number;
    currentPage: number;
  }> {
    const {
      page = 1,
      limit = 10,
      academyId,
      classId,
      studentId,
      status,
      sortBy,
    } = queryDto;
    const skip = (page - 1) * limit;
    const query: FilterQuery<ReservationRequestDocument> = {};

    if (academyId) query.academyId = new Types.ObjectId(academyId);
    if (classId) query.classId = new Types.ObjectId(classId);
    if (studentId) query.studentId = new Types.ObjectId(studentId);
    if (status) query.status = status;

    let sortOptions: { [key: string]: SortOrder } = { createdAt: -1 }; // Default sort
    if (sortBy) {
      const [field, order] = sortBy.split(':') as [string, SortOrder];
      if (field && order) {
        sortOptions = { [field]: order === 'desc' ? -1 : 1 };
      }
    }

    const requests = await this.reservationRequestModel
      .find(query)
      .populate('studentId', 'name email') // Ajusta los campos que quieres de User
      .populate('classId', 'name startTime') // Ajusta los campos que quieres de Class
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();
    const count = await this.reservationRequestModel.countDocuments(query);
    return {
      data: requests,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
    };
  }

  async findByStudent(
    studentId: string,
    queryDto: QueryReservationRequestDto,
  ): Promise<{
    data: ReservationRequest[];
    count: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10, status, sortBy } = queryDto; // Estudiante solo puede filtrar por status y ordenar
    const skip = (page - 1) * limit;
    const query: FilterQuery<ReservationRequestDocument> = {
      studentId: new Types.ObjectId(studentId),
    };
    if (status) query.status = status;

    let sortOptions: { [key: string]: SortOrder } = { createdAt: -1 }; // Default sort
    if (sortBy) {
      const [field, order] = sortBy.split(':') as [string, SortOrder];
      if (field && order) {
        sortOptions = { [field]: order === 'desc' ? -1 : 1 };
      }
    }

    const requests = await this.reservationRequestModel
      .find(query)
      .populate('classId', 'name startTime')
      .populate('academyId', 'name')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();
    const count = await this.reservationRequestModel.countDocuments(query);
    return {
      data: requests,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
    };
  }

  async findOne(id: string): Promise<ReservationRequestDocument> {
    const request = await this.reservationRequestModel
      .findById(id)
      .populate('studentId', 'name email')
      .populate('classId') // Populate con todo el objeto Class para tener precio, etc.
      .populate('academyId', 'name')
      .exec();
    if (!request) {
      throw new NotFoundException(
        `Solicitud de reserva con ID "${id}" no encontrada.`,
      );
    }
    return request;
  }

  async processRequest(
    requestId: string,
    adminId: string, // ID del admin que procesa
    processDto: ProcessReservationRequestDto,
  ): Promise<ReservationRequest> {
    const reservationRequest = await this.findOne(requestId); // findOne ya popula classId

    if (reservationRequest.status !== ReservationRequestStatus.PENDING) {
      throw new BadRequestException(
        `La solicitud ya ha sido procesada (estado actual: ${reservationRequest.status}).`,
      );
    }

    reservationRequest.status = processDto.status;
    reservationRequest.adminNotes = processDto.adminNotes;

    if (processDto.status === ReservationRequestStatus.APPROVED) {
      const targetClass = reservationRequest.classId as unknown as Class; // Ya está populado por findOne
      // Validar que paymentDetails se proporcione si la clase tiene costo
      if (
        targetClass.price &&
        targetClass.price > 0 &&
        !processDto.paymentDetails
      ) {
        throw new BadRequestException(
          'Se requieren detalles de pago (paymentDetails) para aprobar una solicitud de una clase con costo.',
        );
      }
      if (
        processDto.paymentDetails?.paymentType === 'paid_per_class' &&
        targetClass.price &&
        targetClass.price > 0 &&
        !processDto.paymentDetails.amountPaid
      ) {
        // Aqui se podria generar un payment link para el estudiante, o marcarla como pendiente de pago.
        // Por ahora, asumimos que si es paid_per_class y no viene amountPaid, es un error o flujo no soportado aun.
        this.logger.warn(
          `Procesando pago por clase para ${requestId} sin amountPaid. Flujo de pago al estudiante no implementado.`,
        );
        // throw new BadRequestException('Para "pago por clase", se espera `amountPaid` o se debe implementar la generación de pago al estudiante.');
      }

      // Llama a InscriptionsService para crear la inscripción formal
      // Pasamos el studentId de la solicitud de reserva
      const inscription = await this.inscriptionsService.createFromReservation(
        reservationRequest._id.toString(), // ID de la solicitud de reserva
        adminId,
        reservationRequest.studentId.toString(), // ID del estudiante de la solicitud
        targetClass, // El objeto Class completo
        processDto.paymentDetails, // paymentDetails del DTO del admin
      );
      reservationRequest.inscriptionId = inscription._id; // Enlazar la inscripción creada
    }

    return reservationRequest.save();
  }

  async cancelByUser(
    requestId: string,
    studentId: string,
  ): Promise<ReservationRequest> {
    const reservationRequest =
      await this.reservationRequestModel.findById(requestId);
    if (!reservationRequest) {
      throw new NotFoundException(
        `Solicitud de reserva con ID "${requestId}" no encontrada.`,
      );
    }
    if (reservationRequest.studentId.toString() !== studentId) {
      throw new BadRequestException(
        'No puedes cancelar una solicitud que no te pertenece.',
      );
    }
    if (reservationRequest.status !== ReservationRequestStatus.PENDING) {
      throw new BadRequestException(
        `Solo puedes cancelar solicitudes pendientes (estado actual: ${reservationRequest.status}).`,
      );
    }

    reservationRequest.status = ReservationRequestStatus.CANCELLED_BY_USER;
    return reservationRequest.save();
  }
}
