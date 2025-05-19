// src/payments/payments.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
  PaymentItemType,
} from './schemas/payment.schema';
import { InscriptionsService } from '../inscriptions/inscriptions.service';
import { AcademiesService } from '../academies/academies.service'; // Opcional
import { ConfigService } from '@nestjs/config';
// import Stripe from 'stripe'; // Descomentar si usas Stripe

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  // private stripe: Stripe; // Descomentar si usas Stripe

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @Inject(forwardRef(() => InscriptionsService))
    private readonly inscriptionsService: InscriptionsService,
    private readonly academiesService: AcademiesService, // Ejemplo
    private readonly configService: ConfigService,
  ) {
    // this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), {
    //   apiVersion: '2023-10-16', // Usa la versión más reciente o la que necesites
    // });
  }

  async createPendingStudentPayment(
    studentId: string,
    itemId: string, // Puede ser classId o inscriptionId. Si es classId, inscriptionId irá en metadata
    amount: number,
    currency: string,
    processedByAdminId: string,
    description: string,
    itemType: PaymentItemType = PaymentItemType.CLASS_INSCRIPTION, // Default
    metadata?: Record<string, any>, // Para guardar inscriptionId si itemId es ClassId, o classId si itemId es InscriptionId
  ): Promise<PaymentDocument> {
    if (amount <= 0) {
      throw new BadRequestException('El monto del pago debe ser mayor a cero.');
    }

    // Opcional: Obtener academyId a partir del itemId (si es ClassId) o pasarlo como parámetro
    // const classDetails = await this.classesService.findOne(itemId); // Necesitarías ClassesService
    // const academyId = classDetails.academyId;
    // Por ahora, asumimos que academyId se infiere o se pasa en metadata o se obtiene de otra forma

    // Simulación de academyId, idealmente vendría de la clase o de la inscripción
    const simulatedAcademyId =
      metadata?.academyId || '60d5f3f5c8b9c8a0b8f00000'; // Placeholder

    const payment = new this.paymentModel({
      userId: new Types.ObjectId(studentId),
      itemId: new Types.ObjectId(itemId),
      itemType,
      academyId: new Types.ObjectId(simulatedAcademyId), // Asegúrate de tener este ID
      description,
      amount,
      currency,
      status: PaymentStatus.PENDING,
      processedByAdminId: new Types.ObjectId(processedByAdminId),
      paymentMethod: 'pending_student_action', // O 'stripe_pending' si vas a generar un intent
      metadata,
    });

    await payment.save();
    console.log(
      `Pago pendiente ${payment._id} creado para estudiante ${studentId} por ${description}`,
    );

    // Aquí podrías integrar con una pasarela de pago como Stripe para crear un PaymentIntent
    // y devolver el client_secret al frontend para que el estudiante pague.
    // Ejemplo conceptual con Stripe:
    /*
    try {
        const academyStripeAccountId = await this.getAcademyStripeAccountId(payment.academyId.toString()); // Necesitas una forma de obtener el Connect Account ID de la academia

        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe usa centavos
            currency: currency.toLowerCase(),
            description: description,
            receipt_email: studentEmail, // Necesitarías el email del estudiante
            metadata: {
                payment_id: payment._id.toString(),
                student_id: studentId,
                item_id: itemId,
                item_type: itemType,
                ...metadata
            },
            // Para Stripe Connect (si las academias tienen sus propias cuentas)
            // application_fee_amount: Math.round(amount * 100 * 0.05), // Ejemplo de comisión del 5% para la plataforma
            // transfer_data: {
            //  destination: academyStripeAccountId,
            // },
        },
        // Si usas Stripe Connect y la academia es la que recibe el pago:
        // { stripeAccount: academyStripeAccountId }
        );

        payment.gatewayPaymentIntentId = paymentIntent.id;
        await payment.save();

        console.log(`Stripe PaymentIntent ${paymentIntent.id} creado para pago ${payment._id}`);
        // Devolverías { clientSecret: paymentIntent.client_secret, paymentId: payment._id.toString() }
        // al InscriptionsService, que a su vez lo podría devolver al frontend del admin
        // para que el estudiante reciba un enlace de pago.

    } catch (error) {
        console.log(`Error creando Stripe PaymentIntent para pago ${payment._id}: ${error.message}`, error.stack);
        // Podrías marcar el pago como FAILED aquí o manejarlo de otra forma
        payment.status = PaymentStatus.FAILED;
        payment.metadata = { ...payment.metadata, error: error.message };
        await payment.save();
        throw new Error(`No se pudo iniciar el proceso de pago: ${error.message}`);
    }
    */

    // Por ahora, solo creamos el registro PENDING en nuestra BD.
    // El estudiante necesitaría una forma de ver sus pagos pendientes y "pagarlos".
    // O el admin le envía un enlace (si se integra pasarela).

    return payment;
  }

  // Método para manejar webhooks de Stripe (o cualquier pasarela)
  async handleStripeWebhook(event: any /* Stripe.Event */): Promise<void> {
    console.log(
      `Recibido evento de Stripe: ${event.id}, tipo: ${event.type}`,
    );
    const paymentIntent = event.data.object; // O charge, dependiendo del evento

    switch (event.type) {
      case 'payment_intent.succeeded':
        // paymentIntent.metadata.payment_id es el ID de nuestro documento Payment
        await this.processSuccessfulPayment(
          paymentIntent.metadata.payment_id,
          paymentIntent.id,
          paymentIntent.latest_charge,
        );
        break;
      case 'payment_intent.payment_failed':
        await this.processFailedPayment(
          paymentIntent.metadata.payment_id,
          paymentIntent.id,
          paymentIntent.last_payment_error?.message,
        );
        break;
      // ... manejar otros eventos como 'charge.succeeded', 'checkout.session.completed', etc.
      default:
        console.log(`Evento de Stripe no manejado: ${event.type}`);
    }
  }

  async processSuccessfulPayment(
    internalPaymentId: string,
    gatewayPaymentIntentId: string,
    gatewayChargeId?: string,
  ): Promise<void> {
    const payment = await this.paymentModel.findById(internalPaymentId);
    if (!payment) {
      console.log(
        `Pago ${internalPaymentId} no encontrado al procesar éxito de Stripe.`,
      );
      return; // O lanzar error
    }
    if (payment.status === PaymentStatus.COMPLETED) {
      console.log(
        `Pago ${internalPaymentId} ya está COMPLETED. Evento de Stripe duplicado?`,
      );
      return;
    }

    payment.status = PaymentStatus.COMPLETED;
    payment.gatewayPaymentIntentId = gatewayPaymentIntentId;
    if (gatewayChargeId) payment.gatewayChargeId = gatewayChargeId;
    payment.processedAt = new Date();
    payment.paymentMethod = 'stripe'; // O inferir del evento
    await payment.save();
    console.log(
      `Pago ${internalPaymentId} marcado como COMPLETED. Gateway Intent ID: ${gatewayPaymentIntentId}`,
    );

    // Notificar al InscriptionsService para actualizar el estado de la inscripción
    if (
      payment.itemType === PaymentItemType.CLASS_INSCRIPTION &&
      payment.metadata?.inscriptionId
    ) {
      try {
        await this.inscriptionsService.confirmPaymentAndUpdateStatus(
          payment.metadata.inscriptionId, // Asumimos que inscriptionId está en metadata
          payment._id.toString(),
        );
      } catch (error) {
        console.log(
          `Error al actualizar inscripción ${payment.metadata.inscriptionId} tras pago ${payment._id}: ${error.message}`,
        );
        // Considerar lógica de reintentos o marcado para revisión manual
      }
    } else if (
      payment.itemType === PaymentItemType.CLASS_INSCRIPTION &&
      payment.itemId
    ) {
      // Si itemId es el inscriptionId directamente
      try {
        await this.inscriptionsService.confirmPaymentAndUpdateStatus(
          payment.itemId.toString(),
          payment._id.toString(),
        );
      } catch (error) {
        console.log(
          `Error al actualizar inscripción ${payment.itemId} tras pago ${payment._id}: ${error.message}`,
        );
      }
    }
  }

  async processFailedPayment(
    internalPaymentId: string,
    gatewayPaymentIntentId: string,
    failureReason?: string,
  ): Promise<void> {
    const payment = await this.paymentModel.findById(internalPaymentId);
    if (!payment) {
      console.log(
        `Pago ${internalPaymentId} no encontrado al procesar fallo de Stripe.`,
      );
      return;
    }
    // No cambiar estado si ya está COMPLETED
    if (payment.status === PaymentStatus.COMPLETED) return;

    payment.status = PaymentStatus.FAILED;
    payment.gatewayPaymentIntentId = gatewayPaymentIntentId;
    payment.metadata = {
      ...payment.metadata,
      failureReason: failureReason || 'Unknown failure',
    };
    await payment.save();
    console.log(
      `Pago ${internalPaymentId} marcado como FAILED. Gateway Intent ID: ${gatewayPaymentIntentId}. Razón: ${failureReason}`,
    );
    // Opcional: Notificar al estudiante o al admin
  }

  // ... otros métodos: findPaymentById, findPaymentsByUser, processRefundForInscription, etc.
}
