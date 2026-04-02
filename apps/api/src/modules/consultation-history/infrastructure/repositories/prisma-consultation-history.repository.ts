import { prisma } from "../../../../shared/db/prisma";
import type { ConsultationHistoryRepository } from "../../domain/repositories/consultation-history.repository";

export class PrismaConsultationHistoryRepository
  implements ConsultationHistoryRepository
{
  async findAll() {
    const consultations = await prisma.consultation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        answers: {
          select: { id: true },
        },
        results: {
          select: { id: true },
        },
      },
    });

    return consultations.map((item) => ({
      id: item.id,
      childName: item.childName,
      childAgeMonths: item.childAgeMonths,
      gender: item.gender,
      createdAt: item.createdAt,
      answersCount: item.answers.length,
      resultsCount: item.results.length,
    }));
  }

  async findById(id: string) {
    return prisma.consultation.findUnique({
      where: { id },
      include: {
        answers: {
          orderBy: {
            symptom: { code: "asc" },
          },
          include: {
            symptom: {
              select: {
                id: true,
                code: true,
                name: true,
                questionText: true,
                category: true,
                isRedFlag: true,
              },
            },
          },
        },
        results: {
          orderBy: { rank: "asc" },
          include: {
            disease: {
              select: {
                id: true,
                code: true,
                name: true,
                advice: true,
                severityLevel: true,
              },
            },
          },
        },
      },
    });
  }
}