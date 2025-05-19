// src/reservation-requests/reservation-requests.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationRequestsController } from './reservation-requests.controller';
import { ReservationRequestsService } from './reservation-requests.service';
import {
  ReservationRequest,
  ReservationRequestSchema,
} from './schemas/reservation-request.schema';
import { ClassesModule } from '../classes/classes.module'; // Para validar la clase
import { InscriptionsModule } from '../inscriptions/inscriptions.module'; // Para crear inscripción

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReservationRequest.name, schema: ReservationRequestSchema },
    ]),
    ClassesModule, // Importar para usar ClassesService
    forwardRef(() => InscriptionsModule), // Para evitar dependencia circular si InscriptionsModule también importa este
  ],
  controllers: [ReservationRequestsController],
  providers: [ReservationRequestsService],
  exports: [ReservationRequestsService], // Si otro módulo lo necesita
})
export class ReservationRequestsModule {}
