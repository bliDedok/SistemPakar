"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
        content: "Halo, saya akan membantu konsultasi awal. Silakan isi data anak terlebih dahulu, lalu saya akan menanyakan gejala satu per satu.",
      },
    ];

    if (aiResult?.reply) {
      messages.push({ id: "ai-bot-reply", sender: "bot", content: `AI: ${aiResult.reply}` });
    }

    if (step !== "intro") {
      messages.push({ id: "name-bot", sender: "bot", content: "Siapa nama anak yang sedang dikonsultasikan?" });
    }

    if (childName.trim()) {
      messages.push({ id: "name-user", sender: "user", content: childName });

      // Pertanyaan Bot (Menunggu step pindah / animasi selesai)
      if (step === "childAgeMonths" || step === "gender" || step === "symptoms" || step === "summary") {
        messages.push({ id: "age-bot", sender: "bot", content: "Berapa usia anak? (Isi dalam hitungan bulan)" });
      }
    }

    // Jawaban Umur User (Muncul instan saat sedang 'isTyping' atau saat step sudah lewat)
    if (childAgeMonths !== null && (step !== "childAgeMonths" || isTyping) && childName.trim()) {
      const years = Math.floor(childAgeMonths / 12);
      const months = childAgeMonths % 12;
      const ageString = years > 0 
        ? (months > 0 ? `${years} tahun ${months} bulan` : `${years} tahun`)
        : `${months} bulan`;
        
      messages.push({ id: "age-user", sender: "user", content: ageString });
    }

    // Pertanyaan Gender Bot (Menunggu step pindah / animasi selesai)
    if (step === "gender" || step === "symptoms" || step === "summary") {
      messages.push({ id: "gender-bot", sender: "bot", content: "Apa jenis kelamin anak?" });
    }

    // Jawaban Gender User (Muncul instan)
    if (gender && (step !== "gender" || isTyping) && childName.trim()) {
      messages.push({ id: "gender-user", sender: "user", content: gender === "MALE" ? "Laki-laki" : "Perempuan" });
    }

    // Perintah Ngetik Bebas (Menunggu step pindah / animasi selesai)
    if (step === "symptoms" || step === "summary") {
      messages.push({
        id: "symptoms-prompt",
        sender: "bot",
        content: "Data diri sudah lengkap. Silakan ceritakan detail keluhan atau gejala yang dialami anak Anda di kolom chat bawah secara bebas.",
      });
    }

    // if (step === "summary") {
    //   messages.push({
    //     id: "summary-bot",
    //     sender: "bot",
    //     content: "Terima kasih. Saya sudah mencatat jawaban Anda. Silakan periksa ringkasan di samping sebelum memproses diagnosis.",
    //   });
    // }

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
    isTyping,
  ]);

  useEffect(() => {
    // Fungsi ini akan menarik layar ke bawah secara halus (smooth)
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, aiHistory, isTyping, step]);

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
    if (!trimmed) { setError("Nama anak belum diisi."); return; }
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
    if (!Number.isFinite(parsedAge) || parsedAge < 0) { setError("Usia anak harus berupa angka 0 atau lebih."); return; }
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
  <main className="relative min-h-[100dvh] bg-[#F9FAFB] bg-[radial-gradient(#C7BBB5_1px,transparent_1px)] [background-size:24px_24px] p-2 md:p-4 font-sans overflow-hidden">
    <div className="pointer-events-none absolute inset-0 -z-10 bg-white/60"></div>
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-4 lg:h-[90vh] lg:flex-row">
        
        <section className="relative flex h-[80vh] flex-col overflow-hidden rounded-2xl border border-[#C7BBB5]/30 bg-white/80 backdrop-blur-md shadow-sm lg:h-full lg:flex-1 lg:rounded-3xl">
          <div className="z-10 flex shrink-0 flex-col justify-between gap-3 border-b border-[#E2E8E5] bg-white/50 p-4 md:flex-row md:items-center md:p-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Konsultasi ChatBot</h1>
              <p className="text-sm text-gray-500">Jawab pertanyaan untuk diagnosis awal.</p>
            </div>
            <div className="w-full md:w-1/3">
              <div className="mb-1 flex justify-between text-xs text-gray-500 font-bold">
                <span>Progres</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#8BA49A] transition-all duration-500 shadow-sm"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar">
            {loading && (
              <div className="rounded-2xl border border-dashed border-[#B3B3AC] p-4 text-center text-sm text-gray-500 italic">
                Memuat data sistem pakar...
              </div>
            )}
            {error && !symptoms.length && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}

            {!loading && (
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 md:px-5 text-[14px] md:text-[15px] leading-relaxed shadow-sm transition-all duration-300 ${
                      message.sender === "bot"
                        ? "rounded-bl-sm border border-[#DBC3BE]/50 bg-[#DBC3BE]/25 text-gray-900 font-medium"
                        : "ml-auto rounded-br-sm bg-[#8BA49A] text-white font-medium shadow-[#8BA49A]/20 shadow-md"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}

                {aiHistory.map((item, index) => (
                  <div
                    key={`ai-${index}`}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 md:px-5 text-[14px] md:text-[15px] leading-relaxed shadow-sm ${
                      item.role === "assistant"
                        ? "rounded-bl-sm border border-[#DBC3BE]/50 bg-[#DBC3BE]/25 text-gray-900 font-medium"
                        : "ml-auto rounded-br-sm bg-[#8BA49A] text-white font-medium shadow-[#8BA49A]/20 shadow-md"
                    }`}
                  >
                    {item.content}
                  </div>
                ))}
                
                {(isTyping || aiLoading) && (
                  <div className="max-w-[85%] rounded-2xl px-5 py-4 w-fit shadow-sm rounded-bl-sm border border-[#DBC3BE]/40 bg-[#DBC3BE]/20">
                    <div className="flex gap-1.5 items-center h-2.5">
                      <span className="w-2 h-2 bg-gray-500/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-500/80 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-500/80 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} className="h-1" />  
              </div>
            )}

            <div className="mt-6">
              {!isTyping && step === "childName" && (
                <div className="space-y-4 rounded-2xl border-2 border-[#DBC3BE]/30 bg-white p-4 shadow-xl shadow-[#DBC3BE]/10 md:p-6 animate-in fade-in zoom-in duration-300">
                  <label className="block text-sm font-bold text-gray-800 uppercase tracking-wider">Nama anak</label>
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmitName(); }}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-[#8BA49A] focus:bg-white focus:ring-2 focus:ring-[#8BA49A]/20"
                    placeholder="Contoh: Alya"
                  />
                  <button onClick={handleSubmitName} className="w-full md:w-auto rounded-xl bg-[#8BA49A] px-8 py-3 text-sm font-bold text-white transition-all hover:bg-[#6D847A] hover:shadow-lg active:scale-95">
                    Lanjut
                  </button>
                </div>
              )}

              {!isTyping && step === "childAgeMonths" && (
                <div className="space-y-4 rounded-2xl border-2 border-[#DBC3BE]/30 bg-white p-4 shadow-xl shadow-[#DBC3BE]/10 md:p-6 animate-in fade-in zoom-in duration-300">
                  <label className="block text-sm font-bold text-gray-800 uppercase tracking-wider">Usia anak (bulan)</label>
                  <input
                    value={ageInput}
                    onChange={(e) => setAgeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmitAge(); }}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-all focus:border-[#8BA49A] focus:bg-white focus:ring-2 focus:ring-[#8BA49A]/20"
                    placeholder="Contoh: 24 (untuk 2 tahun)"
                  />
                  <div className="flex gap-3">
                    <button onClick={handleBack} className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50">
                      Kembali
                    </button>
                    <button onClick={handleSubmitAge} className="flex-1 md:flex-none rounded-xl bg-[#8BA49A] px-8 py-3 text-sm font-bold text-white transition-all hover:bg-[#6D847A] hover:shadow-lg active:scale-95">
                      Lanjut
                    </button>
                  </div>
                </div>
              )}

              {!isTyping && step === "gender" && (
                <div className="space-y-4 rounded-2xl border-2 border-[#DBC3BE]/30 bg-white p-4 shadow-xl shadow-[#DBC3BE]/10 md:p-6 animate-in fade-in zoom-in duration-300">
                  <p className="text-sm font-bold text-gray-800 uppercase tracking-wider">Pilih jenis kelamin anak</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <button onClick={() => handleSelectGender("MALE")} className="group flex flex-col items-center justify-center rounded-2xl border-2 border-gray-100 p-4 transition-all hover:border-[#8BA49A] hover:bg-[#8BA49A]/5">
                      <span className="text-sm font-bold text-gray-700 group-hover:text-[#8BA49A]">Laki-laki</span>
                    </button>
                    <button onClick={() => handleSelectGender("FEMALE")} className="group flex flex-col items-center justify-center rounded-2xl border-2 border-gray-100 p-4 transition-all hover:border-[#8BA49A] hover:bg-[#8BA49A]/5">
                      <span className="text-sm font-bold text-gray-700 group-hover:text-[#8BA49A]">Perempuan</span>
                    </button>
                  </div>
                  <button onClick={handleBack} className="w-full md:w-auto rounded-xl border border-gray-300 px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">
                    Kembali
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="z-20 flex shrink-0 flex-col items-center border-t border-[#E2E8E5] bg-white/70 backdrop-blur-md p-3 md:p-4">
            
            {canProcessDiagnosis && (
              <button
                type="button"
                onClick={handleProcessDiagnosis}
                disabled={submitting}
                className="mb-3 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#8ba49a] to-[#9faba3] px-8 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-[#8ba49a]/40 shadow-xl transition-all hover:scale-105 hover:shadow-2xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span> Memproses...</span>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path fillRule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 0 13.5 6.75 6.75 0 0 0 0-13.5ZM2.25 10.5a8.25 8.25 0 1 1 14.59 5.28l4.69 4.69a.75.75 0 1 1-1.06 1.06l-4.69-4.69A8.25 8.25 0 0 1 2.25 10.5Z" clipRule="evenodd" />
                    </svg>
                    Proses Diagnosis Sekarang
                  </>
                )}
              </button>
            )}

            {(step === "symptoms" || step === "summary") && (
            <div className="mx-auto flex w-full max-w-4xl items-end gap-2 relative">
              
              {!canProcessDiagnosis && (
                <button
                  type="button"
                  onClick={() => moveToNextMissingStep()}
                  className="mb-1 shrink-0 rounded-full p-2 text-[#9FABA3] transition-all hover:bg-[#8BA49A]/10 hover:text-[#8BA49A] md:p-3"
                  title="Isi form manual"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-5 w-5 md:h-6 md:w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              )}

              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Ceritakan keluhan anak..."
                rows={1}
                className="flex-1 w-full max-h-[120px] resize-none overflow-y-auto rounded-2xl border-2 border-[#C7BBB5]/40 bg-white/80 px-4 py-3 text-[14px] font-medium outline-none transition-all focus:border-[#8BA49A] focus:bg-white shadow-sm md:text-[15px]"
              />
              
              <button
                type="button"
                onClick={handleAnalyzeWithAI}
                disabled={aiLoading || !freeText.trim()}
                className="mb-1 flex shrink-0 items-center justify-center rounded-full bg-[#8BA49A] p-2.5 text-white shadow-lg shadow-[#8BA49A]/20 transition-all hover:bg-[#6D847A] hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:p-3"
              >
                {aiLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"></span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 md:h-6 md:w-6">
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                )}
              </button>
            </div>
            )}
            
            {error && symptoms.length > 0 && (
               <p className="mt-2 text-center text-xs font-bold text-red-500 animate-pulse">{error}</p>
            )}
          </div>
        </section>

        <aside className="flex w-full shrink-0 flex-col overflow-y-auto rounded-2xl border border-[#C7BBB5]/30 border-t-[6px] border-t-[#DBC3BE] bg-white/80 backdrop-blur-md shadow-lg shadow-[#DBC3BE]/20 lg:h-full lg:w-[320px] lg:rounded-3xl">
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/50 p-5 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
               <span className="h-2 w-2 rounded-full bg-[#8BA49A]"></span>
               Status Pasien
            </h2>
          </div>
          
          <div className="space-y-6 p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9FABA3]">Nama anak</p>
              <p className="mt-1 text-[16px] font-bold text-gray-800">{childName || "-"}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9FABA3]">Usia</p>
              <p className="mt-1 text-[16px] font-bold text-gray-800">
                {childAgeMonths === null 
                  ? "-" 
                  : (() => {
                      const y = Math.floor(childAgeMonths / 12);
                      const m = childAgeMonths % 12;
                      return y > 0 ? (m > 0 ? `${y} tahun ${m} bulan` : `${y} tahun`) : `${m} bulan`;
                    })()
                }
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9FABA3]">Jenis kelamin</p>
              <p className="mt-1 text-[16px] font-bold text-gray-800">{gender ? (gender === "MALE" ? "Laki-laki" : "Perempuan") : "-"}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#9FABA3]">Gejala Dijawab</p>
              <p className="mt-1 text-[16px] font-bold text-[#8BA49A] flex items-center gap-2">
                {answeredCount} <span className="text-[10px] text-gray-400">dari</span> {symptoms.length}
              </p>
            </div>

            <div className="mt-6 rounded-2xl border-2 border-[#DBC3BE]/40 bg-[#DBC3BE]/10 p-5 shadow-inner">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-800">Penting</h3>
              <ul className="ml-3 mt-3 space-y-3 text-[11px] font-semibold leading-relaxed text-gray-600">
                <li className="flex gap-2 font-medium"><span className="text-[#8BA49A]">✦</span> Diagnosis ini bersifat awal.</li>
                <li className="flex gap-2 font-medium"><span className="text-[#8BA49A]">✦</span> Bukan pengganti dokter.</li>
                <li className="flex gap-2 font-medium"><span className="text-[#8BA49A]">✦</span> Ke IGD jika kondisi darurat.</li>
              </ul>
            </div>
          </div>
        </aside>

      </div>
    </main>
  );
}