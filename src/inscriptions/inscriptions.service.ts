// src/inscriptions/inscriptions.service.ts
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
  Inscription,
  InscriptionDocument,
  InscriptionStatus,
  InscriptionPaymentType,
} from './schemas/inscription.schema';
import { AdminCreateInscriptionDto } from './dto/admin-create-inscription.dto';
import { AdminUpdateInscriptionDto } from './dto/admin-update-inscription.dto';
import { QueryInscriptionDto } from './dto/query-inscription.dto';
import { ClassesService } from '../classes/classes.service';
import { UsersService } from '../users/users.service';
import { PaymentsService } from '../payments/payments.service';
// import { MembershipsService } from '../memberships/memberships.service';
import { Class, ClassDocument } from '../classes/schemas/class.schema'; // Importar ClassDocument
import { AdminPaymentDetailsDto } from '../reservation-requests/dto/process-reservation-request.dto'; // Reutilizar DTO

@Injectable()
export class InscriptionsService {
  private readonly logger = new Logger(InscriptionsService.name);

  constructor(
    @InjectModel(Inscription.name)
    private inscriptionModel: Model<InscriptionDocument>,
    private readonly classesService: ClassesService,
    private readonly usersService: UsersService, // Para validar studentId y adminId
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    // @Inject(forwardRef(() => MembershipsService))
    // private readonly membershipsService: MembershipsService, // Descomentar cuando exista
  ) {}

  /**
   * Método principal para crear una inscripción, ya sea directamente o desde una reserva.
   * Este método encapsula la lógica de validación y manejo de pagos.
   */
  private async _createInscriptionLogic(
    studentId: string,
    classId: string,
    processedByAdminId: string,
    paymentType: InscriptionPaymentType,
    paymentRelatedDetails: {
      // Un objeto para agrupar detalles relacionados con el pago
      amountPaid?: number;
      currency?: string;
      userMembershipId?: string;
      reservationRequestId?: string;
      adminNotes?: string;
    },
  ): Promise<Inscription> {
    const studentObjectId = new Types.ObjectId(studentId);
    const classObjectId = new Types.ObjectId(classId);
    const adminObjectId = new Types.ObjectId(processedByAdminId);

    // 1. Validar existencia de estudiante y admin
    await this.usersService.findById(studentId); // Asume que findOne lanza NotFoundException
    await this.usersService.findById(processedByAdminId);

    // 2. Validar y obtener la clase
    const targetClass = (await this.classesService.findOne(
      classId,
    )) as ClassDocument; //findOne ya lanza error si no existe
    if (!targetClass.isActive) {
      throw new BadRequestException('La clase seleccionada no está activa.');
    }

    // 3. Verificar si ya existe una inscripción activa para este estudiante y clase
    const existingInscription = await this.findActiveByStudentAndClass(
      studentId,
      classId,
    );
    if (existingInscription) {
      throw new ConflictException(
        'El estudiante ya está inscrito en esta clase.',
      );
    }

    // 4. Verificar y decrementar capacidad de la clase
    const canEnroll =
      await this.classesService.checkAndDecrementCapacity(classId);
    if (!canEnroll) {
      throw new ConflictException(
        `No hay capacidad disponible en la clase "${targetClass.name}".`,
      );
    }

    // 5. Construir el documento de Inscripción
    const newInscriptionData: Partial<Inscription> = {
      studentId: studentObjectId,
      classId: classObjectId,
      academyId: targetClass.academyId,
      processedByAdminId: adminObjectId,
      status: InscriptionStatus.CONFIRMED, // Estado inicial por defecto
      paymentType: paymentType,
      adminNotes: paymentRelatedDetails.adminNotes,
      reservationRequestId: paymentRelatedDetails.reservationRequestId
        ? new Types.ObjectId(paymentRelatedDetails.reservationRequestId)
        : undefined,
    };

    // 6. Lógica específica según InscriptionPaymentType
    switch (paymentType) {
      case InscriptionPaymentType.PAID_PER_CLASS:
        if (targetClass.price && targetClass.price > 0) {
          if (
            paymentRelatedDetails.amountPaid !== undefined &&
            paymentRelatedDetails.currency
          ) {
            // Admin registró el pago manualmente
            newInscriptionData.amountPaid = paymentRelatedDetails.amountPaid;
            newInscriptionData.currency = paymentRelatedDetails.currency;
            // Opcional: Crear un registro de Payment con estado COMPLETED
            // await this.paymentsService.createCompletedManualPayment(...);
          } else {
            // Generar un pago pendiente para el estudiante
            this.logger.log(
              `Generando pago pendiente para estudiante ${studentId} en clase ${classId}`,
            );
            const payment =
              await this.paymentsService.createPendingStudentPayment(
                studentId,
                targetClass._id.toString(), // classId
                targetClass.price,
                targetClass.currency || 'USD', // Usar moneda de la clase o default
                processedByAdminId, // Admin que generó
                `Inscripción a clase: ${targetClass.name}`,
              );
            newInscriptionData.paymentId = payment._id;
            newInscriptionData.status = InscriptionStatus.PENDING_PAYMENT; // Cambiar estado si el pago está pendiente
          }
        } else {
          // La clase es gratuita pero se marcó como PAID_PER_CLASS, podría ser un error o interpretarse como cortesía.
          this.logger.warn(
            `Clase ${classId} marcada como PAID_PER_CLASS pero no tiene precio. Tratando como COMPLIMENTARY.`,
          );
          newInscriptionData.paymentType = InscriptionPaymentType.COMPLIMENTARY; // Corregir tipo
        }
        break;

      case InscriptionPaymentType.MEMBERSHIP:
        if (!paymentRelatedDetails.userMembershipId) {
          await this.classesService.incrementCapacity(classId); // Revertir decremento
          throw new BadRequestException(
            'Se requiere userMembershipId para el tipo de pago MEMBERSHIP.',
          );
        }
        // const isValidMembership = await this.membershipsService.useMembershipForClass(
        //   studentId,
        //   paymentRelatedDetails.userMembershipId,
        //   classId,
        // );
        // if (!isValidMembership) {
        //   await this.classesService.incrementCapacity(classId); // Revertir decremento
        //   throw new BadRequestException('Membresía no válida, expirada, sin créditos o no aplicable a esta clase.');
        // }
        // newInscriptionData.userMembershipId = new Types.ObjectId(paymentRelatedDetails.userMembershipId);
        this.logger.warn(
          `Módulo de membresías no implementado completamente. Asumiendo validez para ${paymentRelatedDetails.userMembershipId}.`,
        );
        newInscriptionData.userMembershipId = new Types.ObjectId(
          paymentRelatedDetails.userMembershipId,
        ); // Temporal
        break;

      case InscriptionPaymentType.COMPLIMENTARY:
        // No se necesita acción adicional de pago.
        break;

      default:
        await this.classesService.incrementCapacity(classId); // Revertir decremento
        throw new BadRequestException(
          `Tipo de pago no soportado: ${paymentType}`,
        );
    }

    // 7. Guardar la inscripción
    const newInscription = new this.inscriptionModel(newInscriptionData);
    try {
      const savedInscription = await newInscription.save();
      this.logger.log(
        `Inscripción ${savedInscription._id} creada para estudiante ${studentId} en clase ${classId}.`,
      );
      // Opcional: Enviar notificaciones al estudiante y/o admin
      return savedInscription;
    } catch (error) {
      // Si falla el guardado de la inscripción, revertir el decremento de capacidad
      await this.classesService.incrementCapacity(classId);
      this.logger.error(
        `Error al guardar inscripción: ${error.message}`,
        error.stack,
      );
      if (error.code === 11000) {
        // Error de índice único (studentId y classId)
        throw new ConflictException(
          'El estudiante ya está inscrito en esta clase (error de duplicado en BD).',
        );
      }
      throw error;
    }
  }

  /**
   * Llamado por ReservationRequestsService cuando un admin aprueba una solicitud.
   */
  async createFromReservation(
    reservationRequestId: string,
    adminId: string,
    studentIdFromReservation: string, // ID del estudiante de la solicitud de reserva
    targetClassFromReservation: ClassDocument | Class, // Objeto Class completo de la reserva
    paymentDetails?: AdminPaymentDetailsDto, // Detalles de pago que el admin provee
  ): Promise<Inscription> {
    this.logger.log(
      `Creando inscripción desde reserva ${reservationRequestId} por admin ${adminId}`,
    );

    if (
      !paymentDetails &&
      targetClassFromReservation.price &&
      targetClassFromReservation.price > 0
    ) {
      throw new BadRequestException(
        'Se requieren detalles de pago (paymentDetails) para aprobar una solicitud de una clase con costo.',
      );
    }

    const paymentRelatedDetails = {
      amountPaid: paymentDetails?.amountPaid,
      currency: paymentDetails?.currency,
      userMembershipId: paymentDetails?.userMembershipId,
      reservationRequestId: reservationRequestId, // Guardar el ID de la reserva
      adminNotes: paymentDetails?.adminNotes, // Si el DTO de reserva lo incluye o se pasa aparte
    };

    // paymentType debe venir de paymentDetails
    if (
      !paymentDetails?.paymentType &&
      targetClassFromReservation.price &&
      targetClassFromReservation.price > 0
    ) {
      throw new BadRequestException(
        'Falta paymentType en paymentDetails para una clase con costo.',
      );
    }
    const paymentTypeToUse =
      paymentDetails?.paymentType || InscriptionPaymentType.COMPLIMENTARY;

    return this._createInscriptionLogic(
      studentIdFromReservation,
      targetClassFromReservation._id.toString(),
      adminId,
      paymentTypeToUse,
      paymentRelatedDetails,
    );
  }

  /**
   * Admin inscribe a un estudiante directamente sin una solicitud de reserva previa.
   */
  async adminCreateDirectInscription(
    adminId: string,
    dto: AdminCreateInscriptionDto,
  ): Promise<Inscription> {
    this.logger.log(
      `Admin ${adminId} creando inscripción directa para estudiante ${dto.studentId} en clase ${dto.classId}`,
    );

    const paymentRelatedDetails = {
      amountPaid: dto.amountPaid,
      currency: dto.currency,
      userMembershipId: dto.userMembershipId,
      adminNotes: dto.adminNotes,
    };

    return this._createInscriptionLogic(
      dto.studentId,
      dto.classId,
      adminId,
      dto.paymentType,
      paymentRelatedDetails,
    );
  }

  async findActiveByStudentAndClass(
    studentId: string,
    classId: string,
  ): Promise<InscriptionDocument | null> {
    return this.inscriptionModel
      .findOne({
        studentId: new Types.ObjectId(studentId),
        classId: new Types.ObjectId(classId),
        status: {
          $in: [
            InscriptionStatus.CONFIRMED,
            InscriptionStatus.PENDING_PAYMENT,
            InscriptionStatus.ATTENDED,
          ],
        }, // Estados considerados "activos"
      })
      .exec();
  }

  async findAllForAdmin(
    queryDto: QueryInscriptionDto,
  ): Promise<{
    data: Inscription[];
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
      paymentType,
      sortBy,
    } = queryDto;
    const skip = (page - 1) * limit;
    const query: FilterQuery<InscriptionDocument> = {};

    if (academyId) query.academyId = new Types.ObjectId(academyId);
    if (classId) query.classId = new Types.ObjectId(classId);
    if (studentId) query.studentId = new Types.ObjectId(studentId);
    if (status) query.status = status;
    if (paymentType) query.paymentType = paymentType;

    let sortOptions: { [key: string]: SortOrder } = { createdAt: -1 };
    if (sortBy) {
      const [field, order] = sortBy.split(':') as [string, SortOrder];
      if (field && order) sortOptions = { [field]: order === 'desc' ? -1 : 1 };
    }

    const inscriptions = await this.inscriptionModel
      .find(query)
      .populate('studentId', 'name email')
      .populate('classId', 'name startTime price currency')
      .populate('academyId', 'name')
      .populate('processedByAdminId', 'name')
      .populate('paymentId', 'status amount') // Si quieres info del pago
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    const count = await this.inscriptionModel.countDocuments(query);
    return {
      data: inscriptions,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
    };
  }

  async findMyInscriptions(
    studentId: string,
    queryDto: QueryInscriptionDto,
  ): Promise<{
    data: Inscription[];
    count: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 10, status, sortBy } = queryDto; // Estudiante solo puede filtrar por status y ordenar
    const skip = (page - 1) * limit;
    const query: FilterQuery<InscriptionDocument> = {
      studentId: new Types.ObjectId(studentId),
    };
    if (status) query.status = status;

    let sortOptions: { [key: string]: SortOrder } = { createdAt: -1 };
    if (sortBy) {
      const [field, order] = sortBy.split(':') as [string, SortOrder];
      if (field && order) sortOptions = { [field]: order === 'desc' ? -1 : 1 };
    }

    const inscriptions = await this.inscriptionModel
      .find(query)
      .populate('classId', 'name startTime academyId') // Popula academyId desde Class
      .populate({
        path: 'classId',
        select: 'name startTime academyId', // Campos que quieres de Class
        populate: {
          path: 'academyId', // Poblar la academia dentro de la clase
          select: 'name', // Campos que quieres de Academy
        },
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    const count = await this.inscriptionModel.countDocuments(query);
    return {
      data: inscriptions,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
    };
  }

  async findOneForAdmin(id: string): Promise<InscriptionDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID de inscripción inválido.');
    const inscription = await this.inscriptionModel
      .findById(id)
      .populate('studentId', 'name email')
      .populate('classId') // Populate completo para tener todos los datos de la clase
      .populate('academyId', 'name')
      .populate('processedByAdminId', 'name')
      .populate('paymentId')
      .populate('userMembershipId')
      .exec();
    if (!inscription) {
      throw new NotFoundException(`Inscripción con ID "${id}" no encontrada.`);
    }
    return inscription;
  }

  async adminUpdateInscription(
    id: string,
    adminId: string,
    dto: AdminUpdateInscriptionDto,
  ): Promise<Inscription> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID de inscripción inválido.');
    const inscription = await this.findOneForAdmin(id); // Reutiliza para obtener y validar

    // Validar que el admin que actualiza pertenece a la misma academia o tiene permisos
    // (Lógica de autorización más fina si es necesaria)

    if (dto.status) {
      // Solo permitir ciertos cambios de estado aquí, ej. marcar asistencia
      if (
        ![InscriptionStatus.ATTENDED, InscriptionStatus.NO_SHOW].includes(
          dto.status,
        )
      ) {
        throw new BadRequestException(
          `No se permite cambiar el estado a "${dto.status}" a través de este endpoint.`,
        );
      }
      // No permitir cambiar estado si ya está cancelada, etc.
      if (inscription.status === InscriptionStatus.CANCELLED_BY_ADMIN) {
        throw new BadRequestException(
          'No se puede modificar una inscripción cancelada.',
        );
      }
      inscription.status = dto.status;
    }

    if (dto.adminNotes) {
      inscription.adminNotes =
        `${inscription.adminNotes || ''}\n[${new Date().toISOString()} por ${adminId}]: ${dto.adminNotes}`.trim();
    }
    inscription.processedByAdminId = new Types.ObjectId(adminId); // Registrar quién hizo el último cambio

    return inscription.save();
  }

  async adminCancelInscription(
    id: string,
    adminId: string,
    reason?: string,
  ): Promise<Inscription> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('ID de inscripción inválido.');
    const inscription = await this.findOneForAdmin(id);

    if (inscription.status === InscriptionStatus.CANCELLED_BY_ADMIN) {
      throw new BadRequestException('La inscripción ya está cancelada.');
    }

    // 1. Incrementar capacidad de la clase
    await this.classesService.incrementCapacity(
      inscription.classId._id.toString(),
    );

    // 2. Actualizar estado de la inscripción
    inscription.status = InscriptionStatus.CANCELLED_BY_ADMIN;
    const cancellationNote = `Cancelada por admin ${adminId} el ${new Date().toISOString()}${reason ? '. Razón: ' + reason : '.'}`;
    inscription.adminNotes =
      `${inscription.adminNotes || ''}\n${cancellationNote}`.trim();
    inscription.processedByAdminId = new Types.ObjectId(adminId);

    // 3. Lógica de Reembolso (si aplica)
    if (
      inscription.paymentId &&
      inscription.paymentType === InscriptionPaymentType.PAID_PER_CLASS
    ) {
      // this.logger.log(`Iniciando proceso de reembolso para el pago ${inscription.paymentId}`);
      // await this.paymentsService.processRefundForInscription(inscription.paymentId.toString(), inscription._id.toString());
      this.logger.warn(
        `Proceso de reembolso para pago ${inscription.paymentId} no implementado completamente.`,
      );
    }
    // Si es por membresía, podrías devolver el crédito si tu lógica de membresía lo permite
    // if (inscription.userMembershipId && inscription.paymentType === InscriptionPaymentType.MEMBERSHIP) {
    //   await this.membershipsService.refundCreditFromCancelledInscription(inscription.userMembershipId.toString(), inscription.classId.toString());
    // }

    return inscription.save();
  }

  // Método para actualizar el estado de una inscripción después de un pago (llamado por PaymentsService)
  async confirmPaymentAndUpdateStatus(
    inscriptionId: string,
    paymentId: string,
  ): Promise<Inscription> {
    const inscription = await this.inscriptionModel.findById(inscriptionId);
    if (!inscription) {
      this.logger.error(
        `confirmPaymentAndUpdateStatus: Inscripción ${inscriptionId} no encontrada.`,
      );
      throw new NotFoundException(
        `Inscripción ${inscriptionId} no encontrada.`,
      );
    }

    if (inscription.status !== InscriptionStatus.PENDING_PAYMENT) {
      this.logger.warn(
        `confirmPaymentAndUpdateStatus: Inscripción ${inscriptionId} no está en PENDING_PAYMENT (actual: ${inscription.status}). No se actualiza.`,
      );
      return inscription; // O lanzar error si se espera que siempre esté pendiente
    }

    inscription.status = InscriptionStatus.CONFIRMED;
    inscription.paymentId = new Types.ObjectId(paymentId); // Asegurarse que esté el paymentId
    this.logger.log(
      `confirmPaymentAndUpdateStatus: Inscripción ${inscriptionId} actualizada a CONFIRMED por pago ${paymentId}.`,
    );
    return inscription.save();
  }
}
