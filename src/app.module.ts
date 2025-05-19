import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PersonsModule } from './persons/persons.module';
import { AcademiesModule } from './academies/academies.module';
import { BackofficeModule } from './backoffice/backoffice.module';
import { SharedModule } from './shared/shared.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { join } from 'path'; 
import { ClassesModule } from './classes/classes.module';
import { ReservationRequestsModule } from './reservation-requests/reservation-requests.module';
import { InscriptionsModule } from './inscriptions/inscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { PersonAcademyMembershipsModule } from './person-academy-memberships/person-academy-memberships.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    MongooseModule.forRoot(process.env.MONGO_URI!),
    MailerModule.forRootAsync({
      imports: [ConfigModule], // Importar ConfigModule para usar ConfigService
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST', 'smtp.example.com'),
          port: configService.get<number>('MAIL_PORT', 587),
          secure: configService.get<string>('MAIL_SECURE', 'false') === 'true', // true para 465, false para otros puertos
          auth: {
            user: configService.get<string>('MAIL_USER', 'user@example.com'),
            pass: configService.get<string>('MAIL_PASS', 'yourpassword'),
          },
          // Opciones adicionales para el transporte (ej. ignorar TLS para desarrollo local con MailHog/Mailtrap)
          // tls: {
          //   rejectUnauthorized: configService.get<string>('MAIL_TLS_REJECT_UNAUTHORIZED', 'true') === 'true',
          // },
        },
        defaults: {
          from: `"${configService.get<string>('MAIL_FROM_NAME', 'AcademiaFlow No Reply')}" <${configService.get<string>('MAIL_FROM_ADDRESS', 'noreply@example.com')}>`,
        },
        template: {
          dir: join(__dirname, '..', 'mail', 'templates'), // Ruta a tus plantillas de correo
          adapter: new HandlebarsAdapter(), // O PugAdapter, EjsAdapter
          options: {
            strict: true, // Variables no definidas en el contexto lanzarán error
          },
        },
        // Preview email en el navegador (para desarrollo) - Descomenta si quieres
        // preview: configService.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    AuthModule,
    AcademiesModule,
    PersonsModule,
    PersonAcademyMembershipsModule,
    BackofficeModule,
    SharedModule,
    UsersModule,
    MailModule,
    ClassesModule,
    ReservationRequestsModule,
    InscriptionsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
