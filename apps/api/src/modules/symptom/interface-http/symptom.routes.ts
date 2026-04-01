import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../admin/middleware/admin-auth";
import { ListSymptomsUseCase } from "../application/use-cases/list-symptoms.use-case";
import { GetSymptomByIdUseCase } from "../application/use-cases/get-symptom-by-id.use-case";
import { CreateSymptomUseCase } from "../application/use-cases/create-symptom.use-case";
import { UpdateSymptomUseCase } from "../application/use-cases/update-symptom.use-case";
import { DeleteSymptomUseCase } from "../application/use-cases/delete-symptom.use-case";
import { PrismaSymptomRepository } from "../infrastructure/repositories/prisma-symptom.repository";

export async function symptomRoutes(app: FastifyInstance) {
  app.get("/api/symptoms", async () => {
    const repository = new PrismaSymptomRepository();
    const useCase = new ListSymptomsUseCase(repository);
    const data = await useCase.execute();

    return {
      success: true,
      data: data.filter((item) => item.isActive),
    };
  });

  app.get("/api/admin/symptoms", { preHandler: requireAdmin }, async () => {
    const repository = new PrismaSymptomRepository();
    const useCase = new ListSymptomsUseCase(repository);
    const data = await useCase.execute();

    return {
      success: true,
      data,
    };
  });

  app.get("/api/admin/symptoms/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const repository = new PrismaSymptomRepository();
    const useCase = new GetSymptomByIdUseCase(repository);
    const data = await useCase.execute(id);

    if (!data) {
      return reply.status(404).send({
        success: false,
        message: "Gejala tidak ditemukan",
      });
    }

    return {
      success: true,
      data,
    };
  });

  app.post("/api/admin/symptoms", { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const repository = new PrismaSymptomRepository();
      const useCase = new CreateSymptomUseCase(repository);

      const data = await useCase.execute(request.body as any);

      return reply.status(201).send({
        success: true,
        message: "Gejala berhasil ditambahkan",
        data,
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : "Terjadi kesalahan",
      });
    }
  });

  app.put("/api/admin/symptoms/:id", { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const repository = new PrismaSymptomRepository();
      const useCase = new UpdateSymptomUseCase(repository);

      const data = await useCase.execute(id, request.body as any);

      return {
        success: true,
        message: "Gejala berhasil diperbarui",
        data,
      };
    } catch (error) {
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : "Terjadi kesalahan",
      });
    }
  });

  app.delete("/api/admin/symptoms/:id", { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const repository = new PrismaSymptomRepository();
      const useCase = new DeleteSymptomUseCase(repository);

      await useCase.execute(id);

      return {
        success: true,
        message: "Gejala berhasil dihapus",
      };
    } catch {
      return reply.status(400).send({
        success: false,
        message: "Gagal menghapus gejala",
      });
    }
  });
}