"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchSymptoms, submitDiagnosis } from "@/src/lib/api";

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
type Step = "intro" | "childName" | "childAgeMonths" | "gender" | "symptoms" | "summary";

type ChatMessage = {
  id: string;
  sender: "bot" | "user";
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

function getConfidenceLabel(value?: number) {
  return confidenceOptions.find((option) => option.value === value)?.label ?? "Belum dijawab";
}

export default function ConsultationPage() {
  const router = useRouter();

  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [step, setStep] = useState<Step>("intro");
  const [currentSymptomIndex, setCurrentSymptomIndex] = useState(0);

  const [childName, setChildName] = useState("");
  const [childAgeMonths, setChildAgeMonths] = useState<number | "">(24);
  const [gender, setGender] = useState<Gender | "">("");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

  const [nameInput, setNameInput] = useState("");
  const [ageInput, setAgeInput] = useState("24");

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
  const progress = symptoms.length > 0 ? Math.round((answeredCount / symptoms.length) * 100) : 0;

  const chatMessages = useMemo<ChatMessage[]>(() => {
    const messages: ChatMessage[] = [
      {
        id: "intro-bot",
        sender: "bot",
        content:
          "Halo, saya akan membantu konsultasi awal. Silakan isi data anak terlebih dahulu, lalu saya akan menanyakan gejala satu per satu.",
      },
    ];

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

    if (childAgeMonths !== "" && step !== "childAgeMonths" && childName.trim()) {
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

    symptoms.slice(0, answeredCount).forEach((symptom, index) => {
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

    if (step === "symptoms" && currentSymptom) {
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
  }, [step, childName, childAgeMonths, gender, symptoms, answeredCount, answers, currentSymptom, currentSymptomIndex]);

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
    setStep("symptoms");
  }

  function handleSelectAnswer(symptomCode: string, value: AnswerValue) {
    setError("");

    setAnswers((prev) => ({
      ...prev,
      [symptomCode]: value,
    }));

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

      const previousSymptom = symptoms[currentSymptomIndex - 1];
      if (previousSymptom) {
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[previousSymptom.code];
          return next;
        });
      }
      setCurrentSymptomIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (step === "summary") {
      const previousSymptom = symptoms[symptoms.length - 1];
      if (previousSymptom) {
        setAnswers((prev) => {
          const next = { ...prev };
          delete next[previousSymptom.code];
          return next;
        });
      }
      setCurrentSymptomIndex(Math.max(symptoms.length - 1, 0));
      setStep("symptoms");
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

    if (!childName.trim() || childAgeMonths === "" || !gender) {
      setError("Data anak belum lengkap.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await submitDiagnosis({
      childName,
      childAgeMonths: Number(childAgeMonths),
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
    <main className="mx-auto min-h-screen max-w-5xl p-6">
      <div className="mb-8">
        <p className="text-sm text-gray-500">Konsultasi</p>
        <h1 className="text-4xl font-bold">Konsultasi Awal Berbasis Chat</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Jawab pertanyaan secara bertahap. Sistem akan menggunakan jawaban Anda sebagai
          fakta awal untuk proses diagnosis awal.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          Memuat data gejala...
        </div>
      ) : error && !symptoms.length ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Percakapan Konsultasi</h2>
                <p className="text-sm text-gray-500">
                  Data gejala tetap berasal dari basis pengetahuan sistem pakar.
                </p>
              </div>
              <div className="min-w-36">
                <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Progres gejala</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-black transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl bg-gray-50 p-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "bot" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      message.sender === "bot"
                        ? "bg-white text-gray-800"
                        : "bg-black text-white"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-3xl border border-gray-200 p-4">
              {step === "childName" && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Nama anak</label>
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmitName();
                    }}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                    placeholder="Contoh: Alya"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSubmitName}
                      className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
                    >
                      Lanjut
                    </button>
                  </div>
                </div>
              )}

              {step === "childAgeMonths" && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Usia anak (bulan)</label>
                  <input
                    type="number"
                    min={0}
                    value={ageInput}
                    onChange={(e) => setAgeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmitAge();
                    }}
                    className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:border-black"
                  />
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="rounded-full border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700"
                    >
                      Kembali
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitAge}
                      className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white"
                    >
                      Lanjut
                    </button>
                  </div>
                </div>
              )}

              {step === "gender" && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Pilih jenis kelamin anak</p>
                  <div className="grid gap-3 sm:grid-cols-2">
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
                    className="rounded-full border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700"
                  >
                    Kembali
                  </button>
                </div>
              )}

              {step === "symptoms" && currentSymptom && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Gejala {currentSymptomIndex + 1} dari {symptoms.length}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{currentSymptom.name}</h3>
                    <p className="mt-1 text-sm text-gray-600">{currentSymptom.questionText}</p>
                    {currentSymptom.isRedFlag && (
                      <p className="mt-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                        Tanda bahaya / red flag
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {confidenceOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleSelectAnswer(currentSymptom.code, option.value)}
                        className="rounded-2xl border border-gray-300 bg-white px-4 py-3 text-left transition hover:border-black hover:bg-gray-50"
                      >
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="mt-1 text-xs text-gray-500">{option.hint}</div>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleBack}
                    className="rounded-full border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700"
                  >
                    Kembali
                  </button>
                </div>
              )}

              {step === "summary" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">Ringkasan Konsultasi</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Periksa kembali jawaban sebelum memproses diagnosis.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4 text-sm">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-gray-500">Nama Anak</p>
                        <p className="font-medium">{childName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Usia</p>
                        <p className="font-medium">{childAgeMonths} bulan</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Jenis Kelamin</p>
                        <p className="font-medium">
                          {gender === "MALE" ? "Laki-laki" : "Perempuan"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-72 space-y-3 overflow-auto pr-2">
                    {symptoms.map((symptom) => (
                      <div key={symptom.code} className="rounded-2xl border border-gray-200 p-4">
                        <p className="text-sm font-medium text-gray-900">{symptom.questionText}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          Jawaban: {getConfidenceLabel(answers[symptom.code])}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="rounded-full border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700"
                    >
                      Ubah jawaban terakhir
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessDiagnosis}
                      disabled={submitting}
                      className="rounded-full bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
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
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Status Konsultasi</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Nama anak</span>
                  <span className="font-medium">{childName || "-"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Usia</span>
                  <span className="font-medium">
                    {childAgeMonths === "" ? "-" : `${childAgeMonths} bulan`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Jenis kelamin</span>
                  <span className="font-medium">
                    {gender ? (gender === "MALE" ? "Laki-laki" : "Perempuan") : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Gejala dijawab</span>
                  <span className="font-medium">
                    {answeredCount}/{symptoms.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Catatan</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-600">
                <li>Jawaban ini dipakai sebagai fakta awal untuk diagnosis awal.</li>
                <li>Hasil sistem bukan pengganti pemeriksaan dokter.</li>
                <li>Jika terdapat tanda bahaya, segera ke fasilitas kesehatan.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
