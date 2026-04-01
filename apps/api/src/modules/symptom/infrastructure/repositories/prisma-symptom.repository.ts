import { prisma } from "../../../../shared/db/prisma";
import type { SymptomRepository } from "../../domain/repositories/symptom.repository";

export class PrismaSymptomRepository implements SymptomRepository {
  async findAll() {
    return prisma.symptom.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });
  }
}