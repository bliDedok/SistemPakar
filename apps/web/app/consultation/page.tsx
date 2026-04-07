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
    <main className="min-h-screen bg-[#F9FAFB] p-2 md:p-4 font-sans">
      {/* Container utama dilepas dari paksaan h-full di HP, agar bisa di-scroll ke bawah untuk melihat Status Pasien */}
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:h-[90vh] lg:flex-row">
        
        {/* ==========================================
            KOLOM KIRI: CHAT WINDOW
            ========================================== */}
        {/* Di HP, tinggi chat window dipatok 80vh agar luas. Di Laptop, menyesuaikan layar */}
        <section className="relative flex h-[80vh] flex-col overflow-hidden rounded-2xl border border-[#C7BBB5]/30 bg-white shadow-sm lg:h-full lg:flex-1 lg:rounded-3xl">
          
          {/* ZONA 1: HEADER (Shrink-0 agar tidak ikut memipih) */}
          <div className="z-10 flex shrink-0 flex-col justify-between gap-3 border-b border-[#E2E8E5] bg-white p-4 md:flex-row md:items-center md:p-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Konsultasi ChatBot</h1>
              <p className="text-sm text-gray-500">Jawab pertanyaan untuk diagnosis awal.</p>
            </div>
            <div className="w-full md:w-1/3">
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>Progres</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#8BA49A] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

{/* ZONA 2: AREA OBROLAN (Bisa di-scroll) */}
          {/* pb-36 dihapus karena kita tidak pakai absolute positioning lagi di bawah */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            
            {loading && (
              <div className="rounded-2xl border border-dashed border-[#B3B3AC] p-4 text-center text-sm text-gray-500">
                Memuat data sistem pakar...
              </div>
            )}
            {error && !symptoms.length && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {!loading && (
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 md:px-5 text-[14px] md:text-[15px] leading-relaxed shadow-sm ${
                      message.sender === "bot"
                        ? "rounded-bl-sm border border-[#DBC3BE]/40 bg-[#DBC3BE]/20 text-gray-900 font-medium border border-[#dbc3be]/30"
                        : "ml-auto rounded-br-sm bg-[#8BA49A] text-white"
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
                        ? "rounded-bl-sm border border-[#DBC3BE]/40 bg-[#DBC3BE]/20 text-gray-900 font-medium border border-[#dbc3be]/30"
                        : "ml-auto rounded-br-sm bg-[#8BA49A] text-white"
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

            {/* Form Manual */}
            <div className="mt-6">
              {!isTyping && step === "childName" && (
                <div className="space-y-3 rounded-2xl border border-[#C7BBB5]/50 bg-white p-4 shadow-sm md:p-5">
                  <label className="block text-sm font-semibold text-gray-800">Nama anak</label>
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmitName(); }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#8BA49A]"
                    placeholder="Contoh: Alya"
                  />
                  <button onClick={handleSubmitName} className="rounded-xl bg-[#8BA49A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9FABA3]">
                    Lanjut
                  </button>
                </div>
              )}

              {!isTyping && step === "childAgeMonths" && (
                <div className="space-y-3 rounded-2xl border border-[#C7BBB5]/50 bg-white p-4 shadow-sm md:p-5">
                  <label className="block text-sm font-semibold text-gray-800">Usia anak (bulan)</label>
                  <input
                    value={ageInput}
                    onChange={(e) => setAgeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSubmitAge(); }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#8BA49A]"
                    placeholder="Contoh: 24 (untuk 2 tahun)"
                  />
                  <div className="flex gap-3">
                    <button onClick={handleBack} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                      Kembali
                    </button>
                    <button onClick={handleSubmitAge} className="rounded-xl bg-[#8BA49A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9FABA3]">
                      Lanjut
                    </button>
                  </div>
                </div>
              )}

              {!isTyping && step === "gender" && (
                <div className="space-y-3 rounded-2xl border border-[#C7BBB5]/50 bg-white p-4 shadow-sm md:p-5">
                  <p className="text-sm font-semibold text-gray-800">Pilih jenis kelamin anak</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <button onClick={() => handleSelectGender("MALE")} className="rounded-xl border border-gray-300 px-4 py-3 text-left hover:bg-[#8BA49A]/5 hover:border-[#8BA49A]">
                      Laki-laki
                    </button>
                    <button onClick={() => handleSelectGender("FEMALE")} className="rounded-xl border border-gray-300 px-4 py-3 text-left hover:bg-[#8BA49A]/5 hover:border-[#8BA49A]">
                      Perempuan
                    </button>
                  </div>
                  <button onClick={handleBack} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    Kembali
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ZONA 3: INPUT CHAT AREA (Shrink-0 agar diam di bawah, tapi BUKAN absolute) */}
          <div className="z-20 flex shrink-0 flex-col items-center border-t border-[#E2E8E5] bg-white p-3 md:p-4">
            
            {/* Tombol Diagnosis */}
            {canProcessDiagnosis && (
              <button
                type="button"
                onClick={handleProcessDiagnosis}
                disabled={submitting}
                className="mb-3 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#8ba49a] to-[#9faba3] text-white shadow-[#8ba49a]/30 shadow-lg hover:from-[#9faba3] hover:to-[#8ba49a] px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  "Memproses..."
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
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
                  className="mb-1 shrink-0 rounded-full p-2 text-[#9FABA3] transition hover:bg-gray-100 hover:text-gray-800 md:p-3"
                  title="Isi form manual"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-5 w-5 md:h-6 md:w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              )}

              {/* Textarea padding diperkecil dan min-h dihapus agar tidak muncul scrollbar jelek */}
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Ceritakan keluhan anak..."
                rows={1}
                className="flex-1 w-full max-h-[120px] resize-none overflow-y-auto rounded-2xl border border-[#C7BBB5] bg-white px-4 py-3 text-[14px] outline-none focus:border-[#8BA49A] focus:ring-1 focus:ring-[#8BA49A] shadow-sm md:text-[15px]"
              />
              
              <button
                type="button"
                onClick={handleAnalyzeWithAI}
                disabled={aiLoading || !freeText.trim()}
                className="mb-1 flex shrink-0 items-center justify-center rounded-full bg-[#8BA49A] p-2.5 text-white transition hover:bg-[#9FABA3] disabled:cursor-not-allowed disabled:opacity-50 md:p-3"
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
               <p className="mt-2 text-center text-xs font-medium text-red-500">{error}</p>
            )}
          </div>
        </section>

        {/* ==========================================
            KOLOM KANAN: STATUS KONSULTASI
            ========================================== */}
        {/* Di HP dia akan jatuh ke bawah chat, user tinggal scroll halamannya ke bawah */}
        <aside className="flex w-full shrink-0 flex-col overflow-y-auto rounded-2xl border border-[#C7BBB5]/30 border-t-[6px] border-t-[#dbc3be] bg-white shadow-lg shadow-[#dbc3be]/20 lg:h-full lg:w-[320px] lg:rounded-3xl">
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white p-5">
            <h2 className="text-lg font-bold text-gray-900">Status Pasien</h2>
          </div>
          
          <div className="space-y-5 p-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">Nama anak</p>
              <p className="mt-1 text-[15px] font-semibold text-gray-800">{childName || "-"}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">Usia</p>
              <p className="mt-1 text-[15px] font-semibold text-gray-800">
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
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">Jenis kelamin</p>
              <p className="mt-1 text-[15px] font-semibold text-gray-800">{gender ? (gender === "MALE" ? "Laki-laki" : "Perempuan") : "-"}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#9FABA3]">Gejala Dijawab</p>
              <p className="mt-1 text-[15px] font-semibold text-[#8BA49A]">{answeredCount} dari {symptoms.length}</p>
            </div>

            <div className="mt-6 rounded-2xl border border-[#DBC3BE]/30 bg-[#DBC3BE]/10 p-4">
              <h3 className="text-sm font-bold text-gray-800">Catatan Medis</h3>
              <ul className="ml-4 mt-2 list-disc space-y-2 text-xs text-gray-600">
                <li>Sistem ini hanya mendiagnosis awal.</li>
                <li>Bukan pengganti saran dokter asli.</li>
                <li>Jika ada tanda bahaya, segera ke IGD.</li>
              </ul>
            </div>
          </div>
        </aside>

      </div>
    </main>
  );
}