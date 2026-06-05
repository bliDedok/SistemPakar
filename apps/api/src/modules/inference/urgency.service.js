const emergencySymptomCodes = new Set([
    "G037", // abnormal breath sound
    "G038", // out of breath / sesak napas
    "G042", // seizure
    "G043", // altered consciousness
    "G044", // severe dehydration signs
]);
const highRiskSymptomCodes = new Set([
    "G002", // fever above 40°C
    "G011", // fast breath
    "G016", // hallucinations
    "G021", // lethargic
    "G035", // very restless
    "G036", // bleeding
    "G039", // chest pain
    "G045", // persistent high fever
    "G046", // severe weakness
]);
const highRiskDiseaseCodes = new Set([
    "P002", // Malaria
    "P003", // Typhoid fever
    "P006", // DBD
    "P007", // Pneumonia
]);
export function determineUrgency(params) {
    const redFlags = params.selectedSymptoms.filter((symptom) => symptom.isRedFlag);
    const emergencySymptoms = params.selectedSymptoms.filter((symptom) => emergencySymptomCodes.has(symptom.code));
    const highRiskSymptoms = params.selectedSymptoms.filter((symptom) => highRiskSymptomCodes.has(symptom.code));
    const severity = params.topDisease?.severityLevel?.toLowerCase() ?? null;
    const topCfFinal = params.topCfFinal ?? 0;
    const topDiseaseCode = params.topDiseaseCode ?? null;
    if (emergencySymptoms.length > 0) {
        return {
            level: "EMERGENCY",
            label: "Darurat",
            reasons: [
                ...emergencySymptoms.map((symptom) => symptom.name),
                "Terdapat tanda bahaya berat yang membutuhkan pemeriksaan segera.",
            ],
            action: "Segera bawa anak ke IGD atau fasilitas kesehatan terdekat. Jangan menunggu gejala membaik sendiri.",
        };
    }
    if (severity === "critical" && redFlags.length > 0) {
        return {
            level: "EMERGENCY",
            label: "Darurat",
            reasons: [
                `Diagnosis teratas (${params.topDisease?.diseaseName}) memiliki tingkat risiko kritis.`,
                ...redFlags.map((symptom) => symptom.name),
            ],
            action: "Segera bawa anak ke fasilitas kesehatan untuk pemeriksaan langsung oleh tenaga medis.",
        };
    }
    if (highRiskSymptoms.length > 0 ||
        severity === "high" ||
        (topDiseaseCode && highRiskDiseaseCodes.has(topDiseaseCode) && topCfFinal >= 0.75)) {
        return {
            level: "HIGH",
            label: "Prioritas tinggi",
            reasons: highRiskSymptoms.length > 0
                ? highRiskSymptoms.map((symptom) => symptom.name)
                : [
                    `Diagnosis teratas (${params.topDisease?.diseaseName}) memiliki risiko tinggi atau nilai CF yang kuat.`,
                ],
            action: "Sebaiknya anak segera diperiksakan ke dokter atau fasilitas kesehatan, terutama bila gejala menetap atau memburuk.",
        };
    }
    if (redFlags.length > 0 || topCfFinal >= 0.5 || severity === "medium") {
        return {
            level: "MEDIUM",
            label: "Perlu pemantauan",
            reasons: redFlags.length > 0
                ? redFlags.map((symptom) => symptom.name)
                : ["Gejala cukup relevan dan perlu dipantau."],
            action: "Pantau kondisi anak, cukupkan cairan dan istirahat, serta konsultasikan ke dokter bila gejala tidak membaik.",
        };
    }
    return {
        level: "LOW",
        label: "Risiko rendah",
        reasons: ["Tidak ditemukan tanda bahaya berat dari gejala yang diberikan."],
        action: "Lakukan pemantauan mandiri. Jika muncul tanda bahaya atau kondisi memburuk, segera periksa ke fasilitas kesehatan.",
    };
}
