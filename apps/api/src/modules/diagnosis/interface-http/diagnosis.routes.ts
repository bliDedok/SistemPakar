import type { FastifyInstance } from "fastify";
import { diagnoseChild } from "../../inference/inference.service";

export async function diagnosisRoutes(app: FastifyInstance) {
  app.post("/api/consultations/diagnose", async (request, reply) => {
    try {
      const result = await diagnoseChild(request.body as any);

      return reply.status(200).send({
        success: true,
        message: "Diagnosis awal berhasil diproses",
        disclaimer: "Hasil ini adalah diagnosis awal dan bukan pengganti pemeriksaan dokter.",
        data: result,
      });
    } catch (error) {
      request.log.error(error);

      return reply.status(500).send({
        success: false,
        message: "Terjadi kesalahan saat memproses diagnosis",
      });
    }
  });
}