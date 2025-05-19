// src/payments/payments.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { InscriptionsModule } from '../inscriptions/inscriptions.module'; // Para actualizar estado de inscripción
import { AcademiesModule } from '../academies/academies.module'; // Si necesitas info de la academia para el pago
import { ConfigModule } from '@nestjs/config'; // Para claves de API de Stripe, etc.
import { AcademiesService } from 'src/academies/academies.service';
import { Academy, AcademySchema } from 'src/academies/schemas/academy.schema';

@Module({
  imports: [
    ConfigModule, // Asegúrate de tenerlo configurado en AppModule
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Academy.name, schema: AcademySchema },
    ]),
    forwardRef(() => InscriptionsModule),
    AcademiesModule, // Si necesitas, por ejemplo, la moneda por defecto de la academia
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
