import type { FastifyReply, FastifyRequest } from "fastify";

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token !== process.env.ADMIN_TOKEN) {
    return reply.status(401).send({
      success: false,
      message: "Unauthorized",
    });
  }
}