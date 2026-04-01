import { prisma } from "../../../../shared/db/prisma";
import type {
  CreateWeightInput,
  UpdateWeightInput,
  WeightRepository,
} from "../../domain/repositories/weight.repository";

export class PrismaWeightRepository implements WeightRepository {
  async findAll() {
    return prisma.diseaseSymptomWeight.findMany({
      include: {
        disease: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        symptom: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [
        { disease: { code: "asc" } },
        { symptom: { code: "asc" } },
      ],
    });
  }

  async findById(id: string) {
    return prisma.diseaseSymptomWeight.findUnique({
      where: { id },
      include: {
        disease: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        symptom: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async create(data: CreateWeightInput) {
    return prisma.diseaseSymptomWeight.create({
      data: {
        diseaseId: data.diseaseId,
        symptomId: data.symptomId,
        cfExpert: data.cfExpert,
        note: data.note ?? null,
      },
      include: {
        disease: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        symptom: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateWeightInput) {
    return prisma.diseaseSymptomWeight.update({
      where: { id },
      data: {
        diseaseId: data.diseaseId,
        symptomId: data.symptomId,
        cfExpert: data.cfExpert,
        note: data.note,
      },
      include: {
        disease: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        symptom: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    await prisma.diseaseSymptomWeight.delete({
      where: { id },
    });
  }
}