type CalculationDetail = {
  symptomCode: string;
  symptomName: string;
  role: string;
  mb: number;
  md: number;
  cfExpert: number;
  cfUser: number;
  cfPartial: number;
};

type DiagnosisResult = {
  rank: number;
  diseaseCode: string;
  diseaseName: string;
  severityLevel?: string | null;
  cfFinal: number;
  cfPercent: number;
  matchCount: number;
  matchedSymptoms: {
    symptomCode: string;
    symptomName: string;
    role: string;
  }[];
  calculationDetails: CalculationDetail[];
  redFlags: string[];
  advice?: string | null;
  urgencyLevel?: string;
};

type DiagnosisData = {
  consultationId: string;
  rankedResults: DiagnosisResult[];
  top1: DiagnosisResult | null;
  top3: DiagnosisResult[];
  redFlags: string[];
  urgencyLevel: string;
  urgency?: {
    level: string;
    label: string;
    reasons: string[];
    action: string;
  };
  explanation?: {
    summary: string;
    whyThisDiagnosis: string;
    urgencyExplanation: string;
    disclaimer: string;
  };
  ragExplanation?: string;
};

function formatPercent(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0%";
  return `${value.toFixed(2).replace(".00", "")}%`;
}

function urgencyClass(level?: string) {
  if (level === "EMERGENCY") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (level === "HIGH") {
    return "border-orange-200 bg-orange-50 text-orange-700";
  }

  if (level === "MEDIUM") {
    return "border-yellow-200 bg-yellow-50 text-yellow-700";
  }

  return "border-green-200 bg-green-50 text-green-700";
}

export default function DiagnosisResultPanel({
  data,
}: {
  data: DiagnosisData;
}) {
  const top1 = data.top1;
  const top3 = data.top3 ?? [];

  if (!top1) {
    return (
      <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-green-700">
          Hasil Diagnosis
        </p>
        <h3 className="mt-2 text-sm font-black text-gray-900">
          Belum ada kandidat diagnosis kuat
        </h3>
        <p className="mt-2 text-xs font-medium leading-relaxed text-gray-600">
          {data.ragExplanation ??
            "Gejala belum memenuhi aturan minimum pada knowledge base."}
        </p>
        <div
          className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${urgencyClass(
            data.urgencyLevel
          )}`}
        >
          {data.urgency?.label ?? data.urgencyLevel}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-2xl border border-[#8BA49A]/30 bg-[#8BA49A]/10 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#6D847A]">
          Top-1 Diagnosis
        </p>

        <h3 className="mt-2 text-lg font-black text-gray-900">
          {top1.diseaseName}
        </h3>

        <p className="mt-1 text-xs font-bold text-gray-500">
          {top1.diseaseCode} • Rank #{top1.rank} • {top1.matchCount} gejala cocok
        </p>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              CF Final
            </p>
            <p className="text-2xl font-black text-[#8BA49A]">
              {formatPercent(top1.cfPercent)}
            </p>
          </div>

          <div
            className={`rounded-full border px-3 py-1 text-[11px] font-black ${urgencyClass(
              data.urgencyLevel
            )}`}
          >
            {data.urgency?.label ?? data.urgencyLevel}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-800">
          Top-3 Diagnosis
        </h3>

        <div className="mt-3 space-y-2">
          {top3.map((result) => (
            <div
              key={result.diseaseCode}
              className="rounded-xl border border-gray-100 bg-gray-50 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-gray-900">
                    #{result.rank} {result.diseaseName}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-gray-500">
                    {result.diseaseCode} • {result.matchCount} gejala
                  </p>
                </div>

                <span className="rounded-full bg-[#8BA49A]/10 px-2 py-1 text-[11px] font-black text-[#6D847A]">
                  {formatPercent(result.cfPercent)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-red-100 bg-white p-4">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-800">
          Red Flag
        </h3>

        {data.redFlags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.redFlags.map((flag) => (
              <span
                key={flag}
                className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700"
              >
                {flag}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs font-medium text-gray-500">
            Tidak ada red flag terdeteksi.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-800">
          Penjelasan Sistem
        </h3>

        <p className="mt-3 text-xs font-medium leading-relaxed text-gray-600">
          {data.explanation?.summary ?? data.ragExplanation}
        </p>

        {data.explanation?.whyThisDiagnosis && (
          <p className="mt-2 text-xs font-medium leading-relaxed text-gray-600">
            {data.explanation.whyThisDiagnosis}
          </p>
        )}

        {data.urgency?.action && (
          <p className="mt-3 rounded-xl bg-yellow-50 p-3 text-xs font-bold leading-relaxed text-yellow-800">
            {data.urgency.action}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-gray-800">
          Detail CF Top-1
        </h3>

        <div className="mt-3 max-h-[360px] overflow-auto rounded-xl border border-gray-100">
          <table className="w-full min-w-[720px] text-left text-[11px]">
            <thead className="sticky top-0 bg-gray-50 text-gray-500">
              <tr>
                <th className="p-2">Symptom</th>
                <th className="p-2">MB</th>
                <th className="p-2">MD</th>
                <th className="p-2">CF Expert</th>
                <th className="p-2">CF User</th>
                <th className="p-2">CF Partial</th>
                <th className="p-2">CF Final</th>
              </tr>
            </thead>

            <tbody>
              {top1.calculationDetails.map((detail) => (
                <tr
                  key={detail.symptomCode}
                  className="border-t border-gray-100"
                >
                  <td className="p-2 font-bold text-gray-700">
                    {detail.symptomCode}
                    <br />
                    <span className="font-medium text-gray-500">
                      {detail.symptomName}
                    </span>
                  </td>
                  <td className="p-2">{detail.mb}</td>
                  <td className="p-2">{detail.md}</td>
                  <td className="p-2">{detail.cfExpert}</td>
                  <td className="p-2">{detail.cfUser}</td>
                  <td className="p-2">{detail.cfPartial}</td>
                  <td className="p-2 font-black text-[#8BA49A]">
                    {top1.cfFinal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] font-medium leading-relaxed text-gray-500">
          Rumus: CF Expert = MB - MD, CF Partial = CF Expert × CF User, lalu
          seluruh CF Partial digabung menggunakan CF Combine.
        </p>
      </div>
    </div>
  );
}