// src/persons/persons.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';
import { Person, PersonSchema } from './schemas/person.schema';
import { PersonAcademyMembershipsModule } from 'src/person-academy-memberships/person-academy-memberships.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Person.name, schema: PersonSchema }]),
    forwardRef(() => PersonAcademyMembershipsModule), // Para inyectar PAMService en PersonsService
  ],
  controllers: [PersonsController],
  providers: [PersonsService],
  exports: [PersonsService]
})
export class PersonsModule {}