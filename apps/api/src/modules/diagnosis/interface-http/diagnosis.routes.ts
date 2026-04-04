import type { FastifyInstance } from "fastify";
import {
  diagnoseChild,
  getConsultationResultById,
} from "../../inference/inference.service";

const DISCLAIMER =
  "Hasil ini adalah diagnosis awal dan bukan pengganti pemeriksaan dokter.";

export async function diagnosisRoutes(app: FastifyInstance) {
  app.post("/api/consultations/diagnose", async (request, reply) => {
    try {
      const result = await diagnoseChild(request.body as any);

      return reply.status(200).send({
        success: true,
        message: "Diagnosis awal berhasil diproses",
        disclaimer: DISCLAIMER,
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

  app.get("/api/consultations/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await getConsultationResultById(id);

      return reply.status(200).send({
        success: true,
        message: "Detail konsultasi berhasil dimuat",
        disclaimer: DISCLAIMER,
        data: result,
      });
    } catch (error) {
      request.log.error(error);

      if (error instanceof Error && error.message === "CONSULTATION_NOT_FOUND") {
        return reply.status(404).send({
          success: false,
          message: "Data konsultasi tidak ditemukan",
        });
      }

      return reply.status(500).send({
        success: false,
        message: "Terjadi kesalahan saat memuat hasil konsultasi",
      });
    }
  });
}