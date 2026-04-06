"use client";

import { useEffect, useMemo, useState } from "react";
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

const confidenceOptions: { label: string; value: AnswerValue; hint: string }[] = [
  { label: "Tidak", value: 0, hint: "Gejala tidak dialami." },
  { label: "Kurang yakin", value: 0.2, hint: "Mungkin ada, tapi belum jelas." },
  { label: "Sedikit yakin", value: 0.4, hint: "Terlihat ringan." },
  { label: "Cukup yakin", value: 0.6, hint: "Cukup terasa." },
  { label: "Yakin", value: 0.8, hint: "Jelas terlihat." },
  { label: "Sangat yakin", value: 1, hint: "Sangat jelas dan kuat." },
];


const BUCKETS: AnswerValue[] = [0, 0.2, 0.4, 0.6, 0.8, 1];

function getConfidenceLabel(value?: number) {
  return (
    confidenceOptions.find((option) => option.value === value)?.label ??
    "Belum dijawab"
  );
}

function toNearestBucket(value: number): AnswerValue {
  return BUCKETS.reduce((best, curr) =>
    Math.abs(curr - value) < Math.abs(best - value) ? curr : best
  );
}

export default function ConsultationPage() {
  const router = useRouter();

  
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

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

  const canProcessDiagnosis =
  !!childName.trim() &&
  childAgeMonths !== null &&
  !!gender &&
  Object.values(answers).some((value) => Number(value) > 0);

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
      setStep("childName");
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

      messages.push({
        id: "age-bot",
        sender: "bot",
        content: "Berapa usia anak dalam bulan?",
      });
    }

    if (childAgeMonths !== null && step !== "childAgeMonths" && childName.trim()) {
      messages.push({
        id: "age-user",
        sender: "user",
        content: `${childAgeMonths} bulan`,
      });

      messages.push({
        id: "gender-bot",
        sender: "bot",
        content: "Apa jenis kelamin anak?",
      });
    }

    if (gender && step !== "gender" && childName.trim()) {
      messages.push({
        id: "gender-user",
        sender: "user",
        content: gender === "MALE" ? "Laki-laki" : "Perempuan",
      });
    }

    symptoms
      .filter((symptom) => answers[symptom.code] !== undefined)
      .forEach((symptom, index) => {
        messages.push({
          id: `symptom-bot-${symptom.code}`,
          sender: "bot",
          content: `${index + 1}. ${symptom.questionText}`,
        });

        messages.push({
          id: `symptom-user-${symptom.code}`,
          sender: "user",
          content: getConfidenceLabel(answers[symptom.code]),
        });
      });

    if (step === "symptoms" && currentSymptom && answers[currentSymptom.code] === undefined) {
      messages.push({
        id: `current-symptom-${currentSymptom.code}`,
        sender: "bot",
        content: `${currentSymptomIndex + 1}. ${currentSymptom.questionText}`,
      });
    }

    if (step === "summary") {
      messages.push({
        id: "summary-bot",
        sender: "bot",
        content:
          "Terima kasih. Saya sudah mencatat jawaban Anda. Silakan periksa ringkasan di bawah sebelum memproses diagnosis.",
      });
    }

    return messages;
  }, [
    aiResult,
    step,
    childName,
    childAgeMonths,
    gender,
    symptoms,
    answers,
    currentSymptom,
    currentSymptomIndex,
  ]);

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
    setStep("childAgeMonths");
  }

  function handleSubmitAge() {
    const parsedAge = Number(ageInput);
    if (!Number.isFinite(parsedAge) || parsedAge < 0) {
      setError("Usia anak harus berupa angka 0 atau lebih.");
      return;
    }

    setError("");
    setChildAgeMonths(parsedAge);
    setStep("gender");
  }

  function handleSelectGender(value: Gender) {
    setError("");
    setGender(value);
    moveToNextMissingStep();
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

    const result = response.data as AiChatbotResult;
    setAiResult(result);

    setAiHistory((prev) => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: result.reply },
    ]);

    setFreeText("");

    const nextName = result.profile.childName ?? childName;
    const nextAge = result.profile.childAgeMonths ?? childAgeMonths;
    const nextGender = result.profile.gender ?? gender;

    setChildName(nextName || "");
    setNameInput(nextName || "");

    setChildAgeMonths(
      typeof nextAge === "number" && Number.isFinite(nextAge) ? nextAge : null
    );
    setAgeInput(
      typeof nextAge === "number" && Number.isFinite(nextAge) ? String(nextAge) : ""
    );

    setGender((nextGender as Gender | "") || "");

    const positiveAnswers: Record<string, AnswerValue> = Object.fromEntries(
      result.structured.symptoms.map((item) => [
        item.code,
        toNearestBucket(item.confidence),
      ])
    );

    const negativeAnswers: Record<string, AnswerValue> = Object.fromEntries(
      result.structured.negativeSymptoms.map((item) => [item.code, 0])
    );

    const aiAnswers: Record<string, AnswerValue> = {
      ...positiveAnswers,
      ...negativeAnswers,
    };

    const mergedAnswers = {
      ...answers,
      ...aiAnswers,
    };

    setAnswers(mergedAnswers);

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

    const formattedAnswers = Object.entries(answers).map(([symptomCode, userCf]) => ({
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
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row">
        <section className="flex-1 rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Konsultasi
            </p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Konsultasi Awal Berbasis Chat
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Jawab pertanyaan secara bertahap. Sistem akan menggunakan jawaban Anda
              sebagai fakta awal untuk proses diagnosis awal.
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-600">
              Memuat data gejala...
            </div>
          ) : error && !symptoms.length ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <>
              <div className="mb-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Konsultasi dengan AI
                    </h2>
                    <p className="text-sm text-gray-600">
                      Tulis keluhan dengan bahasa bebas. AI akan membantu membaca
                      profil anak dan gejala yang disebutkan.
                    </p>
                  </div>

                  {aiResult && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                      Sumber: {aiResult.meta.source}
                    </span>
                  )}
                </div>

                <textarea
                  value={freeText}
                  onChange={(e) => setFreeText(e.target.value)}
                  placeholder="Contoh: Anak saya Raka umur 2 tahun laki-laki, demam dan batuk dari tadi malam."
                  className="min-h-[120px] w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                />

                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleAnalyzeWithAI}
                    disabled={aiLoading || !freeText.trim()}
                    className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {aiLoading ? "Menganalisis..." : "Kirim ke AI"}
                  </button>

                  {canProcessDiagnosis && (
                    <button
                      type="button"
                      onClick={handleProcessDiagnosis}
                      disabled={submitting}
                      className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 hover:border-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Memproses..." : "Proses diagnosis sekarang"}
                    </button>
                  )}

                  {!canProcessDiagnosis && (
                    <button
                      type="button"
                      onClick={() => moveToNextMissingStep()}
                      className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 hover:border-black"
                    >
                      Lengkapi data manual
                    </button>
                  )}
                </div>

                {aiHistory.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {aiHistory.map((item, index) => (
                      <div
                        key={`${item.role}-${index}`}
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          item.role === "assistant"
                            ? "border border-gray-200 bg-white text-gray-800"
                            : "ml-auto bg-black text-white"
                        }`}
                      >
                        {item.content}
                      </div>
                    ))}
                  </div>
                )}

                {aiResult && (
                  <div className="mt-4 rounded-2xl bg-white p-4">
                    <p className="text-sm font-medium text-gray-900">Balasan AI</p>
                    <p className="mt-1 text-sm text-gray-700">{aiResult.reply}</p>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-gray-200 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Nama Anak
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {aiResult.profile.childName || "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Usia
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {aiResult.profile.childAgeMonths ?? "-"} bulan
                        </p>
                      </div>

                      <div className="rounded-2xl border border-gray-200 p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Gender
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {aiResult.profile.gender === "MALE"
                            ? "Laki-laki"
                            : aiResult.profile.gender === "FEMALE"
                            ? "Perempuan"
                            : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-900">
                        Gejala terdeteksi
                      </p>
                      {aiResult.structured.symptoms.length === 0 ? (
                        <p className="mt-1 text-sm text-gray-600">
                          Belum ada gejala yang cocok terdeteksi.
                        </p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {aiResult.structured.symptoms.map((item) => (
                            <span
                              key={item.code}
                              className="rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700"
                            >
                              {item.symptomName} · CF {toNearestBucket(item.confidence)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {aiResult.structured.negativeSymptoms.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-900">Gejala yang disangkal</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {aiResult.structured.negativeSymptoms.map((item) => (
                            <span
                              key={item.code}
                              className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700"
                            >
                              {item.symptomName} · CF 0
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {aiResult.structured.missingFields.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        Data yang masih perlu dilengkapi:{" "}
                        {aiResult.structured.missingFields.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Percakapan Konsultasi
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Data gejala tetap berasal dari basis pengetahuan sistem pakar.
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-black transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">Progres gejala {progress}%</p>
              </div>

              <div className="space-y-3">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                      message.sender === "bot"
                        ? "rounded-bl-md bg-gray-100 text-gray-800"
                        : "ml-auto rounded-br-md bg-black text-white"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                {step === "childName" && (
                  <div className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5">
                    <label className="block text-sm font-medium text-gray-900">
                      Nama anak
                    </label>
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSubmitName();
                      }}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                      placeholder="Contoh: Alya"
                    />
                    <button
                      type="button"
                      onClick={handleSubmitName}
                      className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white"
                    >
                      Lanjut
                    </button>
                  </div>
                )}

                {step === "childAgeMonths" && (
                  <div className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5">
                    <label className="block text-sm font-medium text-gray-900">
                      Usia anak (bulan)
                    </label>
                    <input
                      value={ageInput}
                      onChange={(e) => setAgeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSubmitAge();
                      }}
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                      placeholder="Contoh: 24"
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 hover:border-black"
                      >
                        Kembali
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitAge}
                        className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white"
                      >
                        Lanjut
                      </button>
                    </div>
                  </div>
                )}

                {step === "gender" && (
                  <div className="space-y-3 rounded-3xl border border-gray-200 bg-white p-5">
                    <p className="text-sm font-medium text-gray-900">
                      Pilih jenis kelamin anak
                    </p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => handleSelectGender("MALE")}
                        className="rounded-2xl border border-gray-300 px-4 py-3 text-left hover:border-black"
                      >
                        Laki-laki
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectGender("FEMALE")}
                        className="rounded-2xl border border-gray-300 px-4 py-3 text-left hover:border-black"
                      >
                        Perempuan
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleBack}
                      className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 hover:border-black"
                    >
                      Kembali
                    </button>
                  </div>
                )}

                {step === "symptoms" && currentSymptom && (
                  <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        Gejala {currentSymptomIndex + 1} dari {symptoms.length}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-gray-900">
                        {currentSymptom.name}
                      </h3>
                      <p className="mt-2 text-sm text-gray-700">
                        {currentSymptom.questionText}
                      </p>
                    </div>

                    {currentSymptom.isRedFlag && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        Tanda bahaya / red flag
                      </div>
                    )}

                    <div className="grid gap-3">
                      {confidenceOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            handleSelectAnswer(currentSymptom.code, option.value)
                          }
                          className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-left transition hover:border-black hover:bg-gray-50"
                        >
                          <div className="font-medium text-gray-900">{option.label}</div>
                          <div className="mt-1 text-sm text-gray-600">{option.hint}</div>
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleBack}
                      className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 hover:border-black"
                    >
                      Kembali
                    </button>
                  </div>
                )}

                {step === "summary" && (
                  <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        Ringkasan Konsultasi
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Periksa kembali jawaban sebelum memproses diagnosis.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Nama Anak
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {childName || "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Usia
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {childAgeMonths ?? "-"} bulan
                        </p>
                      </div>

                      <div className="rounded-2xl bg-gray-50 p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          Jenis Kelamin
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {gender === "MALE"
                            ? "Laki-laki"
                            : gender === "FEMALE"
                            ? "Perempuan"
                            : "-"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {symptoms.map((symptom) => (
                        <div
                          key={symptom.id}
                          className="rounded-2xl border border-gray-200 p-4"
                        >
                          <p className="text-sm text-gray-800">{symptom.questionText}</p>
                          <p className="mt-1 text-sm font-medium text-gray-900">
                            Jawaban: {getConfidenceLabel(answers[symptom.code])}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-800 hover:border-black"
                      >
                        Ubah jawaban terakhir
                      </button>

                      <button
                        type="button"
                        onClick={handleProcessDiagnosis}
                        disabled={submitting}
                        className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitting ? "Memproses..." : "Proses Diagnosis"}
                      </button>
                    </div>
                  </div>
                )}

                {error && symptoms.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        <aside className="h-fit w-full rounded-3xl bg-white p-6 shadow-sm lg:w-[340px]">
          <h2 className="text-xl font-semibold text-gray-900">Status Konsultasi</h2>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Nama anak</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {childName || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Usia</p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {childAgeMonths === null ? "-" : `${childAgeMonths} bulan`}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Jenis kelamin
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {gender ? (gender === "MALE" ? "Laki-laki" : "Perempuan") : "-"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Gejala dijawab
              </p>
              <p className="mt-1 text-sm font-medium text-gray-900">
                {answeredCount}/{symptoms.length}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">Catatan</h3>
            <ul className="mt-2 space-y-2 text-sm text-amber-800">
              <li>Jawaban ini dipakai sebagai fakta awal untuk diagnosis awal.</li>
              <li>Hasil sistem bukan pengganti pemeriksaan dokter.</li>
              <li>Jika terdapat tanda bahaya, segera ke fasilitas kesehatan.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}