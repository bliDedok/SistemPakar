import { GoogleGenAI } from "@google/genai";
import { retrieveEvidenceForDiagnosis } from "../rag/rag-retriever.service";
import type { RetrievedEvidence } from "../rag/rag-retriever.service";
import type { UrgencyResult } from "../inference/urgency.service";

type DiagnosisResultForExplanation = {
  diseaseCode: string;
  diseaseName: string;
  cfResult: number;
  percentage: number;
  matchCount: number;
  supportingSymptoms: string[];
  advice: string | null;
};

export type ExplanationEvidence = {
  title: string;
  sourceName: string | null;
  sourceType: string;
  sourceUrl: string | null;
  evidenceDoi: string | null;
  score: number;
};

export type ExplanationResult = {
  source: "rag_llm" | "template";
  summary: string;
  whyThisDiagnosis: string;
  evidenceBasedExplanation: string;
  urgencyExplanation: string;
  nextStep: string;
  disclaimer: string;
  retrievedEvidence: ExplanationEvidence[];
};

function mapEvidence(evidence: RetrievedEvidence[]): ExplanationEvidence[] {
  return evidence.map((item) => ({
    title: item.title,
    sourceName: item.sourceName,
    sourceType: item.sourceType,
    sourceUrl: item.sourceUrl,
    evidenceDoi: item.evidenceDoi,
    score: Number(item.score.toFixed(4)),
  }));
}

function buildTemplateExplanation(args: {
  results: DiagnosisResultForExplanation[];
  redFlags: string[];
  urgency: UrgencyResult;
  retrievedEvidence: RetrievedEvidence[];
}): ExplanationResult {
  const top = args.results[0];

  if (!top) {
    return {
      source: "template",
      summary:
        "Sistem belum menemukan kecocokan penyakit yang cukup kuat berdasarkan gejala yang diberikan.",
      whyThisDiagnosis:
        "Gejala yang diberikan belum memenuhi aturan minimum pada knowledge base sistem pakar.",
      evidenceBasedExplanation:
        args.retrievedEvidence.length > 0
          ? `Sistem menemukan ${args.retrievedEvidence.length} evidence yang relevan, tetapi hasil diagnosis belum cukup kuat untuk dijelaskan sebagai kemungkinan penyakit tertentu.`
          : "Belum ada evidence yang cukup relevan untuk ditampilkan.",
      urgencyExplanation: args.urgency.action,
      nextStep:
        "Lengkapi gejala yang dialami anak atau lakukan pemeriksaan langsung bila kondisi anak mengkhawatirkan.",
      disclaimer:
        "Hasil ini merupakan identifikasi awal dan bukan pengganti diagnosis dokter.",
      retrievedEvidence: mapEvidence(args.retrievedEvidence),
    };
  }

  return {
    source: "template",
    summary: `Hasil awal menunjukkan kemungkinan terbesar adalah ${top.diseaseName} dengan tingkat keyakinan ${top.percentage}%.`,
    whyThisDiagnosis: `Hasil ini muncul karena terdapat kecocokan pada ${top.matchCount} gejala pendukung, yaitu ${top.supportingSymptoms.join(
      ", "
    )}.`,
    evidenceBasedExplanation:
      args.retrievedEvidence.length > 0
        ? `Sistem mengambil ${args.retrievedEvidence.length} evidence yang relevan untuk mendukung penjelasan hasil.`
        : "Evidence tambahan belum tersedia.",
    urgencyExplanation: args.urgency.action,
    nextStep:
      top.advice ??
      "Pantau kondisi anak dan konsultasikan ke tenaga medis bila gejala menetap atau memburuk.",
    disclaimer:
      "Hasil ini merupakan identifikasi awal dan bukan pengganti diagnosis dokter.",
    retrievedEvidence: mapEvidence(args.retrievedEvidence),
  };
}

export async function generateRagExplanation(args: {
  childProfile: {
    childName?: string | null;
    childAgeMonths: number;
    gender?: "MALE" | "FEMALE" | null;
  };
  results: DiagnosisResultForExplanation[];
  redFlags: string[];
  urgency: UrgencyResult;
}): Promise<ExplanationResult> {
  let retrievedEvidence: RetrievedEvidence[] = [];

  try {
    retrievedEvidence = await retrieveEvidenceForDiagnosis({
      diseaseCodes: args.results.map((item) => item.diseaseCode),
      symptomNames: args.results.flatMap((item) => item.supportingSymptoms),
      redFlags: args.redFlags,
      urgencyLevel: args.urgency.level,
      topK: 5,
    });
  } catch (error) {
    console.error("RAG retrieval gagal:", error);
  }

  if (!process.env.GEMINI_API_KEY || retrievedEvidence.length === 0) {
    return buildTemplateExplanation({
      results: args.results,
      redFlags: args.redFlags,
      urgency: args.urgency,
      retrievedEvidence,
    });
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const topDiagnosis = args.results[0] ?? null;

  const prompt = `
Kamu adalah RAG explanation layer untuk sistem pakar penyakit anak.

KONTEKS:
Diagnosis utama sudah dihitung oleh rule-based inference dan Certainty Factor.
Kamu TIDAK BOLEH mengubah diagnosis, ranking, nilai CF, persentase, atau tingkat urgensi.

TUGAS:
Buat penjelasan hasil diagnosis awal dalam bahasa Indonesia yang mudah dipahami orang tua.

BATASAN WAJIB:
1. Jangan menambahkan diagnosis baru.
2. Jangan mengubah nama penyakit.
3. Jangan mengubah angka CF atau persentase.
4. Jangan memberikan dosis obat.
5. Jangan menyatakan hasil sebagai diagnosis pasti.
6. Jangan memakai informasi di luar DATA SISTEM dan EVIDENCE CHUNKS.
7. Jika evidence tidak cukup, jelaskan bahwa penjelasan terbatas pada data sistem.

DATA SISTEM:
${JSON.stringify(
  {
    childProfile: args.childProfile,
    topDiagnosis,
    alternativeDiagnoses: args.results.slice(1),
    redFlags: args.redFlags,
    urgency: args.urgency,
  },
  null,
  2
)}

EVIDENCE CHUNKS:
${JSON.stringify(
  retrievedEvidence.map((item, index) => ({
    number: index + 1,
    title: item.title,
    content: item.content,
    sourceName: item.sourceName,
    sourceType: item.sourceType,
    sourceUrl: item.sourceUrl,
    evidenceDoi: item.evidenceDoi,
    retrievalScore: item.score,
  })),
  null,
  2
)}

Kembalikan hanya JSON valid dengan struktur:
{
  "summary": "...",
  "whyThisDiagnosis": "...",
  "evidenceBasedExplanation": "...",
  "urgencyExplanation": "...",
  "nextStep": "...",
  "disclaimer": "..."
}
`.trim();

  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");

    return {
      source: "rag_llm",
      summary: String(parsed.summary ?? ""),
      whyThisDiagnosis: String(parsed.whyThisDiagnosis ?? ""),
      evidenceBasedExplanation: String(parsed.evidenceBasedExplanation ?? ""),
      urgencyExplanation: String(parsed.urgencyExplanation ?? ""),
      nextStep: String(parsed.nextStep ?? ""),
      disclaimer:
        "Hasil ini merupakan identifikasi awal dan bukan pengganti diagnosis dokter.",
      retrievedEvidence: mapEvidence(retrievedEvidence),
    };
  } catch (error) {
    console.error("RAG explanation gagal, fallback ke template:", error);

    return buildTemplateExplanation({
      results: args.results,
      redFlags: args.redFlags,
      urgency: args.urgency,
      retrievedEvidence,
    });
  }
}