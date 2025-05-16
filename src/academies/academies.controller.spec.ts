import { Test, TestingModule } from '@nestjs/testing';
import { AcademiesController } from './academies.controller';

describe('AcademiesController', () => {
  let controller: AcademiesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AcademiesController],
    }).compile();

    controller = module.get<AcademiesController>(AcademiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
