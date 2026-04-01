import type { FastifyInstance } from "fastify";

export async function adminRoutes(app: FastifyInstance) {
  app.post("/api/admin/login", async (request, reply) => {
    const body = request.body as {
      username?: string;
      password?: string;
    };

    const validUsername = process.env.ADMIN_USERNAME;
    const validPassword = process.env.ADMIN_PASSWORD;
    const token = process.env.ADMIN_TOKEN;

    if (
      body.username !== validUsername ||
      body.password !== validPassword
    ) {
      return reply.status(401).send({
        success: false,
        message: "Username atau password salah",
      });
    }

    return reply.send({
      success: true,
      message: "Login berhasil",
      data: {
        token,
      },
    });
  });
}