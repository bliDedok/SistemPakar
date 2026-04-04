import { prisma } from "../../../shared/db/prisma";
import type {
  ChatbotRequestDto,
  ChatbotResponseDto,
  ChildProfileDraft,
  StructuredSymptomCandidate,
} from "./chatbot.types";

type ActiveSymptom = {
  id: string;
  code: string;
  name: string;
  questionText: string;
  category: string | null;
  isRedFlag: boolean;
};

const symptomAliasMap: Record<string, string[]> = {
  batuk: ["batuk", "batuk-batuk", "cough"],
  demam: ["demam", "panas", "meriang", "fever"],
  napas_cepat: ["napas cepat", "nafas cepat", "megap-megap", "sesak", "susah napas"],
  tarikan_dinding_dada: ["tarikan dinding dada", "dada tertarik", "cekung dada"],
  muntah: ["muntah", "muntah-muntah"],
  diare: ["diare", "mencret", "berak cair", "bab cair"],
  tidak_bisa_minum: ["tidak bisa minum", "sulit minum", "malas minum"],
};

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function extractAgeMonths(message: string): number | null {
  const lower = normalize(message);

  const bulanMatch = lower.match(/(\d+)\s*(bulan|bln|bl)/);
  if (bulanMatch) return Number(bulanMatch[1]);

  const tahunMatch = lower.match(/(\d+)\s*(tahun|thn|th)/);
  if (tahunMatch) return Number(tahunMatch[1]) * 12;

  return null;
}

function extractGender(message: string): "MALE" | "FEMALE" | null {
  const lower = normalize(message);

  if (
    lower.includes("laki-laki") ||
    lower.includes("laki laki") ||
    lower.includes("cowok")
  ) {
    return "MALE";
  }

  if (
    lower.includes("perempuan") ||
    lower.includes("wanita") ||
    lower.includes("cewek")
  ) {
    return "FEMALE";
  }

  return null;
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function estimateConfidence(message: string, alias: string) {
  const lower = normalize(message);

  if (lower.includes("sangat") || lower.includes("parah") || lower.includes("sekali")) {
    return 1;
  }

  if (lower.includes("cukup") || lower.includes("jelas")) {
    return 0.8;
  }

  if (lower.includes(alias)) {
    return 0.6;
  }

  return 0.4;
}

function inferChildName(message: string, current?: string | null): string | null {
  if (current) return current;

  const lower = normalize(message);
  const patterns = [
    /nama anak(?: saya)?\s+([a-zA-Z ]{2,40})/,
    /anak saya bernama\s+([a-zA-Z ]{2,40})/,
    /namanya\s+([a-zA-Z ]{2,40})/,
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match?.[1]) {
      return match[1]
        .trim()
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }

  return null;
}

function mergeProfile(
  previous: ChildProfileDraft | undefined,
  message: string
): ChildProfileDraft {
  return {
    childName: inferChildName(message, previous?.childName ?? null),
    childAgeMonths: previous?.childAgeMonths ?? extractAgeMonths(message),
    gender: previous?.gender ?? extractGender(message),
  };
}

async function getActiveSymptoms(): Promise<ActiveSymptom[]> {
  const symptoms = await prisma.symptom.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      name: true,
      questionText: true,
      category: true,
      isRedFlag: true,
    },
    orderBy: { code: "asc" },
  });

  return symptoms;
}

function buildAliasIndex(symptoms: ActiveSymptom[]) {
  return symptoms.map((symptom) => {
    const aliases = symptomAliasMap[symptom.code] ?? [
      symptom.name.toLowerCase(),
      symptom.questionText.toLowerCase(),
    ];

    return {
      symptom,
      aliases: aliases.map((alias) => normalize(alias)),
    };
  });
}

function extractSymptomsFromMessage(
  message: string,
  symptoms: ActiveSymptom[]
): StructuredSymptomCandidate[] {
  const lower = normalize(message);
  const aliasIndex = buildAliasIndex(symptoms);
  const found: StructuredSymptomCandidate[] = [];

  for (const item of aliasIndex) {
    const matchedAlias = item.aliases.find((alias) => lower.includes(alias));
    if (!matchedAlias) continue;

    found.push({
      code: item.symptom.code,
      confidence: clampConfidence(estimateConfidence(lower, matchedAlias)),
      symptomName: item.symptom.name,
      matchedAlias,
    });
  }

  return found;
}

function buildReply(
  profile: ChildProfileDraft,
  structuredSymptoms: StructuredSymptomCandidate[]
) {
  const missingFields: string[] = [];

  if (!profile.childName) missingFields.push("nama anak");
  if (profile.childAgeMonths == null) missingFields.push("usia anak dalam bulan");
  if (!profile.gender) missingFields.push("jenis kelamin anak");

  if (missingFields.length > 0) {
    return {
      reply: `Baik, saya bantu catat dulu. Mohon lengkapi ${missingFields.join(
        ", "
      )} agar konsultasi bisa diproses dengan lebih rapi.`,
      missingFields,
      canDiagnose: false,
    };
  }

  if (structuredSymptoms.length === 0) {
    return {
      reply:
        "Saya belum menemukan gejala yang cocok dari pesan Anda. Coba sebutkan gejalanya lebih spesifik, misalnya batuk, demam, napas cepat, muntah, diare, atau tanda bahaya lain.",
      missingFields,
      canDiagnose: false,
    };
  }

  const symptomNames = structuredSymptoms.map((item) => item.symptomName).join(", ");

  return {
    reply: `Baik, saya mencatat gejala berikut: ${symptomNames}. Jika sudah sesuai, data ini bisa diteruskan ke mesin diagnosis awal sistem pakar.`,
    missingFields,
    canDiagnose: true,
  };
}

export async function processChatbotMessage(
  payload: ChatbotRequestDto
): Promise<ChatbotResponseDto> {
  const symptoms = await getActiveSymptoms();
  const profile = mergeProfile(payload.profile, payload.message);
  const structuredSymptoms = extractSymptomsFromMessage(payload.message, symptoms);
  const summary = buildReply(profile, structuredSymptoms);

  return {
    reply: summary.reply,
    profile,
    structured: {
      symptoms: structuredSymptoms,
      missingFields: summary.missingFields,
      canDiagnose: summary.canDiagnose,
    },
    meta: {
      source: "rule-based-fallback",
      note:
        "Fondasi ini belum memakai provider LLM. Endpoint ini disiapkan agar nanti Claude atau Gemini bisa dipasang tanpa mengubah engine diagnosis utama.",
    },
  };
}
