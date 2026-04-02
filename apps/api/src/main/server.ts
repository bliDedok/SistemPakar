import Fastify from "fastify";
import cors from "@fastify/cors";
import { adminRoutes } from "../modules/admin/interface-http/admin.routes";
import { symptomRoutes } from "../modules/symptom/interface-http/symptom.routes";
import { diagnosisRoutes } from "../modules/diagnosis/interface-http/diagnosis.routes";
import { diseaseRoutes } from "../modules/disease/interface-http/disease.routes";
import { weightRoutes } from "../modules/weight/interface-http/weight.routes";
import { ruleRoutes } from "../modules/rule/interface-http/rule.routes";
import { consultationHistoryRoutes } from "../modules/consultation-history/interface-http/consultation-history.routes";
import { dashboardRoutes } from "../modules/dashboard/interface-http/dashboard.routes";

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
  await app.register(diseaseRoutes);
  await app.register(weightRoutes);
  await app.register(ruleRoutes);
  await app.register(consultationHistoryRoutes);
  await app.register(dashboardRoutes);
  await app.register(diagnosisRoutes);

  return app;
}