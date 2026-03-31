import { prisma } from "../../../../shared/db/prisma.js";

export class PrismaSymptomRepository {
  async findAll() {
    return prisma.symptom.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        questionText: true,
        description: true,
      },
      orderBy: {
        code: "asc",
      },
    });
  }
}