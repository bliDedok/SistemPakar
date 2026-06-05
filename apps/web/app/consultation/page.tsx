"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchSymptoms,
  sendChatbotMessage,
  submitDiagnosis,
} from "@/src/lib/api";

type Symptom = {
  id: string;
  code: string;
  name: string;
  questionText: string;
  category: string | null;
  isRedFlag: boolean;
};

type AnswerValue = 0 | 0.2 | 0.4 | 0.6 | 0.8 | 1;
type Gender = "MALE" | "FEMALE";
type Step =
  | "intro"
  | "childName"
  | "childAgeMonths"
  | "gender"
  | "symptoms"
  | "summary";

type ChatMessage = {
  id: string;
  sender: "bot" | "user";
  content: string;
};

type AiSymptomCandidate = {
  code: string;
  confidence: number;
  symptomName: string;
  matchedAlias: string;
};

type AiChatbotResult = {
  reply: string;
  profile: {
    childName?: string | null;
    childAgeMonths?: number | null;
    gender?: Gender | null;
  };
  structured: {
    symptoms: AiSymptomCandidate[];
    negativeSymptoms: {
      code: string;
      symptomName: string;
      matchedAlias: string;
    }[];
    missingFields: string[];
    canDiagnose: boolean;
  };
  meta: {
    source: "llm" | "rule-based-fallback";
    note: string;
  };
};

type AiChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

type PendingConfidenceSymptom = {
  symptomCode: string;
  symptomName: string;
  detectedText?: string;
  suggestedCf: AnswerValue;
};

const BUCKETS: AnswerValue[] = [0, 0.2, 0.4, 0.6, 0.8, 1];

const confidenceOptions: {
  label: string;
  value: AnswerValue;
  description: string;
}[] = [
  {
    label: "Ragu-ragu",
    value: 0.2,
    description: "Gejala belum jelas",
  },
  {
    label: "Sedikit yakin",
    value: 0.4,
    description: "Gejala ringan/agak terlihat",
  },
  {
    label: "Cukup yakin",
    value: 0.6,
    description: "Gejala cukup terlihat",
  },
  {
    label: "Yakin",
    value: 0.8,
    description: "Gejala jelas terlihat",
  },
  {
    label: "Sangat yakin",
    value: 1,
    description: "Gejala sangat jelas/parah",
  },
];

function toNearestBucket(value: number): AnswerValue {
  return BUCKETS.reduce((best, current) =>
    Math.abs(current - value) < Math.abs(best - value) ? current : best
  );
}

function getConfidenceLabel(value?: number) {
  return (
    confidenceOptions.find((option) => option.value === value)?.label ??
    "Belum dijawab"
  );
}

function inferSuggestedCfFromText(text: string): AnswerValue {
  const lowerText = text.toLowerCase();

  const veryStrongWords = [
    "sangat yakin",
    "sangat jelas",
    "sangat parah",
    "parah",
    "berat",
    "jelas sekali",
    "tinggi sekali",
    "tidak sadar",
    "kejang",
    "mimisan",
    "gusi berdarah",
    "sesak berat",
  ];

  const mediumWords = ["cukup", "lumayan", "sedang"];
  const mildWords = ["agak", "ringan", "sedikit", "mulai"];
  const unsureWords = ["mungkin", "sepertinya", "kadang", "kadang-kadang", "belum jelas"];

  if (veryStrongWords.some((word) => lowerText.includes(word))) return 1;
  if (mediumWords.some((word) => lowerText.includes(word))) return 0.6;
  if (mildWords.some((word) => lowerText.includes(word))) return 0.4;
  if (unsureWords.some((word) => lowerText.includes(word))) return 0.2;

  // Default penting:
  // gejala yang hanya disebut biasa tidak langsung dianggap 1.0.
  return 0.8;
}

function formatAgeFromMonths(ageMonths: number | null) {
  if (ageMonths === null) return "-";

  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;

  if (years > 0) {
    return months > 0 ? `${years} tahun ${months} bulan` : `${years} tahun`;
  }

  return `${months} bulan`;
}

export default function ConsultationPage() {
  const router = useRouter();

  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  const [pendingConfidenceSymptoms, setPendingConfidenceSymptoms] = useState<
    PendingConfidenceSymptom[]
  >([]);

  const [step, setStep] = useState<Step>("intro");
  const [currentSymptomIndex, setCurrentSymptomIndex] = useState(0);

  const [childName, setChildName] = useState("");
  const [childAgeMonths, setChildAgeMonths] = useState<number | null>(null);
  const [gender, setGender] = useState<Gender | "">("");

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  const [nameInput, setNameInput] = useState("");
  const [ageInput, setAgeInput] = useState("");

  const [freeText, setFreeText] = useState("");
  const [aiResult, setAiResult] = useState<AiChatbotResult | null>(null);
  const [aiHistory, setAiHistory] = useState<AiChatHistoryItem[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const hasPositiveAnswer = Object.values(answers).some(
    (value) => Number(value) > 0
  );

  const canProcessDiagnosis =
    !!childName.trim() &&
    childAgeMonths !== null &&
    !!gender &&
    hasPositiveAnswer &&
    pendingConfidenceSymptoms.length === 0;

  useEffect(() => {
    async function loadSymptoms() {
      try {
        setLoading(true);
        setError("");

        const response = await fetchSymptoms();
        setSymptoms(response.data ?? []);
      } catch {
        setError("Gagal memuat data gejala.");
      } finally {
        setLoading(false);
      }
    }

    loadSymptoms();
  }, []);

  useEffect(() => {
    if (!loading && symptoms.length > 0 && step === "intro") {
      setIsTyping(true);

      const timer = setTimeout(() => {
        setStep("childName");
        setIsTyping(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [loading, symptoms.length, step]);

  const currentSymptom = useMemo(
    () => symptoms[currentSymptomIndex] ?? null,
    [symptoms, currentSymptomIndex]
  );

  const answeredCount = Object.keys(answers).length;

  const progress =
    symptoms.length > 0 ? Math.round((answeredCount / symptoms.length) * 100) : 0;

  const chatMessages = useMemo(() => {
    const messages: ChatMessage[] = [
      {
        id: "intro-bot",
        sender: "bot",
        content:
          "Halo, saya akan membantu konsultasi awal. Silakan isi data anak terlebih dahulu, lalu saya akan menanyakan gejala satu per satu.",
      },
    ];

    if (aiResult?.reply) {
      messages.push({
        id: "ai-bot-reply",
        sender: "bot",
        content: `AI: ${aiResult.reply}`,
      });
    }

    if (step !== "intro") {
      messages.push({
        id: "name-bot",
        sender: "bot",
        content: "Siapa nama anak yang sedang dikonsultasikan?",
      });
    }

    if (childName.trim()) {
      messages.push({
        id: "name-user",
        sender: "user",
        content: childName,
      });

      if (
        step === "childAgeMonths" ||
        step === "gender" ||
        step === "symptoms" ||
        step === "summary"
      ) {
        messages.push({
          id: "age-bot",
          sender: "bot",
          content: "Berapa usia anak? (Isi dalam hitungan bulan)",
        });
      }
    }

    if (
      childAgeMonths !== null &&
      (step !== "childAgeMonths" || isTyping) &&
      childName.trim()
    ) {
      messages.push({
        id: "age-user",
        sender: "user",
        content: formatAgeFromMonths(childAgeMonths),
      });
    }

    if (step === "gender" || step === "symptoms" || step === "summary") {
      messages.push({
        id: "gender-bot",
        sender: "bot",
        content: "Apa jenis kelamin anak?",
      });
    }

    if (gender && (step !== "gender" || isTyping) && childName.trim()) {
      messages.push({
        id: "gender-user",
        sender: "user",
        content: gender === "MALE" ? "Laki-laki" : "Perempuan",
      });
    }

    if (step === "symptoms" || step === "summary") {
      messages.push({
        id: "symptoms-prompt",
        sender: "bot",
        content:
          "Data diri sudah lengkap. Silakan ceritakan detail keluhan atau gejala yang dialami anak Anda di kolom chat bawah secara bebas.",
      });
    }

    return messages;
  }, [
    aiResult,
    step,
    childName,
    childAgeMonths,
    gender,
    isTyping,
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [
    chatMessages,
    aiHistory,
    isTyping,
    step,
    pendingConfidenceSymptoms.length,
  ]);

  function getSymptomNameByCode(symptomCode: string) {
    const found = symptoms.find((symptom) => symptom.code === symptomCode);

    return found?.name ?? found?.questionText ?? symptomCode;
  }

  function getSuggestedCfForDetectedSymptom(
    item: Partial<AiSymptomCandidate>,
    originalText: string
  ): AnswerValue {
    const detectedText = [originalText, item.matchedAlias, item.symptomName]
      .filter(Boolean)
      .join(" ");

    const inferred = inferSuggestedCfFromText(detectedText);

    // Kalau teks mengandung intensitas khusus, pakai hasil inferensi teks.
    if (inferred !== 0.8) return inferred;

    // Kalau LLM memberi confidence rendah/sedang, tetap boleh dipakai.
    // Tapi kalau LLM memberi 1.0 tanpa kata intensitas, turunkan default ke 0.8.
    if (typeof item.confidence === "number" && item.confidence > 0 && item.confidence < 1) {
      return toNearestBucket(item.confidence);
    }

    return 0.8;
  }

  function moveToNextMissingStep(nextAnswers?: Record<string, AnswerValue>) {
    const mergedAnswers = nextAnswers ?? answers;

    if (!childName.trim()) {
      setStep("childName");
      return;
    }

    if (childAgeMonths === null) {
      setStep("childAgeMonths");
      return;
    }

    if (!gender) {
      setStep("gender");
      return;
    }

    const firstUnansweredIndex = symptoms.findIndex(
      (symptom) => mergedAnswers[symptom.code] === undefined
    );

    if (firstUnansweredIndex >= 0) {
      setCurrentSymptomIndex(firstUnansweredIndex);
      setStep("symptoms");
      return;
    }

    setStep("summary");
  }

  function handleSubmitName() {
    const trimmed = nameInput.trim();

    if (!trimmed) {
      setError("Nama anak belum diisi.");
      return;
    }

    setError("");
    setChildName(trimmed);

    setIsTyping(true);
    setTimeout(() => {
      setStep("childAgeMonths");
      setIsTyping(false);
    }, 1000);
  }

  function handleSubmitAge() {
    const parsedAge = Number(ageInput);

    if (!Number.isFinite(parsedAge) || parsedAge < 0) {
      setError("Usia anak harus berupa angka 0 atau lebih.");
      return;
    }

    setError("");
    setChildAgeMonths(parsedAge);

    setIsTyping(true);
    setTimeout(() => {
      setStep("gender");
      setIsTyping(false);
    }, 1000);
  }

  function handleSelectGender(value: Gender) {
    setError("");
    setGender(value);

    setIsTyping(true);
    setTimeout(() => {
      setStep("symptoms");
      setIsTyping(false);
    }, 1000);
  }

  function handleSelectAnswer(symptomCode: string, value: AnswerValue) {
    setError("");

    const nextAnswers = {
      ...answers,
      [symptomCode]: value,
    };

    setAnswers(nextAnswers);

    const nextIndex = currentSymptomIndex + 1;

    if (nextIndex >= symptoms.length) {
      setStep("summary");
      return;
    }

    setCurrentSymptomIndex(nextIndex);
  }

  function handleBack() {
    setError("");

    if (step === "childAgeMonths") {
      setStep("childName");
      return;
    }

    if (step === "gender") {
      setStep("childAgeMonths");
      return;
    }

    if (step === "symptoms") {
      if (currentSymptomIndex === 0) {
        setStep("gender");
        return;
      }

      const previousIndex = Math.max(currentSymptomIndex - 1, 0);
      const previousSymptom = symptoms[previousIndex];

      if (previousSymptom) {
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[previousSymptom.code];
          return next;
        });
      }

      setCurrentSymptomIndex(previousIndex);
      return;
    }

    if (step === "summary") {
      const answeredSymptoms = symptoms.filter(
        (symptom) => answers[symptom.code] !== undefined
      );

      const lastAnswered = answeredSymptoms[answeredSymptoms.length - 1];

      if (!lastAnswered) {
        setStep("symptoms");
        setCurrentSymptomIndex(0);
        return;
      }

      const symptomIndex = symptoms.findIndex(
        (symptom) => symptom.code === lastAnswered.code
      );

      setAnswers((prev) => {
        const next = { ...prev };
        delete next[lastAnswered.code];
        return next;
      });

      setCurrentSymptomIndex(Math.max(symptomIndex, 0));
      setStep("symptoms");
    }
  }

  function queueSymptomsForConfidenceConfirmation(
  detectedItems: unknown[],
  originalText: string
) {
  if (!Array.isArray(detectedItems) || detectedItems.length === 0) return;

  const normalizedSymptoms = detectedItems
    .map((rawItem): PendingConfidenceSymptom | null => {
      const item = rawItem as Partial<AiSymptomCandidate> & {
        symptomCode?: string;
        name?: string;
        symptom?: {
          code?: string;
          name?: string;
        };
        symptom_id?: string;
        detectedText?: string;
        text?: string;
        suggestedCf?: number;
      };

      const symptomCode =
        item.symptomCode ??
        item.code ??
        item.symptom?.code ??
        item.symptom_id;

      if (!symptomCode || typeof symptomCode !== "string") {
        return null;
      }

      const symptomName =
        item.symptomName ??
        item.name ??
        item.symptom?.name ??
        getSymptomNameByCode(symptomCode);

      const detectedText =
        item.detectedText ??
        item.text ??
        item.matchedAlias ??
        originalText;

      const suggestedCf =
        typeof item.suggestedCf === "number"
          ? toNearestBucket(item.suggestedCf)
          : getSuggestedCfForDetectedSymptom(item, originalText);

      return {
        symptomCode,
        symptomName,
        detectedText,
        suggestedCf,
      };
    })
    .filter((item): item is PendingConfidenceSymptom => item !== null);

  if (normalizedSymptoms.length === 0) return;

  setPendingConfidenceSymptoms((prev) => {
    const existingCodes = new Set([
      ...prev.map((item) => item.symptomCode),
      ...Object.keys(answers),
    ]);

    const uniqueNewSymptoms = normalizedSymptoms.filter(
      (item) => !existingCodes.has(item.symptomCode)
    );

    return [...prev, ...uniqueNewSymptoms];
  });
}

  function handleConfirmSymptomConfidence(
    symptom: PendingConfidenceSymptom,
    userCf: AnswerValue
  ) {
    setError("");

    setAnswers((prev) => ({
      ...prev,
      [symptom.symptomCode]: userCf,
    }));

    setPendingConfidenceSymptoms((prev) =>
      prev.filter((item) => item.symptomCode !== symptom.symptomCode)
    );
  }

  function handleRejectDetectedSymptom(symptomCode: string) {
    setError("");

    setAnswers((prev) => ({
      ...prev,
      [symptomCode]: 0,
    }));

    setPendingConfidenceSymptoms((prev) =>
      prev.filter((item) => item.symptomCode !== symptomCode)
    );
  }

  async function handleAnalyzeWithAI() {
    const userMessage = freeText.trim();

    if (!userMessage) {
      setError("Tulis keluhan atau gejala terlebih dahulu.");
      return;
    }

    try {
      setAiLoading(true);
      setError("");

      const response = await sendChatbotMessage({
        message: userMessage,
        history: aiHistory,
        profile: {
          childName: childName || null,
          childAgeMonths,
          gender: gender || null,
        },
        knownSymptoms: Object.entries(answers).map(([code, currentCf]) => ({
          code,
          currentCf,
        })),
      });

      const responseData = (response as { data?: AiChatbotResult })?.data ?? response;
      const result = responseData as AiChatbotResult;

      setAiResult(result);

      setAiHistory((prev) => [
        ...prev,
        { role: "user", content: userMessage },
        {
          role: "assistant",
          content:
            result.reply ??
            "Saya mendeteksi beberapa gejala. Mohon konfirmasi tingkat keyakinan gejala tersebut.",
        },
      ]);

      const nextName = result.profile?.childName ?? childName;
      const nextAge = result.profile?.childAgeMonths ?? childAgeMonths;
      const nextGender = result.profile?.gender ?? gender;

      setChildName(nextName || "");
      setNameInput(nextName || "");

      setChildAgeMonths(
        typeof nextAge === "number" && Number.isFinite(nextAge) ? nextAge : null
      );

      setAgeInput(
        typeof nextAge === "number" && Number.isFinite(nextAge)
          ? String(nextAge)
          : ""
      );

      setGender((nextGender as Gender | "") || "");

      const detectedSymptoms = result.structured?.symptoms ?? [];
      queueSymptomsForConfidenceConfirmation(detectedSymptoms, userMessage);

      const negativeAnswers: Record<string, AnswerValue> = Object.fromEntries(
        (result.structured?.negativeSymptoms ?? []).map((item) => [item.code, 0])
      );

      const mergedAnswers = {
        ...answers,
        ...negativeAnswers,
      };

      // Catatan penting:
      // Positive symptoms dari AI tidak langsung dimasukkan ke answers.
      // Semuanya masuk ke pendingConfidenceSymptoms dulu agar user memilih CF User.
      setAnswers(mergedAnswers);
      setFreeText("");

      const hasDetectedSymptoms = detectedSymptoms.length > 0;

      if (hasDetectedSymptoms) {
        setStep("summary");
        return;
      }

      const nextCanProcessDiagnosis =
        !!(nextName || "").trim() &&
        nextAge !== null &&
        !!nextGender &&
        Object.values(mergedAnswers).some((value) => Number(value) > 0);

      if (nextCanProcessDiagnosis) {
        setStep("summary");
      } else {
        moveToNextMissingStep(mergedAnswers);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message || "Gagal menganalisis pesan dengan AI."
          : "Gagal menganalisis pesan dengan AI."
      );
    } finally {
      setAiLoading(false);
    }
  }

  async function handleProcessDiagnosis() {
    setError("");

    if (pendingConfidenceSymptoms.length > 0) {
      setError(
        "Masih ada gejala yang perlu dikonfirmasi tingkat keyakinannya sebelum diagnosis diproses."
      );
      return;
    }

    const formattedAnswers = Object.entries(answers)
      .filter(([, userCf]) => Number(userCf) > 0)
      .map(([symptomCode, userCf]) => ({
        symptomCode,
        userCf,
      }));

    if (formattedAnswers.length === 0) {
      setError("Pilih minimal satu gejala terlebih dahulu.");
      return;
    }

    if (!childName.trim() || childAgeMonths === null || !gender) {
      setError("Data anak belum lengkap.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await submitDiagnosis({
        childName,
        childAgeMonths,
        gender,
        answers: formattedAnswers,
      });

      const consultationId = response?.data?.consultationId;

      if (!consultationId) {
        throw new Error("Consultation ID tidak ditemukan.");
      }

      router.push(`/consultation/result?id=${consultationId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message || "Gagal memproses diagnosis."
          : "Gagal memproses diagnosis."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#F9FAFB] bg-[radial-gradient(#C7BBB5_1px,transparent_1px)] [background-size:24px_24px] p-2 font-sans md:p-4">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-white/60" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-4 lg:h-[90vh] lg:flex-row">
        <section className="relative flex h-[80vh] flex-col overflow-hidden rounded-2xl border border-[#C7BBB5]/30 bg-white/80 shadow-sm backdrop-blur-md lg:h-full lg:flex-1 lg:rounded-3xl">
          <div className="z-10 flex shrink-0 flex-col justify-between gap-3 border-b border-[#E2E8E5] bg-white/50 p-4 md:flex-row md:items-center md:p-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Konsultasi ChatBot
              </h1>
              <p className="text-sm text-gray-500">
                Jawab pertanyaan untuk diagnosis awal.
              </p>
            </div>

            <div className="w-full md:w-1/3">
              <div className="mb-1 flex justify-between text-xs font-bold text-gray-500">
                <span>Progres</span>
                <span>{progress}%</span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#8BA49A] shadow-sm transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="custom-scrollbar flex-1 overflow-y-auto p-4 md:p-5">
            {loading && (
              <div className="rounded-2xl border border-dashed border-[#B3B3AC] p-4 text-center text-sm italic text-gray-500">
                Memuat data sistem pakar...
              </div>
            )}

            {error && !symptoms.length && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {!loading && (
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm transition-all duration-300 md:px-5 md:text-[15px] ${
                      message.sender === "bot"
                        ? "rounded-bl-sm border border-[#DBC3BE]/50 bg-[#DBC3BE]/25 font-medium text-gray-900"
                        : "ml-auto rounded-br-sm bg-[#8BA49A] font-medium text-white shadow-md shadow-[#8BA49A]/20"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}

                {aiHistory.map((item, index) => (
                  <div
                    key={`ai-${index}`}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm md:px-5 md:text-[15px] ${
                      item.role === "assistant"
                        ? "rounded-bl-sm border border-[#DBC3BE]/50 bg-[#DBC3BE]/25 font-medium text-gray-900"
                        : "ml-auto rounded-br-sm bg-[#8BA49A] font-medium text-white shadow-md shadow-[#8BA49A]/20"
                    }`}
                  >
                    {item.content}
                  </div>
                ))}

                {(isTyping || aiLoading) && (
                  <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm border border-[#DBC3BE]/40 bg-[#DBC3BE]/20 px-5 py-4 shadow-sm">
                    <div className="flex h-2.5 items-center gap-1.5">
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-gray-500/80"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-gray-500/80"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-2 w-2 animate-bounce rounded-full bg-gray-500/80"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                )}

                {pendingConfidenceSymptoms.length > 0 && (
                  <div className="mx-auto mt-4 w-full max-w-4xl rounded-3xl border border-[#8BA49A]/30 bg-white p-5 shadow-lg shadow-[#8BA49A]/10">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6D847A]">
                          Konfirmasi Gejala
                        </p>
                        <h3 className="mt-1 text-lg font-black text-gray-900">
                          Seberapa yakin gejala ini dialami anak?
                        </h3>
                        <p className="mt-1 text-xs font-medium leading-relaxed text-gray-500">
                          Nilai ini akan digunakan sebagai CF User dalam
                          perhitungan Certainty Factor. Gejala tidak otomatis
                          dianggap 100%.
                        </p>
                      </div>

                      <span className="rounded-full bg-[#8BA49A]/10 px-3 py-1 text-xs font-black text-[#6D847A]">
                        {pendingConfidenceSymptoms.length} gejala
                      </span>
                    </div>

                    <div className="mt-4 space-y-4">
                      {pendingConfidenceSymptoms.map((symptom) => (
                        <div
                          key={symptom.symptomCode}
                          className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
                        >
                          <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
                            <div>
                              <p className="text-sm font-black text-gray-900">
                                {symptom.symptomName}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-gray-500">
                                Kode: {symptom.symptomCode}
                                {symptom.detectedText
                                  ? ` • Terdeteksi dari: "${symptom.detectedText}"`
                                  : ""}
                              </p>
                              <p className="mt-1 text-[11px] font-bold text-[#6D847A]">
                                Rekomendasi awal:{" "}
                                {getConfidenceLabel(symptom.suggestedCf)} / CF{" "}
                                {symptom.suggestedCf}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                handleRejectDetectedSymptom(symptom.symptomCode)
                              }
                              className="w-fit rounded-full border border-red-100 bg-white px-3 py-1 text-[11px] font-black text-red-600 hover:bg-red-50"
                            >
                              Tidak dialami
                            </button>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
                            {confidenceOptions.map((option) => {
                              const isSuggested =
                                option.value === symptom.suggestedCf;

                              return (
                                <button
                                  key={`${symptom.symptomCode}-${option.value}`}
                                  type="button"
                                  onClick={() =>
                                    handleConfirmSymptomConfidence(
                                      symptom,
                                      option.value
                                    )
                                  }
                                  className={`rounded-2xl border px-3 py-2 text-left transition-all ${
                                    isSuggested
                                      ? "border-[#8BA49A] bg-[#8BA49A]/10"
                                      : "border-gray-100 bg-white hover:border-[#8BA49A]/50 hover:bg-[#8BA49A]/5"
                                  }`}
                                >
                                  <p className="text-xs font-black text-gray-900">
                                    {option.label}
                                  </p>
                                  <p className="mt-1 text-[11px] font-bold text-[#6D847A]">
                                    CF {option.value}
                                  </p>
                                  <p className="mt-1 text-[10px] font-medium leading-4 text-gray-500">
                                    {option.description}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} className="h-1" />
              </div>
            )}

            <div className="mt-6">
              {!isTyping && step === "childName" && (
                <div className="animate-in fade-in zoom-in space-y-4 rounded-2xl border-2 border-[#DBC3BE]/30 bg-white p-4 shadow-xl shadow-[#DBC3BE]/10 duration-300 md:p-6">
                  <label className="block text-sm font-bold uppercase tracking-wider text-gray-800">
                    Nama anak
                  </label>
                  <input
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSubmitName();
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-[#8BA49A] focus:bg-white focus:ring-2 focus:ring-[#8BA49A]/20"
                    placeholder="Contoh: Alya"
                  />
                  <button
                    onClick={handleSubmitName}
                    className="w-full rounded-xl bg-[#8BA49A] px-8 py-3 text-sm font-bold text-white transition-all hover:bg-[#6D847A] hover:shadow-lg active:scale-95 md:w-auto"
                  >
                    Lanjut
                  </button>
                </div>
              )}

              {!isTyping && step === "childAgeMonths" && (
                <div className="animate-in fade-in zoom-in space-y-4 rounded-2xl border-2 border-[#DBC3BE]/30 bg-white p-4 shadow-xl shadow-[#DBC3BE]/10 duration-300 md:p-6">
                  <label className="block text-sm font-bold uppercase tracking-wider text-gray-800">
                    Usia anak (bulan)
                  </label>
                  <input
                    value={ageInput}
                    onChange={(event) => setAgeInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleSubmitAge();
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-[#8BA49A] focus:bg-white focus:ring-2 focus:ring-[#8BA49A]/20"
                    placeholder="Contoh: 24 (untuk 2 tahun)"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleBack}
                      className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50"
                    >
                      Kembali
                    </button>
                    <button
                      onClick={handleSubmitAge}
                      className="flex-1 rounded-xl bg-[#8BA49A] px-8 py-3 text-sm font-bold text-white transition-all hover:bg-[#6D847A] hover:shadow-lg active:scale-95 md:flex-none"
                    >
                      Lanjut
                    </button>
                  </div>
                </div>
              )}

              {!isTyping && step === "gender" && (
                <div className="animate-in fade-in zoom-in space-y-4 rounded-2xl border-2 border-[#DBC3BE]/30 bg-white p-4 shadow-xl shadow-[#DBC3BE]/10 duration-300 md:p-6">
                  <p className="text-sm font-bold uppercase tracking-wider text-gray-800">
                    Pilih jenis kelamin anak
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      onClick={() => handleSelectGender("MALE")}
                      className="group flex flex-col items-center justify-center rounded-2xl border-2 border-gray-100 p-4 transition-all hover:border-[#8BA49A] hover:bg-[#8BA49A]/5"
                    >
                      <span className="text-sm font-bold text-gray-700 group-hover:text-[#8BA49A]">
                        Laki-laki
                      </span>
                    </button>

                    <button
                      onClick={() => handleSelectGender("FEMALE")}
                      className="group flex flex-col items-center justify-center rounded-2xl border-2 border-gray-100 p-4 transition-all hover:border-[#8BA49A] hover:bg-[#8BA49A]/5"
                    >
                      <span className="text-sm font-bold text-gray-700 group-hover:text-[#8BA49A]">
                        Perempuan
                      </span>
                    </button>
                  </div>

                  <button
                    onClick={handleBack}
                    className="w-full rounded-xl border border-gray-300 px-6 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50 md:w-auto"
                  >
                    Kembali
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="z-20 flex shrink-0 flex-col items-center border-t border-[#E2E8E5] bg-white/70 p-3 backdrop-blur-md md:p-4">
            {canProcessDiagnosis && (
              <button
                type="button"
                onClick={handleProcessDiagnosis}
                disabled={submitting}
                className="mb-3 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#8ba49a] to-[#9faba3] px-8 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-[#8ba49a]/40 transition-all hover:scale-105 hover:shadow-2xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Memproses...
                  </span>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Proses Diagnosis Sekarang
                  </>
                )}
              </button>
            )}

            {(step === "symptoms" || step === "summary") && (
              <div className="relative mx-auto flex w-full max-w-4xl items-end gap-2">
                {!canProcessDiagnosis && (
                  <button
                    type="button"
                    onClick={() => moveToNextMissingStep()}
                    className="mb-1 shrink-0 rounded-full p-2 text-[#9FABA3] transition-all hover:bg-[#8BA49A]/10 hover:text-[#8BA49A] md:p-3"
                    title="Isi form manual"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                      className="h-5 w-5 md:h-6 md:w-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                  </button>
                )}

                <textarea
                  value={freeText}
                  onChange={(event) => setFreeText(event.target.value)}
                  placeholder="Ceritakan keluhan anak..."
                  rows={1}
                  className="max-h-[120px] w-full flex-1 resize-none overflow-y-auto rounded-2xl border-2 border-[#C7BBB5]/40 bg-white/80 px-4 py-3 text-[14px] font-medium shadow-sm outline-none transition-all focus:border-[#8BA49A] focus:bg-white md:text-[15px]"
                />

                <button
                  type="button"
                  onClick={handleAnalyzeWithAI}
                  disabled={aiLoading || !freeText.trim()}
                  className="mb-1 flex shrink-0 items-center justify-center rounded-full bg-[#8BA49A] p-2.5 text-white shadow-lg shadow-[#8BA49A]/20 transition-all hover:scale-110 hover:bg-[#6D847A] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:p-3"
                >
                  {aiLoading ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="h-5 w-5 md:h-6 md:w-6"
                    >
                      <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                    </svg>
                  )}
                </button>
              </div>
            )}

            {error && symptoms.length > 0 && (
              <p className="mt-2 animate-pulse text-center text-xs font-bold text-red-500">
                {error}
              </p>
            )}
          </div>
        </section>

        <aside className="flex w-full shrink-0 flex-col overflow-y-auto rounded-2xl border border-[#C7BBB5]/30 border-t-[6px] border-t-[#DBC3BE] bg-white/80 shadow-lg shadow-[#DBC3BE]/20 backdrop-blur-md lg:h-full lg:w-[320px] lg:rounded-3xl">
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/50 p-5 backdrop-blur-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <span className="h-2 w-2 rounded-full bg-[#8BA49A]" />
              Status Pasien
            </h2>
          </div>

          <div className="space-y-6 p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9FABA3]">
                Nama anak
              </p>
              <p className="mt-1 text-[16px] font-bold text-gray-800">
                {childName || "-"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9FABA3]">
                Usia
              </p>
              <p className="mt-1 text-[16px] font-bold text-gray-800">
                {formatAgeFromMonths(childAgeMonths)}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9FABA3]">
                Jenis kelamin
              </p>
              <p className="mt-1 text-[16px] font-bold text-gray-800">
                {gender ? (gender === "MALE" ? "Laki-laki" : "Perempuan") : "-"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9FABA3]">
                Gejala Dijawab
              </p>
              <p className="mt-1 flex items-center gap-2 text-[16px] font-bold text-[#8BA49A]">
                {answeredCount}
                <span className="text-[10px] text-gray-400">dari</span>
                {symptoms.length}
              </p>
            </div>

            {pendingConfidenceSymptoms.length > 0 && (
              <div className="rounded-2xl border-2 border-[#8BA49A]/30 bg-[#8BA49A]/10 p-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-800">
                  Perlu Konfirmasi
                </h3>
                <p className="mt-2 text-xs font-semibold leading-relaxed text-gray-600">
                  {pendingConfidenceSymptoms.length} gejala perlu dipilih tingkat
                  keyakinannya sebelum diagnosis diproses.
                </p>
              </div>
            )}

            {Object.entries(answers).filter(([, value]) => Number(value) > 0)
              .length > 0 && (
              <div className="rounded-2xl border-2 border-[#8BA49A]/20 bg-white p-4">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-800">
                  Gejala Terkonfirmasi
                </h3>

                <div className="mt-3 space-y-2">
                  {Object.entries(answers)
                    .filter(([, value]) => Number(value) > 0)
                    .slice(0, 6)
                    .map(([code, value]) => (
                      <div
                        key={code}
                        className="rounded-xl bg-[#F9FAFB] px-3 py-2"
                      >
                        <p className="text-xs font-black text-gray-800">
                          {getSymptomNameByCode(code)}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-[#6D847A]">
                          {getConfidenceLabel(value)} • CF {value}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-2xl border-2 border-[#DBC3BE]/40 bg-[#DBC3BE]/10 p-5 shadow-inner">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-800">
                Penting
              </h3>
              <ul className="ml-3 mt-3 space-y-3 text-[11px] font-semibold leading-relaxed text-gray-600">
                <li className="flex gap-2 font-medium">
                  <span className="text-[#8BA49A]">✦</span>
                  Diagnosis ini bersifat awal.
                </li>
                <li className="flex gap-2 font-medium">
                  <span className="text-[#8BA49A]">✦</span>
                  Bukan pengganti dokter.
                </li>
                <li className="flex gap-2 font-medium">
                  <span className="text-[#8BA49A]">✦</span>
                  Ke IGD jika kondisi darurat.
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}