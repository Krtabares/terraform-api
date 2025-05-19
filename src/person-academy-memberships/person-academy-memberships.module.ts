// src/person-academy-memberships/person-academy-memberships.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PersonAcademyMembershipsService } from './person-academy-memberships.service';
import {
  PersonAcademyMembership,
  PersonAcademyMembershipSchema,
} from './schemas/person-academy-membership.schema';
import { PersonsModule } from 'src/persons/persons.module';
import { AcademiesModule } from 'src/academies/academies.module';

// NO necesitas importar los servicios aquí si solo los inyectas en PAMService

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PersonAcademyMembership.name,
        schema: PersonAcademyMembershipSchema,
      },
    ]),
    forwardRef(() => PersonsModule), // Para inyectar PersonsService en PAMService
    AcademiesModule,                 // Para inyectar AcademiesService en PAMService
  ],
  providers: [
    PersonAcademyMembershipsService, // Solo provee el servicio que DEFINE este módulo
  ],
  exports: [PersonAcademyMembershipsService],
})
export class PersonAcademyMembershipsModule {}