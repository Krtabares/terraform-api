import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademiesController } from './academies.controller';
import { AcademiesService } from './academies.service';
import { Academy, AcademySchema } from './schemas/academy.schema';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([{ name: Academy.name, schema: AcademySchema }]),
  ],
  controllers: [AcademiesController],
  providers: [AcademiesService],
  exports: [AcademiesService],
})
export class AcademiesModule {}
