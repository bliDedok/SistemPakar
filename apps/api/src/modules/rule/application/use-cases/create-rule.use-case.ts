import { prisma } from "../../../../shared/db/prisma";
import type {
  CreateRuleInput,
  RuleRepository,
} from "../../domain/repositories/rule.repository";

export class CreateRuleUseCase {
  constructor(private readonly ruleRepository: RuleRepository) {}

  async execute(data: CreateRuleInput) {
    if (!data.code?.trim()) throw new Error("Code rule wajib diisi");
    if (!data.name?.trim()) throw new Error("Nama rule wajib diisi");
    if (!data.diseaseId) throw new Error("Penyakit wajib dipilih");
    if (!["AND", "OR"].includes(data.operator)) throw new Error("Operator tidak valid");
    if (typeof data.minMatch !== "number" || data.minMatch < 1) {
      throw new Error("Min match minimal 1");
    }

    const existing = await prisma.rule.findFirst({
      where: { code: data.code },
    });

    if (existing) {
      throw new Error("Code rule sudah digunakan");
    }

    return this.ruleRepository.create(data);
  }
}