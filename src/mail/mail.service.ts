import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer'; // Renombrar para evitar colisión
import { ConfigService } from '@nestjs/config';

// Interfaz para el contexto de las plantillas (opcional pero útil)
interface MailContext {
  [key: string]: any; // Permite cualquier propiedad
  name?: string;
  resetUrl?: string;
  activationUrl?: string;
  // ... otras variables comunes para tus plantillas
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly fromAddress: string;
  private readonly fromName: string;

  constructor(
    private readonly nestMailerService: NestMailerService, // Usar el nombre renombrado
    private readonly configService: ConfigService,
  ) {
    this.fromName = this.configService.get<string>(
      'MAIL_FROM_NAME',
      'Terraform',
    );
    this.fromAddress = this.configService.get<string>(
      'MAIL_FROM_ADDRESS',
      'noreply@example.com',
    );
  }

  async sendUserWelcomeEmail(
    email: string,
    name: string,
    activationUrl: string,
  ): Promise<void> {
    const subject = `¡Bienvenido a ${this.fromName}, ${name}!`;
    const template = 'welcome'; // Nombre del archivo de plantilla (ej. welcome.hbs)
    const context: MailContext = {
      name,
      activationUrl,
      appName: this.fromName,
    };

    await this.sendEmail(email, subject, template, context);
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetUrl: string,
  ): Promise<void> {
    const subject = `Restablecimiento de Contraseña - ${this.fromName}`;
    const template = 'password-reset'; // Nombre del archivo de plantilla (ej. password-reset.hbs)
    const context: MailContext = {
      name,
      resetUrl,
      appName: this.fromName,
    };

    await this.sendEmail(email, subject, template, context);
  }

  // Método genérico para enviar correos
  private async sendEmail(
    to: string,
    subject: string,
    template: string, // Nombre de la plantilla sin extensión
    context: MailContext,
  ): Promise<void> {
    try {
      await this.nestMailerService.sendMail({
        to: to,
        // from: `"${this.fromName}" <${this.fromAddress}>`, // Ya está en defaults, pero puedes sobreescribir
        subject: subject,
        template: template, // el .hbs se añade automáticamente por el adapter
        context: context, // variables para la plantilla
      });
      this.logger.log(
        `Email enviado a ${to} con asunto "${subject}" usando plantilla "${template}"`,
      );
    } catch (error) {
      this.logger.error(
        `Error al enviar email a ${to} con asunto "${subject}": ${error.message}`,
        error.stack,
      );
      // Puedes decidir si relanzar el error o manejarlo aquí.
      // No lanzar errores al cliente por fallos de email usualmente,
      // a menos que sea crítico para el flujo (ej. verificación de email obligatoria).
      // throw new InternalServerErrorException('No se pudo enviar el correo electrónico.');
    }
  }

  // También puedes tener un método para enviar correos sin plantilla (texto plano o HTML directo)
  async sendRawEmail(
    to: string,
    subject: string,
    htmlBody: string,
    textBody?: string,
  ): Promise<void> {
    try {
      await this.nestMailerService.sendMail({
        to: to,
        subject: subject,
        html: htmlBody,
        text: textBody,
      });
      this.logger.log(`Email (raw) enviado a ${to} con asunto "${subject}"`);
    } catch (error) {
      this.logger.error(
        `Error al enviar email (raw) a ${to} con asunto "${subject}": ${error.message}`,
        error.stack,
      );
    }
  }
}
