// src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
// MailerModule ya está configurado globalmente o en AppModule,
// por lo que MailService puede inyectar MailerService de @nestjs-modules/mailer.

@Module({
  providers: [MailService],
  exports: [MailService], // Exportar para que otros servicios (como AuthService) puedan usarlo
})
export class MailModule {}