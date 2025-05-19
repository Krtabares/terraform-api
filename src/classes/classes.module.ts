// src/classes/classes.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { Class, ClassSchema } from './schemas/class.schema';
// Si tienes un UsersModule para validar teacherId o studentId
import { UsersModule } from '../users/users.module'; // Ajusta la ruta
import { UsersService } from 'src/users/users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Class.name, schema: ClassSchema }]),
    UsersModule, // Si necesitas inyectar UsersService para validaciones
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService], // Exporta el servicio si otros módulos lo necesitan (ej. InscriptionsModule)
})
export class ClassesModule {}