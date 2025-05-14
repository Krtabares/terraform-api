// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  async create(data: { email: string; password: string; roles?: string[] }) {
    const hash = await bcrypt.hash(data.password, 10);
    const created = new this.userModel({
      email: data.email,
      password: hash,
      roles: data.roles ?? ['alumno'],
    });
    return created.save();
  }

  async validatePassword(plain: string, hashed: string) {
    return bcrypt.compare(plain, hashed);
  }
}
