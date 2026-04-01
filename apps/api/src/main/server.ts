import Fastify from "fastify";
import cors from "@fastify/cors";
import { symptomRoutes } from "../modules/symptom/interface-http/symptom.routes";
import { diagnosisRoutes } from "../modules/diagnosis/interface-http/diagnosis.routes";


const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
  credentials: true,
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

await app.register(symptomRoutes);
await app.register(diagnosisRoutes);

const port = Number(process.env.PORT ?? 3001);

app.listen({ host: "0.0.0.0", port }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});