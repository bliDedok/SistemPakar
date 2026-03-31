import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PrismaDiagnosisRepository } from "../infrastructure/repositories/prisma-diagnosis.repository.js";
import { RunDiagnosisUseCase } from "../application/use-cases/run-diagnosis.use-case.js";

const bodySchema = z.object({
  answers: z.array(
    z.object({
      symptomId: z.string(),
      confidenceUser: z.number().min(0).max(1),
    })
  ),
});

export async function diagnosisRoutes(app: FastifyInstance) {
  app.post("/api/diagnosis/run", async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({
        ok: false,
        error: parsed.error.flatten(),
      });
    }

    const repository = new PrismaDiagnosisRepository();
    const useCase = new RunDiagnosisUseCase(repository);

    const data = await useCase.execute(parsed.data.answers);

    return {
      ok: true,
      data,
    };
  });
}