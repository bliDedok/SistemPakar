import { prisma } from "../../../../shared/db/prisma";
import type {
  CreateSymptomInput,
  SymptomRepository,
  UpdateSymptomInput,
} from "../../domain/repositories/symptom.repository";

export class PrismaSymptomRepository implements SymptomRepository {
  async findAll() {
    return prisma.symptom.findMany({
      orderBy: { code: "asc" },
    });
  }

  async findById(id: string) {
    return prisma.symptom.findUnique({
      where: { id },
    });
  }

  async create(data: CreateSymptomInput) {
    return prisma.symptom.create({
      data: {
        code: data.code,
        name: data.name,
        questionText: data.questionText,
        category: data.category ?? null,
        isRedFlag: data.isRedFlag ?? false,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(id: string, data: UpdateSymptomInput) {
    return prisma.symptom.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        questionText: data.questionText,
        category: data.category,
        isRedFlag: data.isRedFlag,
        isActive: data.isActive,
      },
    });
  }

  async delete(id: string) {
    await prisma.symptom.delete({
      where: { id },
    });
  }
}