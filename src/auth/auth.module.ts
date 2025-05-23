// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Para variables de entorno

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, UserSchema } from '../users/schemas/user.schema'; // Ajusta la ruta
import { UsersService } from '../users/users.service'; // Necesitarás un servicio de usuarios
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { MailModule } from 'src/mail/mail.module';
import { UsersModule } from 'src/users/users.module';
import { forwardRef } from '@nestjs/common';
import { PersonsModule } from 'src/persons/persons.module';

@Module({
  imports: [
    ConfigModule, // Asegúrate que ConfigModule esté importado globalmente o aquí
    // MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '3600s'), // ej. 1h, 7d
        },
      }),
    }),
    MailModule,
    UsersModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => PersonsModule), 
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersService, // Proveer UsersService aquí o importarlo desde un UsersModule
    JwtStrategy, // Estrategia para validar JWT
    LocalStrategy, // Estrategia para login (email/password)
  ],
  exports: [PassportModule, JwtModule, AuthService], // Exportar AuthService si es necesario en otros módulos
})
export class AuthModule {}
