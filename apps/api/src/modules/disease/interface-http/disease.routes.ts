import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../admin/middleware/admin-auth";
import { ListDiseasesUseCase } from "../application/use-cases/list-diseases.use-case";
import { GetDiseaseByIdUseCase } from "../application/use-cases/get-disease-by-id.use-case";
import { CreateDiseaseUseCase } from "../application/use-cases/create-disease.use-case";
import { UpdateDiseaseUseCase } from "../application/use-cases/update-disease.use-case";
import { DeleteDiseaseUseCase } from "../application/use-cases/delete-disease.use-case";
import { PrismaDiseaseRepository } from "../infrastructure/repositories/prisma-disease.repository";
import type {
  CreateDiseaseInput,
  UpdateDiseaseInput,
} from "../domain/repositories/disease.repository";

export async function diseaseRoutes(app: FastifyInstance) {
  app.get("/api/diseases", async () => {
    const repository = new PrismaDiseaseRepository();
    const useCase = new ListDiseasesUseCase(repository);
    const data = await useCase.execute();

    return {
      success: true,
      data: data.filter((item) => item.isActive),
    };
  });

  app.get("/api/admin/diseases", { preHandler: requireAdmin }, async () => {
    const repository = new PrismaDiseaseRepository();
    const useCase = new ListDiseasesUseCase(repository);
    const data = await useCase.execute();

    return {
      success: true,
      data,
    };
  });

  app.get(
    "/api/admin/diseases/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const repository = new PrismaDiseaseRepository();
      const useCase = new GetDiseaseByIdUseCase(repository);
      const data = await useCase.execute(id);

      if (!data) {
        return reply.status(404).send({
          success: false,
          message: "Penyakit tidak ditemukan",
        });
      }

      return {
        success: true,
        data,
      };
    }
  );

  app.post(
    "/api/admin/diseases",
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const repository = new PrismaDiseaseRepository();
        const useCase = new CreateDiseaseUseCase(repository);

        const data = await useCase.execute(request.body as CreateDiseaseInput);

        return reply.status(201).send({
          success: true,
          message: "Penyakit berhasil ditambahkan",
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
    "/api/admin/diseases/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const repository = new PrismaDiseaseRepository();
        const useCase = new UpdateDiseaseUseCase(repository);

        const data = await useCase.execute(id, request.body as UpdateDiseaseInput);

        return {
          success: true,
          message: "Penyakit berhasil diperbarui",
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
    "/api/admin/diseases/:id",
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        const repository = new PrismaDiseaseRepository();
        const useCase = new DeleteDiseaseUseCase(repository);

        const data = await useCase.execute(id);

        return {
          success: true,
          message: "Penyakit berhasil dinonaktifkan",
          data,
        };
      } catch (error) {
        return reply.status(400).send({
          success: false,
          message: error instanceof Error ? error.message : "Gagal menghapus penyakit",
        });
      }
    }
  );
}