// src/inscriptions/inscriptions.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InscriptionsController } from './inscriptions.controller';
import { InscriptionsService } from './inscriptions.service';
import { Inscription, InscriptionSchema } from './schemas/inscription.schema';
import { ClassesModule } from '../classes/classes.module'; // Para interactuar con clases (capacidad, precio)
import { UsersModule } from '../users/users.module'; // Para validar existencia de estudiante/admin
import { UsersService } from 'src/users/users.service';
import { PaymentsModule } from '../payments/payments.module'; // Para generar pagos pendientes
// import { MembershipsModule } from '../memberships/memberships.module'; // Cuando lo tengas

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Inscription.name, schema: InscriptionSchema },
    ]),
    ClassesModule,
    UsersModule, // Asumiendo que tienes un UsersService para validar usuarios
    forwardRef(() => PaymentsModule), // Para evitar dependencia circular si PaymentsModule importa este
    // forwardRef(() => MembershipsModule), // Descomentar cuando exista
  ],
  controllers: [InscriptionsController],
  providers: [InscriptionsService],
  exports: [InscriptionsService], // Importante para ReservationRequestsModule
})
export class InscriptionsModule {}
