import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../admin/middleware/admin-auth";
import { ListConsultationsUseCase } from "../application/use-cases/list-consultations.use-case";
import { GetConsultationByIdUseCase } from "../application/use-cases/get-consultation-by-id.use-case";
import { PrismaConsultationHistoryRepository } from "../infrastructure/repositories/prisma-consultation-history.repository";

export async function consultationHistoryRoutes(app: FastifyInstance) {
  app.get("/api/admin/consultations", { preHandler: requireAdmin }, async () => {
    const repository = new PrismaConsultationHistoryRepository();
    const useCase = new ListConsultationsUseCase(repository);
    const data = await useCase.execute();

    return {
      success: true,
      data,
    };
  });

  app.get(
    "/api/admin/consultations/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const repository = new PrismaConsultationHistoryRepository();
      const useCase = new GetConsultationByIdUseCase(repository);
      const data = await useCase.execute(id);

      if (!data) {
        return reply.status(404).send({
          success: false,
          message: "Konsultasi tidak ditemukan",
        });
      }

      return {
        success: true,
        data,
      };
    }
  );
}