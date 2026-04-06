import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type {
  ChatMessageDto,
  ChildProfileDraft,
  KnownSymptomDto,
} from "./chatbot.types";

type ActiveSymptom = {
  id: string;
  code: string;
  name: string;
  questionText: string;
  category: string | null;
  isRedFlag: boolean;
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const extractionSchema = z.object({
  reply: z.string(),
  profile: z.object({
    childName: z.string().nullable(),
    childAgeMonths: z.number().int().nullable(),
    gender: z.enum(["MALE", "FEMALE"]).nullable(),
  }),
  symptoms: z.array(
    z.object({
      code: z.string(),
      symptomName: z.string(),
      confidence: z.number().min(0).max(1),
      matchedAlias: z.string(),
    })
  ),
  negativeSymptoms: z.array(
    z.object({
      code: z.string(),
      symptomName: z.string(),
      matchedAlias: z.string(),
    })
  ),
  missingFields: z.array(z.string()),
  canDiagnose: z.boolean(),
});

export async function extractWithGemini(args: {
  message: string;
  history?: ChatMessageDto[];
  profile?: ChildProfileDraft;
  symptoms: ActiveSymptom[];
  knownSymptoms?: KnownSymptomDto[];
}) {
  const { message, history = [], profile, symptoms, knownSymptoms = [] } = args;

  const symptomCatalog = symptoms
    .map(
      (s) =>
        `- code=${s.code}; name=${s.name}; question=${s.questionText}; category=${s.category ?? "-"}; redFlag=${s.isRedFlag}`
    )
    .join("\n");

  const conversation = history
    .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
    .join("\n");

  const knownFacts = knownSymptoms
    .map((s) => `- code=${s.code}; currentCf=${s.currentCf}`)
    .join("\n");

  const prompt = `
Kamu adalah asisten triase awal untuk sistem pakar kesehatan anak.

Aturan:
1. Pahami percakapan secara KUMULATIF, jangan hanya fokus pada pesan terakhir.
2. Jangan menghapus fakta lama kecuali user secara jelas MENYANGKAL gejala itu.
3. Jika user menyangkal gejala, masukkan ke negativeSymptoms.
4. HANYA gunakan gejala dari daftar gejala valid.
5. Jangan bilang "tidak ada gejala" bila dari riwayat sudah ada gejala valid yang disebut.
6. Usia harus dalam BULAN.
7. canDiagnose=true bila profil inti lengkap dan total gejala positif dari konteks sudah cukup untuk diproses.
8. Balasan harus natural, singkat, dan bertanya SATU hal lanjutan paling penting jika data belum cukup.
9. Jangan menanyakan gejala di luar katalog.

Profil saat ini:
${JSON.stringify(profile ?? {}, null, 2)}

Gejala yang sudah diketahui:
${knownFacts || "(belum ada)"}

Riwayat chat:
${conversation || "(belum ada)"}

Daftar gejala valid:
${symptomCatalog}

Pesan user terbaru:
${message}
`.trim();

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(extractionSchema),
    },
  });

  return extractionSchema.parse(JSON.parse(response.text || "{}"));
}