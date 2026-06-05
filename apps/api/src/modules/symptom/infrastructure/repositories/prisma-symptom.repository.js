import { prisma } from "../../../../shared/db/prisma";
export class PrismaSymptomRepository {
    async findAll() {
        return prisma.symptom.findMany({
            orderBy: { code: "asc" },
        });
    }
    async findById(id) {
        return prisma.symptom.findUnique({
            where: { id },
        });
    }
    async create(data) {
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
    async update(id, data) {
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
    async delete(id) {
        await prisma.symptom.delete({
            where: { id },
        });
    }
}
