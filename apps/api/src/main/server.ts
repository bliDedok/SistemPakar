import Fastify from "fastify";
import cors from "@fastify/cors";
import { adminRoutes } from "../modules/admin/interface-http/admin.routes";
import { symptomRoutes } from "../modules/symptom/interface-http/symptom.routes";
import { diagnosisRoutes } from "../modules/diagnosis/interface-http/diagnosis.routes";

export async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.get("/", async () => {
    return {
      ok: true,
      message: "SPK Anak API is running",
    };
  });

  app.get("/health", async () => {
    return {
      ok: true,
      service: "spk-anak-api",
      ts: new Date().toISOString(),
    };
  });

  await app.register(adminRoutes);
  await app.register(symptomRoutes);
  await app.register(diagnosisRoutes);

  return app;
}