import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { processChatbotMessage } from "../application/chatbot.service";

const chatbotBodySchema = z.object({
  message: z.string().min(1, "Pesan wajib diisi"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
  profile: z
    .object({
      childName: z.string().optional().nullable(),
      childAgeMonths: z.number().optional().nullable(),
      gender: z.enum(["MALE", "FEMALE"]).optional().nullable(),
    })
    .optional(),
});

export async function chatbotRoutes(app: FastifyInstance) {
  app.post("/api/chatbot/message", async (request, reply) => {
    try {
      const payload = chatbotBodySchema.parse(request.body);
      const result = await processChatbotMessage(payload);

      return reply.status(200).send({
        success: true,
        message: "Pesan chatbot berhasil diproses",
        data: result,
      });
    } catch (error) {
      request.log.error(error);

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          message: error.issues[0]?.message || "Payload chatbot tidak valid",
        });
      }

      return reply.status(500).send({
        success: false,
        message: "Terjadi kesalahan saat memproses pesan chatbot",
      });
    }
  });
}
