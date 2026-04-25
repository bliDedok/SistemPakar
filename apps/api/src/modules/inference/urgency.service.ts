export type UrgencyLevel = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";

export type UrgencyResult = {
  level: UrgencyLevel;
  label: string;
  reasons: string[];
  action: string;
};

type SelectedSymptomForUrgency = {
  code: string;
  name: string;
  isRedFlag: boolean;
  itemType?: string;
};

type TopDiseaseForUrgency = {
  diseaseName: string;
  severityLevel: string | null;
};

export function determineUrgency(params: {
  selectedSymptoms: SelectedSymptomForUrgency[];
  topDisease?: TopDiseaseForUrgency | null;
}): UrgencyResult {
  const redFlags = params.selectedSymptoms.filter((symptom) => symptom.isRedFlag);

  const emergencySymptomCodes = new Set(["G044", "G045", "G046"]);
  const hasEmergencySymptom = params.selectedSymptoms.some((symptom) =>
    emergencySymptomCodes.has(symptom.code)
  );

  const severity = params.topDisease?.severityLevel?.toLowerCase() ?? null;

  if (hasEmergencySymptom) {
    return {
      level: "EMERGENCY",
      label: "Darurat",
      reasons: [
        ...redFlags.map((symptom) => symptom.name),
        "Terdapat gejala darurat seperti gangguan kesadaran, kejang, atau tanda syok.",
      ],
      action:
        "Segera bawa anak ke IGD atau fasilitas kesehatan terdekat. Jangan menunggu gejala membaik sendiri.",
    };
  }

  if (severity === "critical") {
    return {
      level: "EMERGENCY",
      label: "Darurat",
      reasons: [
        `Diagnosis teratas (${params.topDisease?.diseaseName}) memiliki tingkat keparahan kritis.`,
        ...redFlags.map((symptom) => symptom.name),
      ],
      action:
        "Segera bawa anak ke fasilitas kesehatan untuk pemeriksaan langsung oleh tenaga medis.",
    };
  }

  if (redFlags.length > 0 || severity === "high") {
    return {
      level: "HIGH",
      label: "Prioritas tinggi",
      reasons:
        redFlags.length > 0
          ? redFlags.map((symptom) => symptom.name)
          : [
              `Diagnosis teratas (${params.topDisease?.diseaseName}) memiliki tingkat risiko tinggi.`,
            ],
      action:
        "Sebaiknya anak segera diperiksakan ke dokter atau fasilitas kesehatan, terutama bila gejala menetap atau memburuk.",
    };
  }

  if (severity === "medium") {
    return {
      level: "MEDIUM",
      label: "Perlu pemantauan",
      reasons: [
        `Diagnosis teratas (${params.topDisease?.diseaseName}) berada pada tingkat keparahan sedang.`,
      ],
      action:
        "Pantau kondisi anak, cukupkan cairan dan istirahat, serta konsultasikan ke dokter bila gejala tidak membaik.",
    };
  }

  return {
    level: "LOW",
    label: "Risiko rendah",
    reasons: ["Tidak ditemukan tanda bahaya dari gejala yang diberikan."],
    action:
      "Lakukan pemantauan mandiri. Jika muncul tanda bahaya atau kondisi memburuk, segera periksa ke fasilitas kesehatan.",
  };
}