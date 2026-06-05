import { prisma } from "../../../../shared/db/prisma";
export class PrismaWeightRepository {
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
    async findById(id) {
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
    async create(data) {
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
    async update(id, data) {
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
    async delete(id) {
        await prisma.diseaseSymptomWeight.delete({
            where: { id },
        });
    }
}
