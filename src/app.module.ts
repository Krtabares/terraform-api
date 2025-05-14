import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PersonsModule } from './persons/persons.module';
import { AcademiesModule } from './academies/academies.module';
import { BackofficeModule } from './backoffice/backoffice.module';
import { SharedModule } from './shared/shared.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI!),
    AuthModule,
    PersonsModule,
    AcademiesModule,
    BackofficeModule,
    SharedModule,
    UsersModule,
  ],
})
export class AppModule {}
