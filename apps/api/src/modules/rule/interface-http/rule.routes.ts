import type { FastifyInstance } from "fastify";
import { requireAdmin } from "../../admin/middleware/admin-auth";
import { ListRulesUseCase } from "../application/use-cases/list-rules.use-case";
import { GetRuleByIdUseCase } from "../application/use-cases/get-rule-by-id.use-case";
import { CreateRuleUseCase } from "../application/use-cases/create-rule.use-case";
import { UpdateRuleUseCase } from "../application/use-cases/update-rule.use-case";
import { DeleteRuleUseCase } from "../application/use-cases/delete-rule.use-case";
import { AddRuleDetailUseCase } from "../application/use-cases/add-rule-detail.use-case";
import { RemoveRuleDetailUseCase } from "../application/use-cases/remove-rule-detail.use-case";
import { PrismaRuleRepository } from "../infrastructure/repositories/prisma-rule.repository";
import type {
  CreateRuleDetailInput,
  CreateRuleInput,
  UpdateRuleInput,
} from "../domain/repositories/rule.repository";

export async function ruleRoutes(app: FastifyInstance) {
  app.get("/api/admin/rules", { preHandler: requireAdmin }, async () => {
    const repository = new PrismaRuleRepository();
    const useCase = new ListRulesUseCase(repository);
    const data = await useCase.execute();

    return {
      success: true,
      data,
    };
  });

  app.get("/api/admin/rules/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const repository = new PrismaRuleRepository();
    const useCase = new GetRuleByIdUseCase(repository);
    const data = await useCase.execute(id);

    if (!data) {
      return reply.status(404).send({
        success: false,
        message: "Rule tidak ditemukan",
      });
    }

    return {
      success: true,
      data,
    };
  });

  app.post("/api/admin/rules", { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const repository = new PrismaRuleRepository();
      const useCase = new CreateRuleUseCase(repository);

      const data = await useCase.execute(request.body as CreateRuleInput);

      return reply.status(201).send({
        success: true,
        message: "Rule berhasil ditambahkan",
        data,
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : "Terjadi kesalahan",
      });
    }
  });

  app.put("/api/admin/rules/:id", { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const repository = new PrismaRuleRepository();
      const useCase = new UpdateRuleUseCase(repository);

      const data = await useCase.execute(id, request.body as UpdateRuleInput);

      return {
        success: true,
        message: "Rule berhasil diperbarui",
        data,
      };
    } catch (error) {
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : "Terjadi kesalahan",
      });
    }
  });

  app.delete("/api/admin/rules/:id", { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const repository = new PrismaRuleRepository();
      const useCase = new DeleteRuleUseCase(repository);

      const data = await useCase.execute(id);

      return {
        success: true,
        message: "Rule berhasil dinonaktifkan",
        data,
      };
    } catch (error) {
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : "Gagal menghapus rule",
      });
    }
  });

  app.post("/api/admin/rules/:id/details", { preHandler: requireAdmin }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const repository = new PrismaRuleRepository();
      const useCase = new AddRuleDetailUseCase(repository);

      const body = request.body as Omit<CreateRuleDetailInput, "ruleId">;

      const data = await useCase.execute({
        ruleId: id,
        symptomId: body.symptomId,
        isMandatory: body.isMandatory,
      });

      return reply.status(201).send({
        success: true,
        message: "Detail rule berhasil ditambahkan",
        data,
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : "Terjadi kesalahan",
      });
    }
  });

  app.delete(
    "/api/admin/rules/:ruleId/details/:detailId",
    { preHandler: requireAdmin },
    async (request, reply) => {
      try {
        const { ruleId, detailId } = request.params as {
          ruleId: string;
          detailId: string;
        };

        const repository = new PrismaRuleRepository();
        const useCase = new RemoveRuleDetailUseCase(repository);

        const data = await useCase.execute(ruleId, detailId);

        return {
          success: true,
          message: "Detail rule berhasil dihapus",
          data,
        };
      } catch (error) {
        return reply.status(400).send({
          success: false,
          message: error instanceof Error ? error.message : "Gagal menghapus detail rule",
        });
      }
    }
  );
}