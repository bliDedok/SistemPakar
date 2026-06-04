import "./DiagnosisResultPanel.css";

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

type MatchedSymptom = {
  symptomCode: string;
  symptomName: string;
  role: string;
};

type DiagnosisResult = {
  rank: number;
  diseaseCode: string;
  diseaseName: string;
  severityLevel?: string | null;
  cfFinal: number;
  cfPercent: number;
  matchCount: number;
  matchedSymptoms: MatchedSymptom[];
  calculationDetails: CalculationDetail[];
  redFlags: string[];
  urgencyLevel?: string;
  advice?: string | null;
};

type Urgency = {
  level: string;
  label: string;
  reasons: string[];
  action: string;
};

type Explanation = {
  source: string;
  summary: string;
  whyThisDiagnosis: string;
  evidenceBasedExplanation: string;
  urgencyExplanation: string;
  nextStep: string;
  disclaimer: string;
  retrievedEvidence: unknown[];
};

type DiagnosisData = {
  consultationId: string;
  rankedResults: DiagnosisResult[];
  top1: DiagnosisResult | null;
  top3: DiagnosisResult[];
  redFlags: string[];
  urgency: Urgency;
  urgencyLevel: string;
  explanation: Explanation;
  ragExplanation: string;
  evidenceSources: unknown[];
};

type Props = {
  data: DiagnosisData | null;
};

function formatPercent(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0%";
  return `${value.toFixed(2).replace(".00", "")}%`;
}

function urgencyClass(level?: string) {
  switch (level) {
    case "EMERGENCY":
      return "urgency-emergency";
    case "HIGH":
      return "urgency-high";
    case "MEDIUM":
      return "urgency-medium";
    default:
      return "urgency-low";
  }
}

export default function DiagnosisResultPanel({ data }: Props) {
  if (!data) {
    return null;
  }

  const top1 = data.top1;
  const top3 = data.top3 ?? [];

  if (!top1) {
    return (
      <section className="diagnosis-result">
        <div className="empty-result-card">
          <h2>Hasil Diagnosis Awal</h2>
          <p>
            Sistem belum menemukan kecocokan penyakit yang cukup kuat berdasarkan
            gejala yang diberikan.
          </p>

          <div className={`urgency-badge ${urgencyClass(data.urgencyLevel)}`}>
            {data.urgency?.label ?? data.urgencyLevel}
          </div>

          <p className="result-note">{data.ragExplanation}</p>
        </div>
      </section>
    );
  }

  const debugRows = top3.flatMap((result) =>
    result.calculationDetails.map((detail) => ({
      diseaseCode: result.diseaseCode,
      diseaseName: result.diseaseName,
      rank: result.rank,
      cfFinal: result.cfFinal,
      cfPercent: result.cfPercent,
      ...detail,
    }))
  );

  return (
    <section className="diagnosis-result">
      <div className="result-header">
        <div>
          <p className="section-label">Hasil Diagnosis Awal</p>
          <h2>{top1.diseaseName}</h2>
          <p className="muted">
            Kode penyakit: {top1.diseaseCode} • Rank #{top1.rank}
          </p>
        </div>

        <div className="cf-score-card">
          <span>CF Final</span>
          <strong>{formatPercent(top1.cfPercent)}</strong>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <h3>Top-1 Diagnosis</h3>
          <p className="diagnosis-name">{top1.diseaseName}</p>
          <p className="muted">
            Cocok dengan {top1.matchCount} gejala yang diberikan pengguna.
          </p>
        </div>

        <div className="summary-card">
          <h3>Urgency Level</h3>
          <div className={`urgency-badge ${urgencyClass(data.urgencyLevel)}`}>
            {data.urgency?.label ?? data.urgencyLevel}
          </div>
          <p className="muted">{data.urgency?.action}</p>
        </div>

        <div className="summary-card">
          <h3>Red Flag</h3>
          {data.redFlags.length > 0 ? (
            <ul className="tag-list">
              {data.redFlags.map((flag) => (
                <li key={flag} className="danger-tag">
                  {flag}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Tidak ada red flag terdeteksi.</p>
          )}
        </div>
      </div>

      <div className="result-section">
        <h3>Top-3 Diagnosis</h3>

        <div className="top3-list">
          {top3.map((result) => (
            <article key={result.diseaseCode} className="top3-card">
              <div>
                <span className="rank-badge">#{result.rank}</span>
                <h4>{result.diseaseName}</h4>
                <p className="muted">
                  {result.diseaseCode} • {result.matchCount} gejala cocok
                </p>
              </div>

              <div className="top3-score">
                {formatPercent(result.cfPercent)}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="result-section">
        <h3>Gejala yang Cocok pada Top-1</h3>

        <div className="matched-symptoms">
          {top1.matchedSymptoms.map((symptom) => (
            <span key={symptom.symptomCode} className="symptom-chip">
              {symptom.symptomName}
              <small>{symptom.role}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="result-section explanation-box">
        <h3>Penjelasan Sistem</h3>
        <p>{data.explanation?.summary}</p>
        <p>{data.explanation?.whyThisDiagnosis}</p>
        <p>{data.explanation?.urgencyExplanation}</p>
        <p className="disclaimer">{data.explanation?.disclaimer}</p>
      </div>

      <div className="result-section">
        <div className="table-header">
          <div>
            <h3>Detail Perhitungan Certainty Factor</h3>
            <p className="muted">
              Tabel ini dapat digunakan untuk kebutuhan Result and Discussion
              artikel.
            </p>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="cf-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Disease</th>
                <th>Symptom</th>
                <th>Role</th>
                <th>MB</th>
                <th>MD</th>
                <th>CF Expert</th>
                <th>CF User</th>
                <th>CF Partial</th>
                <th>CF Final</th>
              </tr>
            </thead>
            <tbody>
              {debugRows.map((row) => (
                <tr key={`${row.diseaseCode}-${row.symptomCode}`}>
                  <td>#{row.rank}</td>
                  <td>
                    <strong>{row.diseaseCode}</strong>
                    <br />
                    <span>{row.diseaseName}</span>
                  </td>
                  <td>
                    <strong>{row.symptomCode}</strong>
                    <br />
                    <span>{row.symptomName}</span>
                  </td>
                  <td>{row.role}</td>
                  <td>{row.mb}</td>
                  <td>{row.md}</td>
                  <td>{row.cfExpert}</td>
                  <td>{row.cfUser}</td>
                  <td>{row.cfPartial}</td>
                  <td>{row.cfFinal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}