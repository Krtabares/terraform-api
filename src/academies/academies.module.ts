import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademiesController } from './academies.controller';
import { AcademiesService } from './academies.service';
import { Academy, AcademySchema } from './schemas/academy.schema';
import { UsersModule } from 'src/users/users.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Academy.name, schema: AcademySchema }]),
    forwardRef(() => UsersModule),
  ],
  controllers: [AcademiesController],
  providers: [AcademiesService],
  exports: [AcademiesService],
})
export class AcademiesModule {}
