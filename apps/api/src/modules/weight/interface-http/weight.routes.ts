import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../admin/middleware/admin-auth";
import { ListWeightsUseCase } from "../application/use-cases/list-weights.use-case";
import { GetWeightByIdUseCase } from "../application/use-cases/get-weight-by-id.use-case";
import { CreateWeightUseCase } from "../application/use-cases/create-weight.use-case";
import { UpdateWeightUseCase } from "../application/use-cases/update-weight.use-case";
import { DeleteWeightUseCase } from "../application/use-cases/delete-weight.use-case";
import { PrismaWeightRepository } from "../infrastructure/repositories/prisma-weight.repository";
import type {
  CreateWeightInput,
  UpdateWeightInput,
} from "../domain/repositories/weight.repository";

export async function weightRoutes(app: FastifyInstance) {
  app.get("/api/admin/weights", { preHandler: requireAdmin }, async () => {
    const repository = new PrismaWeightRepository();
    const useCase = new ListWeightsUseCase(repository);
    const data = await useCase.execute();

    return {
      success: true,
      data,
    };
  });

  app.get(
    "/api/admin/weights/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const repository = new PrismaWeightRepository();
      const useCase = new GetWeightByIdUseCase(repository);
      const data = await useCase.execute(id);

      if (!data) {
        return reply.status(404).send({
          success: false,
          message: "Bobot tidak ditemukan",
        });
      }

      return {
        success: true,
        data,
      };
    }
  );

  app.post(
    "/api/admin/weights",
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const repository = new PrismaWeightRepository();
        const useCase = new CreateWeightUseCase(repository);

        const data = await useCase.execute(request.body as CreateWeightInput);

        return reply.status(201).send({
          success: true,
          message: "Bobot CF berhasil ditambahkan",
          data,
        });
      } catch (error) {
        return reply.status(400).send({
          success: false,
          message: error instanceof Error ? error.message : "Terjadi kesalahan",
        });
      }
    }
  );

  app.put(
    "/api/admin/weights/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const repository = new PrismaWeightRepository();
        const useCase = new UpdateWeightUseCase(repository);

        const data = await useCase.execute(id, request.body as UpdateWeightInput);

        return {
          success: true,
          message: "Bobot CF berhasil diperbarui",
          data,
        };
      } catch (error) {
        return reply.status(400).send({
          success: false,
          message: error instanceof Error ? error.message : "Terjadi kesalahan",
        });
      }
    }
  );

  app.delete(
    "/api/admin/weights/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const repository = new PrismaWeightRepository();
        const useCase = new DeleteWeightUseCase(repository);

        await useCase.execute(id);

        return {
          success: true,
          message: "Bobot CF berhasil dihapus",
        };
      } catch (error) {
        return reply.status(400).send({
          success: false,
          message: error instanceof Error ? error.message : "Gagal menghapus bobot CF",
        });
      }
    }
  );
}