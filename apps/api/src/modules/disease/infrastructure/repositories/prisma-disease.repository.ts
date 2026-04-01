import { prisma } from "../../../../shared/db/prisma";
import type {
  CreateDiseaseInput,
  DiseaseRepository,
  UpdateDiseaseInput,
} from "../../domain/repositories/disease.repository";

export class PrismaDiseaseRepository implements DiseaseRepository {
  async findAll() {
    return prisma.disease.findMany({
      orderBy: { code: "asc" },
    });
  }

  async findById(id: string) {
    return prisma.disease.findUnique({
      where: { id },
    });
  }

  async create(data: CreateDiseaseInput) {
    return prisma.disease.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        advice: data.advice ?? null,
        severityLevel: data.severityLevel ?? null,
        sourceUrl: data.sourceUrl ?? null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(id: string, data: UpdateDiseaseInput) {
    return prisma.disease.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        advice: data.advice,
        severityLevel: data.severityLevel,
        sourceUrl: data.sourceUrl,
        isActive: data.isActive,
      },
    });
  }

  async softDelete(id: string) {
    return prisma.disease.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}