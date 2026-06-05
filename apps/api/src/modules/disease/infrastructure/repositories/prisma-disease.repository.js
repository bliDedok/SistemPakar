import { prisma } from "../../../../shared/db/prisma";
export class PrismaDiseaseRepository {
    async findAll() {
        return prisma.disease.findMany({
            orderBy: { code: "asc" },
        });
    }
    async findById(id) {
        return prisma.disease.findUnique({
            where: { id },
        });
    }
    async create(data) {
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
    async update(id, data) {
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
    async softDelete(id) {
        return prisma.disease.update({
            where: { id },
            data: {
                isActive: false,
            },
        });
    }
}
