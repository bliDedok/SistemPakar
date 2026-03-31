import { FastifyInstance } from "fastify";
import { ListSymptomsUseCase } from "../application/use-cases/list-symptoms.use-case.js";
import { PrismaSymptomRepository } from "../infrastructure/repositories/prisma-symptom.repository.js";

export async function symptomRoutes(app: FastifyInstance) {
  app.get("/api/symptoms", async () => {
    const repository = new PrismaSymptomRepository();
    const useCase = new ListSymptomsUseCase(repository);

    const data = await useCase.execute();

    return {
      ok: true,
      data,
    };
  });
}