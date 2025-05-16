// src/academies/academies.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Academy, AcademyDocument } from './schemas/academy.schema'; // Asegúrate de importar AcademyDocument
import { CreateAcademyDto } from './dto/create-academy.dto';
import { UpdateAcademyDto } from './dto/update-academy.dto';

@Injectable()
export class AcademiesService {
  constructor(
    @InjectModel(Academy.name) private academyModel: Model<AcademyDocument>,
  ) {}

  async create(createAcademyDto: CreateAcademyDto): Promise<Academy> {
    const createdAcademy = new this.academyModel(createAcademyDto);
    return createdAcademy.save();
  }

  async findAll(): Promise<Academy[]> {
    return this.academyModel.find().exec();
  }

  async findOne(id: string): Promise<Academy> {
    const academy = await this.academyModel.findById(id).exec();
    if (!academy) {
      throw new NotFoundException(`Academy with ID "${id}" not found`);
    }
    return academy;
  }

  async update(
    id: string,
    updateAcademyDto: UpdateAcademyDto,
  ): Promise<Academy> {
    const updatedAcademy = await this.academyModel
      .findByIdAndUpdate(id, updateAcademyDto, { new: true })
      .exec();
    if (!updatedAcademy) {
      throw new NotFoundException(`Academy with ID "${id}" not found`);
    }
    return updatedAcademy;
  }

  async remove(id: string): Promise<{ deleted: boolean; message?: string }> {
    const result = await this.academyModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Academy with ID "${id}" not found`);
    }
    return {
      deleted: true,
      message: `Academy with ID "${id}" successfully deleted.`,
    };
  }
}
