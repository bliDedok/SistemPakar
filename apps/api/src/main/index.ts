import "dotenv/config";
import { buildServer } from "./server";

const port = Number(process.env.PORT || 3001);
const host = "0.0.0.0";

const app = await buildServer();

try {
  await app.listen({ port, host });
  app.log.info(`API running at http://localhost:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}