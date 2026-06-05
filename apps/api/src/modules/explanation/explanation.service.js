import { GoogleGenAI } from "@google/genai";
import { retrieveEvidenceForDiagnosis } from "../rag/rag-retriever.service";
function mapEvidence(evidence) {
    return evidence.map((item) => ({
        title: item.title,
        sourceName: item.sourceName,
        sourceType: item.sourceType,
        sourceUrl: item.sourceUrl,
        evidenceDoi: item.evidenceDoi,
        score: Number(item.score.toFixed(4)),
    }));
}
function buildEvidenceContext(retrievedEvidence) {
    if (!retrievedEvidence.length) {
        return "Tidak ada evidence retrieval yang tersedia.";
    }
    return retrievedEvidence
        .slice(0, 5)
        .map((evidence, index) => {
        return [
            `Evidence ${index + 1}:`,
            `Title: ${evidence.title}`,
            `Source: ${evidence.sourceName ?? "Unknown source"}`,
            `Type: ${evidence.sourceType}`,
            `URL: ${evidence.sourceUrl ?? "-"}`,
            `DOI: ${evidence.evidenceDoi ?? "-"}`,
            `Content: ${evidence.content}`,
        ].join("\n");
    })
        .join("\n\n");
}
function buildEvidenceSourceNames(retrievedEvidence) {
    const names = [
        ...new Set(retrievedEvidence
            .map((item) => item.sourceName)
            .filter((name) => Boolean(name))),
    ];
    if (!names.length)
        return "sumber evidence yang tersedia";
    return names.join(", ");
}
function buildTemplateExplanation(args) {
    const top = args.results[0];
    const supportingSymptoms = top.supportingSymptoms?.length
        ? top.supportingSymptoms
        : top.matchedSymptoms
            ?.map((symptom) => symptom.symptomName)
            .filter((name) => Boolean(name)) ?? [];
    const supportingSymptomsText = supportingSymptoms.length > 0
        ? supportingSymptoms.join(", ")
        : "gejala yang dipilih pengguna";
    if (!top) {
        return {
            source: "template",
            summary: "Sistem belum menemukan kecocokan penyakit yang cukup kuat berdasarkan gejala yang diberikan.",
            whyThisDiagnosis: "Gejala yang diberikan belum memenuhi aturan minimum pada knowledge base sistem pakar.",
            evidenceBasedExplanation: args.retrievedEvidence.length > 0
                ? `Sistem menemukan ${args.retrievedEvidence.length} evidence yang relevan, tetapi hasil diagnosis belum cukup kuat untuk dijelaskan sebagai kemungkinan penyakit tertentu.`
                : "Belum ada evidence yang cukup relevan untuk ditampilkan.",
            urgencyExplanation: args.urgency.action,
            nextStep: "Lengkapi gejala yang dialami anak atau lakukan pemeriksaan langsung bila kondisi anak mengkhawatirkan.",
            disclaimer: "Hasil ini merupakan identifikasi awal dan bukan pengganti diagnosis dokter.",
            retrievedEvidence: mapEvidence(args.retrievedEvidence),
        };
    }
    return {
        source: "template",
        summary: `Hasil awal menunjukkan kemungkinan terbesar adalah ${top.diseaseName} dengan tingkat keyakinan ${top.percentage}%.`,
        whyThisDiagnosis: `Hasil ini muncul karena terdapat kecocokan pada ${top.matchCount ?? supportingSymptoms.length} gejala pendukung, yaitu ${supportingSymptomsText}.`,
        evidenceBasedExplanation: args.retrievedEvidence.length > 0
            ? `Sistem mengambil ${args.retrievedEvidence.length} evidence yang relevan untuk mendukung penjelasan hasil.`
            : "Evidence tambahan belum tersedia.",
        urgencyExplanation: args.urgency.action,
        nextStep: top.advice ??
            "Pantau kondisi anak dan konsultasikan ke tenaga medis bila gejala menetap atau memburuk.",
        disclaimer: "Hasil ini merupakan identifikasi awal dan bukan pengganti diagnosis dokter.",
        retrievedEvidence: mapEvidence(args.retrievedEvidence),
    };
}
export async function generateRagExplanation(args) {
    let retrievedEvidence = [];
    const diseaseCodes = args.results
        .map((item) => item.diseaseCode)
        .filter((code) => typeof code === "string" && code.trim().length > 0);
    const symptomNames = args.results.flatMap((item) => {
        const supportingSymptoms = item.supportingSymptoms?.filter((symptom) => typeof symptom === "string" && symptom.trim().length > 0) ?? [];
        const matchedSymptoms = item.matchedSymptoms
            ?.map((symptom) => symptom.symptomName)
            .filter((symptomName) => typeof symptomName === "string" && symptomName.trim().length > 0) ?? [];
        return supportingSymptoms.length > 0 ? supportingSymptoms : matchedSymptoms;
    });
    try {
        retrievedEvidence = await retrieveEvidenceForDiagnosis({
            diseaseCodes,
            symptomNames,
            redFlags: args.redFlags,
            urgencyLevel: args.urgency.level,
            topK: 5,
        });
    }
    catch (error) {
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
    const { childProfile, results, redFlags, urgency } = args;
    const top1 = results?.[0] ?? null;
    const top1Symptoms = top1?.supportingSymptoms?.length
        ? top1.supportingSymptoms.filter((symptom) => typeof symptom === "string" && symptom.trim().length > 0)
        : top1?.matchedSymptoms
            ?.map((symptom) => symptom.symptomName)
            .filter((symptomName) => typeof symptomName === "string" && symptomName.trim().length > 0) ?? [];
    const top1CfFinal = top1?.cfFinal ?? top1?.cfResult ?? 0;
    const top1CfPercent = top1?.cfPercent ?? top1?.percentage ?? 0;
    const topDiagnosis = args.results[0] ?? null;
    const evidenceContext = buildEvidenceContext(retrievedEvidence);
    const evidenceSourceNames = buildEvidenceSourceNames(retrievedEvidence);
    const evidenceBasedExplanation = retrievedEvidence.length > 0
        ? `Berdasarkan evidence dari ${evidenceSourceNames}, gejala yang dilaporkan memiliki keterkaitan dengan ${top1?.diseaseName}. Evidence yang ditemukan mendukung hubungan antara gejala seperti ${(top1?.supportingSymptoms ?? []).join(", ")} dengan indikasi ${top1?.diseaseName}. Penjelasan ini digunakan sebagai lapisan pendukung untuk membantu pengguna memahami hasil sistem, bukan untuk mengubah diagnosis atau nilai Certainty Factor.`
        : "Evidence tambahan belum tersedia. Sistem menggunakan penjelasan berbasis template dari hasil inference engine.";
    const prompt = `
Anda adalah assistant medis edukatif untuk sistem pakar penyakit anak.
Tugas Anda adalah membuat penjelasan hasil diagnosis awal berdasarkan hasil inference engine.

BATASAN PENTING:
- Jangan mengubah diagnosis utama.
- Jangan mengubah ranking penyakit.
- Jangan mengubah nilai Certainty Factor.
- Jangan mengubah red flag dan urgency.
- RAG hanya digunakan untuk menjelaskan hasil, bukan menentukan diagnosis.
- Jangan menyatakan hasil sebagai diagnosis pasti dokter.

DATA HASIL SISTEM:
Nama anak: ${childProfile.childName ?? "-"}
Usia anak: ${childProfile.childAgeMonths} bulan
Jenis kelamin: ${childProfile.gender ?? "-"}
Diagnosis Top-1: ${top1?.diseaseName ?? "-"}
Kode penyakit: ${top1?.diseaseCode ?? "-"}
CF Final: ${top1CfFinal}
CF Percent: ${top1CfPercent}%
Gejala cocok: ${top1Symptoms.length ? top1Symptoms.join(", ") : "Tidak ada"}
Red flag: ${redFlags.length ? redFlags.join(", ") : "Tidak ada"}
Urgency: ${urgency.level} - ${urgency.label}
Action: ${urgency.action}

EVIDENCE RETRIEVAL:
${evidenceContext}

INSTRUKSI OUTPUT:
Buat output JSON valid dengan field berikut:
{
  "summary": "...",
  "whyThisDiagnosis": "...",
  "evidenceBasedExplanation": "...",
  "urgencyExplanation": "...",
  "nextStep": "...",
  "disclaimer": "..."
}

ATURAN PENULISAN:
1. Gunakan Bahasa Indonesia yang akademik tetapi tetap mudah dipahami.
2. Pada field "summary", jelaskan diagnosis Top-1 dan nilai CF secara singkat.
3. Pada field "whyThisDiagnosis", jelaskan gejala mana yang mendukung diagnosis berdasarkan hasil sistem.
4. Pada field "evidenceBasedExplanation", wajib menyebut sumber evidence secara eksplisit, misalnya:
   "Berdasarkan evidence dari ${evidenceSourceNames}, ..."
5. Hubungkan evidence dengan gejala yang dipilih pengguna.
6. Jika ada lebih dari satu sumber, sebutkan peran masing-masing sumber secara ringkas.
7. Jangan membuat klaim medis di luar evidence yang tersedia.
8. Pada field "urgencyExplanation", jelaskan alasan urgency berdasarkan red flag dan hasil sistem.
9. Pada field "nextStep", berikan saran tindak lanjut yang aman.
10. Pada field "disclaimer", tekankan bahwa hasil ini adalah diagnosis awal dan bukan pengganti pemeriksaan dokter.
`;
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
            disclaimer: "Hasil ini merupakan identifikasi awal dan bukan pengganti diagnosis dokter.",
            retrievedEvidence: mapEvidence(retrievedEvidence),
        };
    }
    catch (error) {
        console.error("RAG explanation gagal, fallback ke template:", error);
        return buildTemplateExplanation({
            results: args.results,
            redFlags: args.redFlags,
            urgency: args.urgency,
            retrievedEvidence,
        });
    }
}
