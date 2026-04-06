import { prisma } from "../../../shared/db/prisma";
import { extractWithGemini } from "./llm-extractor";
import type {
  ChatbotRequestDto,
  ChatbotResponseDto,
  ChildProfileDraft,
  KnownSymptomDto,
  NegativeSymptomCandidate,
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
  pilek: ["pilek", "flu", "ingusan"],
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  if (lower.includes("cukup") || lower.includes("jelas") || lower.includes("sudah")) {
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
    /anak saya\s+([a-zA-Z]{2,40})\s+umur/,
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

function getMissingProfileFields(profile: ChildProfileDraft): string[] {
  const missing: string[] = [];

  if (!profile.childName) missing.push("nama anak");
  if (profile.childAgeMonths == null) missing.push("usia anak dalam bulan");
  if (!profile.gender) missing.push("jenis kelamin anak");

  return missing;
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

function isNegated(text: string, alias: string) {
  const safe = escapeRegExp(alias);

  const patterns = [
    new RegExp(`(?:tidak|tak|ga|gak|nggak|enggak|belum|bukan)\\s+(?:ada\\s+)?${safe}`, "i"),
    new RegExp(`(?:tanpa)\\s+${safe}`, "i"),
    new RegExp(`(?:tidak ada|ga ada|gak ada|nggak ada|enggak ada)\\s+${safe}`, "i"),
  ];

  return patterns.some((pattern) => pattern.test(text));
}

function extractSymptomsFromMessage(
  message: string,
  symptoms: ActiveSymptom[]
): {
  positive: StructuredSymptomCandidate[];
  negative: NegativeSymptomCandidate[];
} {
  const lower = normalize(message);
  const aliasIndex = buildAliasIndex(symptoms);

  const positive: StructuredSymptomCandidate[] = [];
  const negative: NegativeSymptomCandidate[] = [];

  for (const item of aliasIndex) {
    const matchedAlias = item.aliases.find((alias) => lower.includes(alias));
    if (!matchedAlias) continue;

    if (isNegated(lower, matchedAlias)) {
      negative.push({
        code: item.symptom.code,
        symptomName: item.symptom.name,
        matchedAlias,
      });
      continue;
    }

    positive.push({
      code: item.symptom.code,
      confidence: clampConfidence(estimateConfidence(lower, matchedAlias)),
      symptomName: item.symptom.name,
      matchedAlias,
    });
  }

  return { positive, negative };
}

function buildMergedKnownSymptomMap(args: {
  knownSymptoms?: KnownSymptomDto[];
  positiveSymptoms: StructuredSymptomCandidate[];
  negativeSymptoms: NegativeSymptomCandidate[];
}) {
  const map = new Map<string, number>();

  for (const item of args.knownSymptoms ?? []) {
    map.set(item.code, item.currentCf);
  }

  for (const item of args.positiveSymptoms) {
    map.set(item.code, item.confidence);
  }

  for (const item of args.negativeSymptoms) {
    map.set(item.code, 0);
  }

  return map;
}

function buildReply(args: {
  profile: ChildProfileDraft;
  currentPositiveSymptoms: StructuredSymptomCandidate[];
  cumulativePositiveCount: number;
}) {
  const missingFields = getMissingProfileFields(args.profile);

  if (missingFields.length > 0) {
    return {
      reply: `Baik, saya bantu catat dulu. Mohon lengkapi ${missingFields.join(
        ", "
      )} agar konsultasi bisa diproses dengan lebih rapi.`,
      missingFields,
      canDiagnose: false,
    };
  }

  if (args.cumulativePositiveCount === 0) {
    return {
      reply:
        "Saya belum menemukan gejala yang cocok dari konteks yang ada. Coba sebutkan gejalanya lebih spesifik, misalnya batuk, demam, pilek, napas cepat, muntah, atau diare.",
      missingFields,
      canDiagnose: false,
    };
  }

  if (args.currentPositiveSymptoms.length > 0) {
    const symptomNames = args.currentPositiveSymptoms
      .map((item) => item.symptomName)
      .join(", ");

    return {
      reply: `Baik, saya mencatat gejala berikut: ${symptomNames}. Jika sudah sesuai, data ini bisa diteruskan ke mesin diagnosis awal sistem pakar.`,
      missingFields,
      canDiagnose: true,
    };
  }

  return {
    reply:
      "Baik, data gejala sebelumnya masih saya simpan. Kalau ada keluhan tambahan, silakan lanjutkan. Data saat ini sebenarnya sudah bisa diproses ke diagnosis awal.",
    missingFields,
    canDiagnose: true,
  };
}

export async function processChatbotMessage(
  payload: ChatbotRequestDto
): Promise<ChatbotResponseDto> {
  const symptoms = await getActiveSymptoms();

  if (process.env.GEMINI_API_KEY) {
    try {
      const llmResult = await extractWithGemini({
        message: payload.message,
        history: payload.history,
        profile: payload.profile,
        symptoms,
        knownSymptoms: payload.knownSymptoms ?? [],
      });

      const validCodes = new Set(symptoms.map((s) => s.code));

      const structuredSymptoms: StructuredSymptomCandidate[] = llmResult.symptoms
        .filter((item) => validCodes.has(item.code))
        .map((item) => ({
          code: item.code,
          confidence: clampConfidence(item.confidence),
          symptomName: item.symptomName,
          matchedAlias: item.matchedAlias || "llm",
        }));

      const negativeSymptoms: NegativeSymptomCandidate[] = llmResult.negativeSymptoms
        .filter((item) => validCodes.has(item.code))
        .map((item) => ({
          code: item.code,
          symptomName: item.symptomName,
          matchedAlias: item.matchedAlias || "llm",
        }));

      const mergedProfile: ChildProfileDraft = {
        childName: llmResult.profile.childName ?? payload.profile?.childName ?? null,
        childAgeMonths:
          llmResult.profile.childAgeMonths ?? payload.profile?.childAgeMonths ?? null,
        gender: llmResult.profile.gender ?? payload.profile?.gender ?? null,
      };

      const mergedSymptomMap = buildMergedKnownSymptomMap({
        knownSymptoms: payload.knownSymptoms,
        positiveSymptoms: structuredSymptoms,
        negativeSymptoms,
      });

      const cumulativePositiveCount = Array.from(mergedSymptomMap.values()).filter(
        (value) => value > 0
      ).length;

      const missingFields = getMissingProfileFields(mergedProfile);
      const canDiagnose = missingFields.length === 0 && cumulativePositiveCount > 0;

      return {
        reply: llmResult.reply,
        profile: mergedProfile,
        structured: {
          symptoms: structuredSymptoms,
          negativeSymptoms,
          missingFields,
          canDiagnose,
        },
        meta: {
          source: "llm",
          note: "Structured extraction via Gemini",
        },
      };
    } catch (error) {
      console.error("Gemini gagal, fallback ke parser lokal:", error);
    }
  }

  const profile = mergeProfile(payload.profile, payload.message);
  const extracted = extractSymptomsFromMessage(payload.message, symptoms);

  const mergedSymptomMap = buildMergedKnownSymptomMap({
    knownSymptoms: payload.knownSymptoms,
    positiveSymptoms: extracted.positive,
    negativeSymptoms: extracted.negative,
  });

  const cumulativePositiveCount = Array.from(mergedSymptomMap.values()).filter(
    (value) => value > 0
  ).length;

  const summary = buildReply({
    profile,
    currentPositiveSymptoms: extracted.positive,
    cumulativePositiveCount,
  });

  return {
    reply: summary.reply,
    profile,
    structured: {
      symptoms: extracted.positive,
      negativeSymptoms: extracted.negative,
      missingFields: summary.missingFields,
      canDiagnose: summary.canDiagnose,
    },
    meta: {
      source: "rule-based-fallback",
      note: "Fallback lokal saat provider LLM belum aktif atau gagal dipanggil.",
    },
  };
}