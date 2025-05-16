import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { seedRootUser } from './seeder';
import { UsersService } from './users/users.service';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Configura CORS según tus necesidades

  // Configurar un prefijo global para todas las rutas
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Solo permite propiedades definidas en los DTOs
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
      transform: true, // Transforma el payload a instancias de DTO
      transformOptions: {
        enableImplicitConversion: true, // Permite conversión implícita de tipos
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Terraform API')
    .setDescription('Documentación de la API del sistema educativo Terraform')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',
    ) // importante si usas JWT
    .addServer('/api')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    // <--- Ruta para la UI de Swagger (ej. /api-docs)
    swaggerOptions: {
      persistAuthorization: true, // Mantiene la autorización JWT entre recargas
    },
  });

  const configService = app.get(ConfigService);
  const usersService = app.get(UsersService);
  await seedRootUser(usersService);

  await app.listen(configService.get('PORT') || 3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`API available with prefix /api`);
  console.log(`Swagger UI available at: ${await app.getUrl()}/api-docs`);
}
bootstrap();
