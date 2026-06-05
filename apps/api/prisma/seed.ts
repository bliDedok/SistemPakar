import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  InputTier,
  KeepStatus,
  RuleOperator,
  SymptomItemType,
  SymptomRole,
  UrgencyMode,
} from "../src/generated/prisma/enums";
import { normalizeText } from "../src/shared/utils/normalize-text";
import { generateEmbedding } from "../src/modules/rag/embedding.service";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

function calculateCfExpert(mb: number, md: number): number {
  const value = mb - md;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Number(value.toFixed(4))));
}

const symptoms = [
  {
    code: "G001",
    name: "Fever / Demam",
    normalizedName: normalizeText("Fever Demam"),
    questionText: "Apakah anak mengalami demam?",
    category: "general",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G002",
    name: "Fever above 40°C / Demam di atas 40°C",
    normalizedName: normalizeText("Fever above 40°C Demam di atas 40°C"),
    questionText: "Apakah anak mengalami demam sangat tinggi di atas 40°C?",
    category: "general",
    itemType: SymptomItemType.WARNING,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: true,
    isAskable: true,
  },
  {
    code: "G003",
    name: "Loss of appetite / Nafsu makan menurun",
    normalizedName: normalizeText("Loss of appetite Nafsu makan menurun"),
    questionText: "Apakah nafsu makan anak menurun atau anak malas makan?",
    category: "digestive",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G004",
    name: "Dry cough / Batuk kering",
    normalizedName: normalizeText("Dry cough Batuk kering"),
    questionText: "Apakah anak mengalami batuk kering?",
    category: "respiratory",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G005",
    name: "Watery eyes / Mata berair",
    normalizedName: normalizeText("Watery eyes Mata berair"),
    questionText: "Apakah mata anak tampak berair?",
    category: "eye",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G006",
    name: "Rash appears / Muncul ruam",
    normalizedName: normalizeText("Rash appears Muncul ruam"),
    questionText: "Apakah muncul ruam pada kulit anak?",
    category: "skin",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER_OR_CLINICIAN,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G007",
    name: "Koplik spots / Bercak Koplik",
    normalizedName: normalizeText("Koplik spots Bercak Koplik"),
    questionText: "Apakah muncul bercak putih kecil di mulut, pipi bagian dalam, atau tenggorokan?",
    category: "mouth",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER_OR_CLINICIAN,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G008",
    name: "Headache / Sakit kepala",
    normalizedName: normalizeText("Headache Sakit kepala"),
    questionText: "Apakah anak mengalami sakit kepala?",
    category: "general",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G009",
    name: "Stomach ache / Sakit perut",
    normalizedName: normalizeText("Stomach ache Sakit perut"),
    questionText: "Apakah anak mengalami sakit perut?",
    category: "digestive",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G010",
    name: "Hard to sleep / Sulit tidur",
    normalizedName: normalizeText("Hard to sleep Sulit tidur"),
    questionText: "Apakah anak sulit tidur?",
    category: "behavior",
    itemType: SymptomItemType.CONTEXT,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G011",
    name: "Fast breath / Napas cepat",
    normalizedName: normalizeText("Fast breath Napas cepat"),
    questionText: "Apakah napas anak tampak lebih cepat dari biasanya?",
    category: "respiratory",
    itemType: SymptomItemType.WARNING,
    defaultInputTier: InputTier.CAREGIVER_OR_CLINICIAN,
    isRedFlag: true,
    isAskable: true,
  },
  {
    code: "G012",
    name: "Fussy / Rewel",
    normalizedName: normalizeText("Fussy Rewel"),
    questionText: "Apakah anak tampak rewel atau mudah marah?",
    category: "behavior",
    itemType: SymptomItemType.CONTEXT,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G013",
    name: "Vomit / Muntah",
    normalizedName: normalizeText("Vomit Muntah"),
    questionText: "Apakah anak mengalami muntah?",
    category: "digestive",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G014",
    name: "Shivering / Menggigil",
    normalizedName: normalizeText("Shivering Menggigil"),
    questionText: "Apakah anak mengalami menggigil?",
    category: "general",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G015",
    name: "Sweating a lot / Banyak berkeringat",
    normalizedName: normalizeText("Sweating a lot Banyak berkeringat"),
    questionText: "Apakah anak berkeringat sangat banyak?",
    category: "general",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G016",
    name: "Hallucinations / Halusinasi",
    normalizedName: normalizeText("Hallucinations Halusinasi"),
    questionText: "Apakah anak tampak mengalami halusinasi atau bicara tidak sesuai kenyataan?",
    category: "neurologic",
    itemType: SymptomItemType.WARNING,
    defaultInputTier: InputTier.CAREGIVER_OR_CLINICIAN,
    isRedFlag: true,
    isAskable: true,
  },
  {
    code: "G017",
    name: "Diarrhea / Diare",
    normalizedName: normalizeText("Diarrhea Diare"),
    questionText: "Apakah anak mengalami diare?",
    category: "digestive",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G018",
    name: "Sore throat / Sakit tenggorokan",
    normalizedName: normalizeText("Sore throat Sakit tenggorokan"),
    questionText: "Apakah anak mengalami sakit tenggorokan?",
    category: "respiratory",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G019",
    name: "Small red spots / Bintik merah kecil",
    normalizedName: normalizeText("Small red spots Bintik merah kecil"),
    questionText: "Apakah muncul bintik merah kecil pada kulit anak?",
    category: "skin",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER_OR_CLINICIAN,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G020",
    name: "Easy to feel tired / Mudah lelah",
    normalizedName: normalizeText("Easy to feel tired Mudah lelah"),
    questionText: "Apakah anak mudah merasa lelah?",
    category: "general",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G021",
    name: "Lethargic / Lesu",
    normalizedName: normalizeText("Lethargic Lesu"),
    questionText: "Apakah anak tampak lesu?",
    category: "general",
    itemType: SymptomItemType.WARNING,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: true,
    isAskable: true,
  },
  {
    code: "G022",
    name: "Bloated / Perut kembung",
    normalizedName: normalizeText("Bloated Perut kembung"),
    questionText: "Apakah perut anak tampak kembung?",
    category: "digestive",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G023",
    name: "Nausea want to vomit / Mual ingin muntah",
    normalizedName: normalizeText("Nausea want to vomit Mual ingin muntah"),
    questionText: "Apakah anak merasa mual atau ingin muntah?",
    category: "digestive",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G024",
    name: "Frequent defecation / Sering buang air besar",
    normalizedName: normalizeText("Frequent defecation Sering buang air besar"),
    questionText: "Apakah anak sering buang air besar lebih dari biasanya?",
    category: "digestive",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G025",
    name: "Watery stool / BAB cair",
    normalizedName: normalizeText("Watery stool BAB cair"),
    questionText: "Apakah feses anak cair atau mencret?",
    category: "digestive",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G026",
    name: "Constipation / Sembelit",
    normalizedName: normalizeText("Constipation Sembelit"),
    questionText: "Apakah anak mengalami sembelit?",
    category: "digestive",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G027",
    name: "Cramps in the stomach / Kram perut",
    normalizedName: normalizeText("Cramps in the stomach Kram perut"),
    questionText: "Apakah anak mengalami kram perut?",
    category: "digestive",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G028",
    name: "Cough / Batuk",
    normalizedName: normalizeText("Cough Batuk"),
    questionText: "Apakah anak mengalami batuk?",
    category: "respiratory",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G029",
    name: "Muscle ache / Nyeri otot",
    normalizedName: normalizeText("Muscle ache Nyeri otot"),
    questionText: "Apakah anak mengalami nyeri otot atau pegal-pegal?",
    category: "musculoskeletal",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G030",
    name: "Red eye / Mata merah",
    normalizedName: normalizeText("Red eye Mata merah"),
    questionText: "Apakah mata anak tampak merah?",
    category: "eye",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G031",
    name: "Sneeze / Bersin",
    normalizedName: normalizeText("Sneeze Bersin"),
    questionText: "Apakah anak sering bersin?",
    category: "respiratory",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G032",
    name: "Stuffy nose or runny nose / Hidung tersumbat atau berair",
    normalizedName: normalizeText("Stuffy nose or runny nose Hidung tersumbat atau berair"),
    questionText: "Apakah anak mengalami hidung tersumbat atau hidung berair?",
    category: "respiratory",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G033",
    name: "Sore throat to hoarse voice / Sakit tenggorokan hingga suara serak",
    normalizedName: normalizeText("Sore throat to hoarse voice Sakit tenggorokan suara serak"),
    questionText: "Apakah anak mengalami sakit tenggorokan hingga suara serak?",
    category: "respiratory",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G034",
    name: "Nauseous / Mual",
    normalizedName: normalizeText("Nauseous Mual"),
    questionText: "Apakah anak mengalami mual?",
    category: "digestive",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G035",
    name: "Very restless / Sangat gelisah",
    normalizedName: normalizeText("Very restless Sangat gelisah"),
    questionText: "Apakah anak tampak sangat gelisah?",
    category: "general",
    itemType: SymptomItemType.WARNING,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: true,
    isAskable: true,
  },
  {
    code: "G036",
    name: "Mild bleeding in the nose or gums / Mimisan atau gusi berdarah ringan",
    normalizedName: normalizeText("Mild bleeding nose gums Mimisan gusi berdarah"),
    questionText: "Apakah anak mengalami mimisan atau gusi berdarah?",
    category: "bleeding",
    itemType: SymptomItemType.WARNING,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: true,
    isAskable: true,
  },
  {
    code: "G037",
    name: "Abnormal breath sound / Suara napas tidak normal",
    normalizedName: normalizeText("Abnormal breath sound Suara napas tidak normal"),
    questionText: "Apakah terdengar suara napas tidak normal pada anak?",
    category: "respiratory",
    itemType: SymptomItemType.SEVERITY,
    defaultInputTier: InputTier.CAREGIVER_OR_CLINICIAN,
    isRedFlag: true,
    isAskable: true,
  },
  {
    code: "G038",
    name: "Out of breath / Sesak napas",
    normalizedName: normalizeText("Out of breath Sesak napas"),
    questionText: "Apakah anak mengalami sesak napas atau tampak kesulitan bernapas?",
    category: "respiratory",
    itemType: SymptomItemType.SEVERITY,
    defaultInputTier: InputTier.CAREGIVER_OR_CLINICIAN,
    isRedFlag: true,
    isAskable: true,
  },
  {
    code: "G039",
    name: "Chest pain / Nyeri dada",
    normalizedName: normalizeText("Chest pain Nyeri dada"),
    questionText: "Apakah anak mengeluh nyeri pada dada?",
    category: "respiratory",
    itemType: SymptomItemType.WARNING,
    defaultInputTier: InputTier.CAREGIVER_OR_CLINICIAN,
    isRedFlag: true,
    isAskable: true,
  },
  {
    code: "G040",
    name: "Crying more often than usual / Lebih sering menangis",
    normalizedName: normalizeText("Crying more often than usual Lebih sering menangis"),
    questionText: "Apakah anak menangis lebih sering dari biasanya?",
    category: "behavior",
    itemType: SymptomItemType.CONTEXT,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: false,
    isAskable: true,
  },
  {
    code: "G041",
    name: "Vesicles filled with clear fluid / Lentingan berisi cairan bening",
    normalizedName: normalizeText("Vesicles filled with clear fluid Lentingan cairan bening"),
    questionText: "Apakah muncul lentingan atau benjolan kecil berisi cairan bening?",
    category: "skin",
    itemType: SymptomItemType.SYMPTOM,
    defaultInputTier: InputTier.CAREGIVER_OR_CLINICIAN,
    isRedFlag: false,
    isAskable: true,
  },

  // Red flag tambahan untuk urgency deterministic.
  // Tidak diberi weight jika tidak ada angka MB/MD jelas dari artikel.
  {
    code: "G042",
    name: "Seizure / Kejang",
    normalizedName: normalizeText("Seizure Kejang"),
    questionText: "Apakah anak mengalami kejang?",
    category: "neurologic",
    itemType: SymptomItemType.SEVERITY,
    defaultInputTier: InputTier.CAREGIVER_OR_CLINICIAN,
    isRedFlag: true,
    isAskable: true,
  },
  {
    code: "G043",
    name: "Altered consciousness / Gangguan kesadaran",
    normalizedName: normalizeText("Altered consciousness Gangguan kesadaran"),
    questionText: "Apakah anak tampak bingung, sangat mengantuk, tidak responsif, atau mengalami gangguan kesadaran?",
    category: "neurologic",
    itemType: SymptomItemType.SEVERITY,
    defaultInputTier: InputTier.CAREGIVER_OR_CLINICIAN,
    isRedFlag: true,
    isAskable: true,
  },
  {
    code: "G044",
    name: "Severe dehydration signs / Tanda dehidrasi berat",
    normalizedName: normalizeText("Severe dehydration signs Tanda dehidrasi berat"),
    questionText: "Apakah anak tampak sangat haus, mata cekung, sangat lemas, atau buang air kecil sangat sedikit?",
    category: "digestive",
    itemType: SymptomItemType.SEVERITY,
    defaultInputTier: InputTier.CAREGIVER_OR_CLINICIAN,
    isRedFlag: true,
    isAskable: true,
  },
  {
    code: "G045",
    name: "Persistent high fever / Demam tinggi berkepanjangan",
    normalizedName: normalizeText("Persistent high fever Demam tinggi berkepanjangan"),
    questionText: "Apakah anak mengalami demam tinggi yang menetap atau berkepanjangan?",
    category: "general",
    itemType: SymptomItemType.WARNING,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: true,
    isAskable: true,
  },
  {
    code: "G046",
    name: "Severe weakness / Sangat lemah",
    normalizedName: normalizeText("Severe weakness Sangat lemah"),
    questionText: "Apakah anak tampak sangat lemah?",
    category: "general",
    itemType: SymptomItemType.WARNING,
    defaultInputTier: InputTier.CAREGIVER,
    isRedFlag: true,
    isAskable: true,
  },
] as const;

const symptomAliases = [
  { aliasText: "panas", symptomCode: "G001" },
  { aliasText: "demam", symptomCode: "G001" },
  { aliasText: "badan panas", symptomCode: "G001" },
  { aliasText: "demam 40", symptomCode: "G002" },
  { aliasText: "demam tinggi sekali", symptomCode: "G002" },
  { aliasText: "panas di atas 40", symptomCode: "G002" },
  { aliasText: "tidak mau makan", symptomCode: "G003" },
  { aliasText: "nafsu makan turun", symptomCode: "G003" },
  { aliasText: "malas makan", symptomCode: "G003" },
  { aliasText: "batuk kering", symptomCode: "G004" },
  { aliasText: "mata berair", symptomCode: "G005" },
  { aliasText: "ruam", symptomCode: "G006" },
  { aliasText: "muncul ruam", symptomCode: "G006" },
  { aliasText: "bercak koplik", symptomCode: "G007" },
  { aliasText: "sakit kepala", symptomCode: "G008" },
  { aliasText: "pusing", symptomCode: "G008" },
  { aliasText: "sakit perut", symptomCode: "G009" },
  { aliasText: "perut sakit", symptomCode: "G009" },
  { aliasText: "sulit tidur", symptomCode: "G010" },
  { aliasText: "napas cepat", symptomCode: "G011" },
  { aliasText: "nafas cepat", symptomCode: "G011" },
  { aliasText: "rewel", symptomCode: "G012" },
  { aliasText: "muntah", symptomCode: "G013" },
  { aliasText: "menggigil", symptomCode: "G014" },
  { aliasText: "berkeringat banyak", symptomCode: "G015" },
  { aliasText: "halusinasi", symptomCode: "G016" },
  { aliasText: "diare", symptomCode: "G017" },
  { aliasText: "sakit tenggorokan", symptomCode: "G018" },
  { aliasText: "bintik merah", symptomCode: "G019" },
  { aliasText: "mudah lelah", symptomCode: "G020" },
  { aliasText: "lesu", symptomCode: "G021" },
  { aliasText: "lemas", symptomCode: "G021" },
  { aliasText: "perut kembung", symptomCode: "G022" },
  { aliasText: "mual ingin muntah", symptomCode: "G023" },
  { aliasText: "sering bab", symptomCode: "G024" },
  { aliasText: "sering buang air besar", symptomCode: "G024" },
  { aliasText: "mencret", symptomCode: "G025" },
  { aliasText: "bab cair", symptomCode: "G025" },
  { aliasText: "sembelit", symptomCode: "G026" },
  { aliasText: "kram perut", symptomCode: "G027" },
  { aliasText: "batuk", symptomCode: "G028" },
  { aliasText: "nyeri otot", symptomCode: "G029" },
  { aliasText: "pegal", symptomCode: "G029" },
  { aliasText: "mata merah", symptomCode: "G030" },
  { aliasText: "bersin", symptomCode: "G031" },
  { aliasText: "pilek", symptomCode: "G032" },
  { aliasText: "hidung tersumbat", symptomCode: "G032" },
  { aliasText: "hidung berair", symptomCode: "G032" },
  { aliasText: "suara serak", symptomCode: "G033" },
  { aliasText: "mual", symptomCode: "G034" },
  { aliasText: "sangat gelisah", symptomCode: "G035" },
  { aliasText: "mimisan", symptomCode: "G036" },
  { aliasText: "gusi berdarah", symptomCode: "G036" },
  { aliasText: "suara napas tidak normal", symptomCode: "G037" },
  { aliasText: "bunyi napas tidak normal", symptomCode: "G037" },
  { aliasText: "sesak", symptomCode: "G038" },
  { aliasText: "sesak napas", symptomCode: "G038" },
  { aliasText: "susah napas", symptomCode: "G038" },
  { aliasText: "nyeri dada", symptomCode: "G039" },
  { aliasText: "sering menangis", symptomCode: "G040" },
  { aliasText: "lentingan cairan bening", symptomCode: "G041" },
  { aliasText: "bintil berair", symptomCode: "G041" },
  { aliasText: "kejang", symptomCode: "G042" },
  { aliasText: "tidak sadar", symptomCode: "G043" },
  { aliasText: "gangguan kesadaran", symptomCode: "G043" },
  { aliasText: "dehidrasi berat", symptomCode: "G044" },
  { aliasText: "demam tinggi berkepanjangan", symptomCode: "G045" },
  { aliasText: "sangat lemah", symptomCode: "G046" },
] as const;

const diseases = [
  {
    code: "P001",
    name: "Measles / Campak",
    severityLevel: "high",
    description:
      "Campak adalah penyakit infeksi anak yang umumnya ditandai demam tinggi, batuk kering, mata berair, ruam, dan bercak Koplik.",
    advice:
      "Pantau demam, cukupkan cairan, dan segera periksa bila demam sangat tinggi, ruam luas, atau anak tampak lemah.",
    sourceUrl: null,
    isActive: true,
  },
  {
    code: "P002",
    name: "Malaria",
    severityLevel: "high",
    description:
      "Malaria pada anak dapat ditandai demam, sakit kepala, menggigil, muntah, napas cepat, dan banyak berkeringat.",
    advice:
      "Segera periksa ke fasilitas kesehatan, terutama bila ada demam berulang, menggigil, lemas, atau riwayat wilayah endemis.",
    sourceUrl: null,
    isActive: true,
  },
  {
    code: "P003",
    name: "Typhoid fever / Demam tifoid",
    severityLevel: "high",
    description:
      "Demam tifoid dapat ditandai demam, sakit kepala, sakit perut, diare, sakit tenggorokan, nafsu makan menurun, dan mudah lelah.",
    advice:
      "Periksa ke fasilitas kesehatan bila demam menetap, anak lemas, sulit makan, atau muncul gejala berat.",
    sourceUrl: null,
    isActive: true,
  },
  {
    code: "P004",
    name: "Diarrhea / Diare",
    severityLevel: "medium",
    description:
      "Diare pada anak ditandai peningkatan frekuensi buang air besar, BAB cair, kram perut, mual, kembung, dan risiko dehidrasi.",
    advice:
      "Berikan cairan/oralit dan segera periksa bila anak sangat lemas, tidak mau minum, atau muncul tanda dehidrasi.",
    sourceUrl: null,
    isActive: true,
  },
  {
    code: "P005",
    name: "Acute Respiratory Infection / ISPA",
    severityLevel: "medium",
    description:
      "ISPA dapat ditandai demam, batuk, sakit kepala, nyeri otot, mata merah, bersin, hidung tersumbat atau berair, dan sakit tenggorokan.",
    advice:
      "Pantau napas anak, cukupkan cairan, dan periksa bila batuk memburuk, demam tinggi, atau anak sesak.",
    sourceUrl: null,
    isActive: true,
  },
  {
    code: "P006",
    name: "Dengue Hemorrhagic Fever / DBD",
    severityLevel: "critical",
    description:
      "DBD pada anak dapat ditandai demam, sakit kepala, mual, muntah, ruam, gelisah, dan perdarahan ringan seperti mimisan atau gusi berdarah.",
    advice:
      "Segera ke fasilitas kesehatan bila ada perdarahan, muntah berulang, sangat gelisah, sangat lemah, atau demam tinggi menetap.",
    sourceUrl: null,
    isActive: true,
  },
  {
    code: "P007",
    name: "Pneumonia",
    severityLevel: "critical",
    description:
      "Pneumonia pada anak dapat ditandai demam, batuk, suara napas tidak normal, sesak napas, nyeri dada, lesu, dan nafsu makan menurun.",
    advice:
      "Segera periksa bila anak sesak, napas cepat, suara napas tidak normal, nyeri dada, atau tampak sangat lemah.",
    sourceUrl: null,
    isActive: true,
  },
  {
    code: "P008",
    name: "Varicella / Cacar air",
    severityLevel: "medium",
    description:
      "Cacar air dapat ditandai demam, sakit kepala, sakit tenggorokan, nafsu makan menurun, bintik merah kecil, dan lentingan berisi cairan bening.",
    advice:
      "Jaga kebersihan kulit, hindari menggaruk lentingan, dan periksa bila demam tinggi atau ruam tampak berat.",
    sourceUrl: null,
    isActive: true,
  },
] as const;

type SaputraWeight = {
  diseaseCode: string;
  symptomCode: string;
  mb: number;
  md: number;
  symptomRole: SymptomRole;
  note?: string;
};

const weights: SaputraWeight[] = [
  // P001 - Measles / Campak
  { diseaseCode: "P001", symptomCode: "G002", mb: 0.8, md: 0.2, symptomRole: SymptomRole.WARNING_SIGN },
  { diseaseCode: "P001", symptomCode: "G003", mb: 0.4, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P001", symptomCode: "G004", mb: 0.6, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P001", symptomCode: "G005", mb: 0.8, md: 0.2, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P001", symptomCode: "G006", mb: 1.0, md: 0.0, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P001", symptomCode: "G007", mb: 0.8, md: 0.2, symptomRole: SymptomRole.CORE },

  // P002 - Malaria
  { diseaseCode: "P002", symptomCode: "G001", mb: 1.0, md: 0.0, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P002", symptomCode: "G008", mb: 0.8, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P002", symptomCode: "G009", mb: 0.2, md: 0.0, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P002", symptomCode: "G010", mb: 0.6, md: 0.4, symptomRole: SymptomRole.CONTEXT_ONLY },
  { diseaseCode: "P002", symptomCode: "G011", mb: 0.4, md: 0.2, symptomRole: SymptomRole.WARNING_SIGN },
  { diseaseCode: "P002", symptomCode: "G012", mb: 0.8, md: 0.4, symptomRole: SymptomRole.CONTEXT_ONLY },
  { diseaseCode: "P002", symptomCode: "G013", mb: 0.6, md: 0.4, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P002", symptomCode: "G014", mb: 0.6, md: 0.4, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P002", symptomCode: "G015", mb: 0.6, md: 0.4, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P002", symptomCode: "G003", mb: 0.4, md: 0.2, symptomRole: SymptomRole.SUPPORTING },

  // P003 - Typhoid fever
  { diseaseCode: "P003", symptomCode: "G008", mb: 0.8, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P003", symptomCode: "G009", mb: 0.6, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P003", symptomCode: "G016", mb: 0.2, md: 0.0, symptomRole: SymptomRole.WARNING_SIGN },
  { diseaseCode: "P003", symptomCode: "G017", mb: 0.6, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P003", symptomCode: "G018", mb: 0.4, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P003", symptomCode: "G019", mb: 0.4, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P003", symptomCode: "G003", mb: 1.0, md: 0.0, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P003", symptomCode: "G020", mb: 0.8, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P003", symptomCode: "G001", mb: 1.0, md: 0.0, symptomRole: SymptomRole.CORE },

  // P004 - Diarrhea
  { diseaseCode: "P004", symptomCode: "G001", mb: 0.4, md: 0.0, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P004", symptomCode: "G021", mb: 0.8, md: 0.2, symptomRole: SymptomRole.WARNING_SIGN },
  { diseaseCode: "P004", symptomCode: "G022", mb: 0.2, md: 0.0, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P004", symptomCode: "G023", mb: 0.2, md: 0.0, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P004", symptomCode: "G024", mb: 1.0, md: 0.0, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P004", symptomCode: "G025", mb: 1.0, md: 0.0, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P004", symptomCode: "G026", mb: 1.0, md: 0.0, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P004", symptomCode: "G027", mb: 0.8, md: 0.2, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P004", symptomCode: "G003", mb: 0.6, md: 0.2, symptomRole: SymptomRole.SUPPORTING },

  // P005 - ISPA
  { diseaseCode: "P005", symptomCode: "G001", mb: 0.8, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P005", symptomCode: "G008", mb: 0.8, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P005", symptomCode: "G028", mb: 1.0, md: 0.0, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P005", symptomCode: "G029", mb: 0.2, md: 0.0, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P005", symptomCode: "G030", mb: 0.6, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P005", symptomCode: "G031", mb: 0.4, md: 0.2, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P005", symptomCode: "G032", mb: 0.6, md: 0.2, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P005", symptomCode: "G033", mb: 1.0, md: 0.2, symptomRole: SymptomRole.CORE },

  // P006 - DBD
  { diseaseCode: "P006", symptomCode: "G001", mb: 1.0, md: 0.0, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P006", symptomCode: "G008", mb: 1.0, md: 0.0, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P006", symptomCode: "G034", mb: 0.6, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P006", symptomCode: "G035", mb: 0.4, md: 0.2, symptomRole: SymptomRole.WARNING_SIGN },
  { diseaseCode: "P006", symptomCode: "G013", mb: 0.6, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P006", symptomCode: "G006", mb: 1.0, md: 0.0, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P006", symptomCode: "G036", mb: 0.6, md: 0.2, symptomRole: SymptomRole.WARNING_SIGN },

  // P007 - Pneumonia
  { diseaseCode: "P007", symptomCode: "G001", mb: 0.8, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P007", symptomCode: "G021", mb: 0.8, md: 0.2, symptomRole: SymptomRole.WARNING_SIGN },
  { diseaseCode: "P007", symptomCode: "G028", mb: 1.0, md: 0.0, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P007", symptomCode: "G037", mb: 1.0, md: 0.0, symptomRole: SymptomRole.WARNING_SIGN },
  { diseaseCode: "P007", symptomCode: "G013", mb: 0.4, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P007", symptomCode: "G014", mb: 0.4, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P007", symptomCode: "G003", mb: 0.6, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P007", symptomCode: "G020", mb: 0.4, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P007", symptomCode: "G032", mb: 0.4, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P007", symptomCode: "G038", mb: 1.0, md: 0.0, symptomRole: SymptomRole.WARNING_SIGN },
  { diseaseCode: "P007", symptomCode: "G039", mb: 0.8, md: 0.2, symptomRole: SymptomRole.WARNING_SIGN },
  { diseaseCode: "P007", symptomCode: "G040", mb: 0.8, md: 0.2, symptomRole: SymptomRole.CONTEXT_ONLY },

  // P008 - Varicella
  { diseaseCode: "P008", symptomCode: "G001", mb: 0.8, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P008", symptomCode: "G008", mb: 0.6, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P008", symptomCode: "G018", mb: 0.2, md: 0.0, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P008", symptomCode: "G003", mb: 0.4, md: 0.2, symptomRole: SymptomRole.SUPPORTING },
  { diseaseCode: "P008", symptomCode: "G019", mb: 1.0, md: 0.0, symptomRole: SymptomRole.CORE },
  { diseaseCode: "P008", symptomCode: "G041", mb: 1.0, md: 0.0, symptomRole: SymptomRole.CORE },
];

const diseaseRuleConfig: Record<
  string,
  {
    minMatch: number;
    priority: number;
    note: string;
  }
> = {
  P001: {
    minMatch: 2,
    priority: 10,
    note: "Campak minimal membutuhkan dua gejala agar tidak hanya terpicu oleh ruam atau demam tinggi saja.",
  },
  P002: {
    minMatch: 2,
    priority: 10,
    note: "Malaria minimal dua gejala agar tidak hanya terpicu oleh demam umum.",
  },
  P003: {
    minMatch: 2,
    priority: 10,
    note: "Tifoid minimal dua gejala agar demam saja tidak langsung menghasilkan kandidat diagnosis.",
  },
  P004: {
    minMatch: 2,
    priority: 8,
    note: "Diare minimal dua gejala, misalnya BAB cair dan sering BAB atau kram perut.",
  },
  P005: {
    minMatch: 2,
    priority: 8,
    note: "ISPA minimal dua gejala, misalnya batuk dan pilek atau batuk dan demam.",
  },
  P006: {
    minMatch: 2,
    priority: 12,
    note: "DBD minimal dua gejala agar demam saja tidak langsung dominan.",
  },
  P007: {
    minMatch: 2,
    priority: 12,
    note: "Pneumonia minimal dua gejala, terutama batuk dengan gejala pernapasan atau red flag.",
  },
  P008: {
    minMatch: 2,
    priority: 8,
    note: "Cacar air minimal dua gejala, terutama bintik merah dan vesikel/lentingan.",
  },
};

const rules = diseases.map((disease, index) => {
  const config = diseaseRuleConfig[disease.code] ?? {
    minMatch: 2,
    priority:
      disease.severityLevel === "critical"
        ? 12
        : disease.severityLevel === "high"
          ? 10
          : 8,
    note: "Default rule minimal dua gejala.",
  };

  return {
    code: `R${String(index + 1).padStart(3, "0")}`,
    name: `Aturan ${disease.name}`,
    diseaseCode: disease.code,
    operator: RuleOperator.AND,
    minMatch: config.minMatch,
    priority: config.priority,
    note: config.note,
    symptoms: weights
      .filter((weight) => weight.diseaseCode === disease.code)
      .map((weight) => ({
        code: weight.symptomCode,
        isMandatory: false,
      })),
  };
});

type EvidenceChunkSeed = {
  diseaseCode: string;
  title: string;
  content: string;
  sourceName: string;
  sourceType:
    | "disease_description"
    | "symptom_explanation"
    | "warning_sign"
    | "follow_up_suggestion";
  sourceUrl: string;
  evidenceDoi?: string | null;
};

const evidenceChunks: EvidenceChunkSeed[] = [
  // P001 - Measles / Campak
  {
    diseaseCode: "P001",
    title: "Measles clinical symptoms in children",
    sourceName: "CDC",
    sourceType: "disease_description",
    sourceUrl: "https://www.cdc.gov/measles/signs-symptoms/index.html",
    evidenceDoi: null,
    content:
      "Campak adalah penyakit infeksi virus yang sangat menular. Gejala awal yang relevan untuk sistem pakar meliputi demam tinggi, batuk, hidung berair, mata merah atau berair, bercak Koplik di mulut, dan ruam kulit. Dalam sistem ini, kombinasi ruam, mata berair, batuk kering, demam tinggi, dan Koplik spots memperkuat kandidat Measles / Campak.",
  },
  {
    diseaseCode: "P001",
    title: "Measles complications and need for medical attention",
    sourceName: "CDC",
    sourceType: "warning_sign",
    sourceUrl: "https://www.cdc.gov/measles/hcp/clinical-overview/index.html",
    evidenceDoi: null,
    content:
      "Campak dapat menyebabkan penyakit serius pada anak, termasuk komplikasi seperti pneumonia, diare, otitis media, dan perburukan kondisi umum. Demam tinggi, ruam luas, atau anak tampak sangat lemah perlu dipantau sebagai tanda risiko yang membutuhkan pemeriksaan tenaga kesehatan.",
  },
  {
    diseaseCode: "P001",
    title: "Measles follow-up suggestion",
    sourceName: "WHO",
    sourceType: "follow_up_suggestion",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/measles",
    evidenceDoi: null,
    content:
      "Jika hasil sistem menunjukkan kemungkinan Campak, orang tua disarankan memantau demam, asupan cairan, ruam, dan tanda perburukan. Hasil sistem bukan diagnosis pasti; anak perlu diperiksa oleh tenaga kesehatan terutama bila demam sangat tinggi, ruam menyebar, atau muncul tanda bahaya.",
  },

  // P002 - Malaria
  {
    diseaseCode: "P002",
    title: "Malaria common symptoms",
    sourceName: "CDC",
    sourceType: "disease_description",
    sourceUrl: "https://www.cdc.gov/malaria/symptoms/index.html",
    evidenceDoi: null,
    content:
      "Malaria dapat ditandai demam, menggigil, sakit kepala, nyeri otot, rasa lelah, mual, muntah, dan diare. Pada sistem pakar ini, kombinasi demam, menggigil, sakit kepala, muntah, banyak berkeringat, dan nafsu makan menurun mendukung kandidat Malaria.",
  },
  {
    diseaseCode: "P002",
    title: "Malaria severe symptoms and urgency",
    sourceName: "CDC",
    sourceType: "warning_sign",
    sourceUrl: "https://www.cdc.gov/malaria/about/index.html",
    evidenceDoi: null,
    content:
      "Malaria dapat berkembang menjadi penyakit berat bila tidak ditangani. Gejala berat dapat meliputi kejang, kebingungan, koma, atau gangguan organ. Bila anak demam disertai sangat lemah, gangguan kesadaran, kejang, atau riwayat wilayah endemis, pemeriksaan medis perlu diprioritaskan.",
  },
  {
    diseaseCode: "P002",
    title: "Malaria follow-up suggestion",
    sourceName: "CDC",
    sourceType: "follow_up_suggestion",
    sourceUrl: "https://www.cdc.gov/malaria/symptoms/index.html",
    evidenceDoi: null,
    content:
      "Jika sistem menampilkan Malaria sebagai kandidat, pengguna perlu mempertimbangkan riwayat perjalanan atau tinggal di daerah endemis malaria. Pemeriksaan tenaga kesehatan dibutuhkan untuk konfirmasi karena diagnosis malaria memerlukan evaluasi klinis dan pemeriksaan penunjang.",
  },

  // P003 - Typhoid fever
  {
    diseaseCode: "P003",
    title: "Typhoid fever symptoms",
    sourceName: "WHO",
    sourceType: "disease_description",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/typhoid",
    evidenceDoi: null,
    content:
      "Demam tifoid dapat menimbulkan demam tinggi berkepanjangan, kelelahan, sakit kepala, mual, nyeri perut, konstipasi atau diare, dan kadang ruam. Dalam sistem ini, kombinasi demam, sakit kepala, sakit perut, diare, nafsu makan menurun, dan mudah lelah mendukung kandidat Typhoid fever.",
  },
  {
    diseaseCode: "P003",
    title: "Typhoid fever in children and gastrointestinal symptoms",
    sourceName: "CDC Yellow Book",
    sourceType: "symptom_explanation",
    sourceUrl:
      "https://www.cdc.gov/yellow-book/hcp/travel-associated-infections-diseases/typhoid-and-paratyphoid-fever.html",
    evidenceDoi: null,
    content:
      "Pada anak, gejala gastrointestinal seperti diare dan muntah dapat lebih sering muncul dibandingkan pada orang dewasa. Gejala lain yang relevan dapat berupa sakit kepala, malaise, nyeri perut, batuk kering, sakit tenggorokan, kelelahan, dan ruam rose spots.",
  },
  {
    diseaseCode: "P003",
    title: "Typhoid fever follow-up suggestion",
    sourceName: "CDC",
    sourceType: "follow_up_suggestion",
    sourceUrl: "https://www.cdc.gov/typhoid-fever/about/index.html",
    evidenceDoi: null,
    content:
      "Demam tifoid dan paratifoid dapat menjadi penyakit serius. Jika sistem menunjukkan kandidat tifoid, terutama pada demam menetap disertai sakit perut, diare, lemah, atau nafsu makan menurun, pengguna disarankan mencari pemeriksaan medis untuk konfirmasi dan tata laksana.",
  },

  // P004 - Diarrhea / Diare
  {
    diseaseCode: "P004",
    title: "Diarrhoeal disease and dehydration risk",
    sourceName: "WHO",
    sourceType: "disease_description",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
    evidenceDoi: null,
    content:
      "Diare menyebabkan kehilangan cairan dan elektrolit melalui feses cair, muntah, keringat, urine, dan pernapasan. Risiko utama pada anak adalah dehidrasi. Dalam sistem ini, sering buang air besar, BAB cair, kram perut, mual, nafsu makan menurun, dan lesu mendukung kandidat Diarrhea / Diare.",
  },
  {
    diseaseCode: "P004",
    title: "Severe dehydration warning signs",
    sourceName: "CDC",
    sourceType: "warning_sign",
    sourceUrl: "https://www.cdc.gov/mmwr/preview/mmwrhtml/00018677.htm",
    evidenceDoi: null,
    content:
      "Tanda dehidrasi berat dapat meliputi letargi berat, perubahan kesadaran, perfusi buruk, ekstremitas dingin, dan tanda penarikan kulit yang memanjang. Pada diare anak, tanda dehidrasi berat perlu diperlakukan sebagai red flag yang membutuhkan evaluasi segera.",
  },
  {
    diseaseCode: "P004",
    title: "Diarrhea follow-up suggestion",
    sourceName: "WHO",
    sourceType: "follow_up_suggestion",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
    evidenceDoi: null,
    content:
      "Pada diare anak, fokus awal adalah mencegah dehidrasi dengan menjaga asupan cairan. Pemeriksaan medis perlu dilakukan bila anak sangat lemah, tidak mau minum, tampak dehidrasi, BAB sangat sering, atau gejala memburuk.",
  },

  // P005 - ISPA
  {
    diseaseCode: "P005",
    title: "Upper respiratory infection symptoms",
    sourceName: "CDC",
    sourceType: "disease_description",
    sourceUrl: "https://www.cdc.gov/common-cold/about/index.html",
    evidenceDoi: null,
    content:
      "Infeksi saluran pernapasan atas dapat menimbulkan hidung berair, hidung tersumbat, batuk, bersin, sakit tenggorokan, sakit kepala, nyeri badan ringan, dan demam. Dalam sistem ini, batuk, bersin, hidung tersumbat atau berair, sakit tenggorokan, mata merah, dan demam mendukung kandidat ISPA.",
  },
  {
    diseaseCode: "P005",
    title: "Respiratory symptoms and monitoring",
    sourceName: "CDC",
    sourceType: "symptom_explanation",
    sourceUrl: "https://www.cdc.gov/rhinoviruses/about/index.html",
    evidenceDoi: null,
    content:
      "Gejala seperti batuk, bersin, hidung berair, hidung tersumbat, sakit tenggorokan, sakit kepala, nyeri badan ringan, dan demam dapat terlihat pada infeksi pernapasan. Sebagian besar ringan, tetapi perlu dipantau bila gejala memburuk atau muncul tanda napas berat.",
  },
  {
    diseaseCode: "P005",
    title: "ISPA follow-up suggestion",
    sourceName: "CDC",
    sourceType: "follow_up_suggestion",
    sourceUrl: "https://www.cdc.gov/common-cold/about/index.html",
    evidenceDoi: null,
    content:
      "Jika sistem menunjukkan ISPA sebagai kandidat, orang tua dapat memantau demam, batuk, asupan cairan, dan pola napas. Pemeriksaan medis diperlukan bila anak mengalami sesak, napas cepat, demam tinggi menetap, atau tampak sangat lemah.",
  },

  // P006 - Dengue Hemorrhagic Fever / DBD
  {
    diseaseCode: "P006",
    title: "Dengue symptoms and severe warning signs",
    sourceName: "CDC",
    sourceType: "disease_description",
    sourceUrl: "https://www.cdc.gov/dengue/signs-symptoms/index.html",
    evidenceDoi: null,
    content:
      "Dengue dapat ditandai demam disertai sakit kepala, mual, muntah, ruam, nyeri, atau tanda perdarahan. Warning signs dengue berat meliputi nyeri perut, muntah berulang, perdarahan dari hidung atau gusi, sangat lelah, dan gelisah.",
  },
  {
    diseaseCode: "P006",
    title: "Dengue warning signs in clinical guidance",
    sourceName: "CDC Yellow Book",
    sourceType: "warning_sign",
    sourceUrl:
      "https://www.cdc.gov/yellow-book/hcp/travel-associated-infections-diseases/dengue.html",
    evidenceDoi: null,
    content:
      "Tanda peringatan dengue berat meliputi nyeri perut berat, muntah persisten, perdarahan mukosa, letargi atau gelisah, pembesaran hati, dan tanda gangguan sirkulasi. Pada sistem ini, perdarahan hidung atau gusi dan sangat gelisah diperlakukan sebagai warning sign.",
  },
  {
    diseaseCode: "P006",
    title: "Dengue follow-up suggestion",
    sourceName: "CDC",
    sourceType: "follow_up_suggestion",
    sourceUrl: "https://www.cdc.gov/dengue/signs-symptoms/index.html",
    evidenceDoi: null,
    content:
      "Jika sistem menunjukkan DBD sebagai kandidat, pengguna disarankan segera mencari pemeriksaan medis bila ada perdarahan, muntah berulang, sangat gelisah, sangat lemah, nyeri perut, atau demam yang menetap. Hasil sistem bukan diagnosis pasti.",
  },

  // P007 - Pneumonia
  {
    diseaseCode: "P007",
    title: "Pneumonia in children overview",
    sourceName: "WHO",
    sourceType: "disease_description",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/pneumonia",
    evidenceDoi: null,
    content:
      "Pneumonia adalah infeksi saluran napas akut yang menyerang paru-paru. Saat pneumonia terjadi, alveoli dapat terisi cairan atau nanah sehingga pernapasan terasa nyeri dan asupan oksigen dapat terbatas. Pada sistem ini, batuk, demam, suara napas tidak normal, sesak napas, dan nyeri dada mendukung kandidat Pneumonia.",
  },
  {
    diseaseCode: "P007",
    title: "Pneumonia warning signs",
    sourceName: "Mayo Clinic",
    sourceType: "warning_sign",
    sourceUrl:
      "https://www.mayoclinic.org/diseases-conditions/pneumonia/symptoms-causes/syc-20354204",
    evidenceDoi: null,
    content:
      "Kesulitan bernapas, nyeri dada, demam tinggi menetap, dan batuk persisten merupakan tanda yang perlu mendapatkan perhatian medis. Pada sistem ini, sesak napas, suara napas tidak normal, dan nyeri dada dianggap sebagai red flag untuk urgency tinggi atau emergency.",
  },
  {
    diseaseCode: "P007",
    title: "Pneumonia follow-up suggestion",
    sourceName: "WHO",
    sourceType: "follow_up_suggestion",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/pneumonia",
    evidenceDoi: null,
    content:
      "Jika sistem menunjukkan Pneumonia sebagai kandidat, terutama bersama sesak napas, napas cepat, suara napas tidak normal, nyeri dada, atau anak tampak sangat lemah, pengguna disarankan segera membawa anak ke fasilitas kesehatan.",
  },

  // P008 - Varicella / Cacar Air
  {
    diseaseCode: "P008",
    title: "Chickenpox symptoms and vesicular rash",
    sourceName: "CDC",
    sourceType: "disease_description",
    sourceUrl: "https://www.cdc.gov/chickenpox/signs-symptoms/index.html",
    evidenceDoi: null,
    content:
      "Cacar air atau varicella ditandai ruam yang berubah menjadi lepuhan gatal berisi cairan dan kemudian menjadi keropeng. Ruam dapat muncul pada dada, punggung, wajah, dan menyebar ke bagian tubuh lain. Dalam sistem ini, bintik merah kecil dan lentingan berisi cairan bening memperkuat kandidat Varicella.",
  },
  {
    diseaseCode: "P008",
    title: "Clinical features of varicella in children",
    sourceName: "CDC",
    sourceType: "symptom_explanation",
    sourceUrl: "https://www.cdc.gov/chickenpox/hcp/clinical-overview/index.html",
    evidenceDoi: null,
    content:
      "Pada anak, ruam sering menjadi tanda pertama varicella. Lesi dapat berkembang dari makula ke papula lalu vesikel sebelum berkerak. Demam ringan, malaise, sakit kepala, atau nafsu makan menurun dapat menyertai.",
  },
  {
    diseaseCode: "P008",
    title: "Varicella follow-up suggestion",
    sourceName: "CDC",
    sourceType: "follow_up_suggestion",
    sourceUrl: "https://www.cdc.gov/chickenpox/signs-symptoms/index.html",
    evidenceDoi: null,
    content:
      "Jika sistem menunjukkan Varicella sebagai kandidat, orang tua disarankan menjaga kebersihan kulit, menghindari garukan, dan memantau demam atau tanda infeksi kulit. Pemeriksaan medis diperlukan bila ruam berat, demam tinggi, anak sangat lemah, atau muncul komplikasi.",
  },
];

async function seedEvidenceChunks(
  diseaseMap: Map<string, string>
) {
  for (const chunk of evidenceChunks) {
    const diseaseId = diseaseMap.get(chunk.diseaseCode);

    if (!diseaseId) {
      throw new Error(
        `Disease tidak ditemukan untuk EvidenceChunk: ${chunk.diseaseCode}`
      );
    }

    const embeddingText = [
      chunk.title,
      chunk.content,
      chunk.sourceName,
      chunk.sourceType,
    ].join("\n");

    const embedding = await generateEmbedding(embeddingText);

    await prisma.evidenceChunk.create({
      data: {
        diseaseId,
        title: chunk.title,
        content: chunk.content,
        sourceName: chunk.sourceName,
        sourceType: chunk.sourceType,
        sourceUrl: chunk.sourceUrl,
        evidenceDoi: chunk.evidenceDoi ?? null,
        embedding,
      },
    });
  }
}

async function main() {
  const resetConsultations = process.env.RESET_CONSULTATIONS === "true";

  if (resetConsultations) {
    await prisma.consultationResult.deleteMany();
    await prisma.consultationAnswer.deleteMany();
    await prisma.consultation.deleteMany();
  }

  await prisma.ruleDetail.deleteMany();
  await prisma.rule.deleteMany();
  await prisma.diseaseSymptomWeight.deleteMany();
  await prisma.symptomAlias.deleteMany();
  await prisma.evidenceChunk.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.disease.deleteMany();

  for (const symptom of symptoms) {
    await prisma.symptom.create({
      data: symptom,
    });
  }

  const symptomMap = new Map(
    (await prisma.symptom.findMany()).map((symptom) => [symptom.code, symptom.id]),
  );

  for (const alias of symptomAliases) {
    const symptomId = symptomMap.get(alias.symptomCode);
    if (!symptomId) continue;

    await prisma.symptomAlias.create({
      data: {
        symptomId,
        aliasText: alias.aliasText,
        normalizedAlias: normalizeText(alias.aliasText),
      },
    });
  }

  for (const disease of diseases) {
    await prisma.disease.create({
      data: disease,
    });
  }

  const diseaseMap = new Map(
  (await prisma.disease.findMany()).map((disease) => [disease.code, disease.id]),
);

  
  for (const rule of rules) {
    const diseaseId = diseaseMap.get(rule.diseaseCode);
    if (!diseaseId) {
      throw new Error(`Disease tidak ditemukan untuk rule ${rule.code}: ${rule.diseaseCode}`);
    }

  const createdRule = await prisma.rule.create({
    data: {
      code: rule.code,
      name: rule.name,
      diseaseId,
      operator: rule.operator,
      minMatch: rule.minMatch,
      priority: rule.priority,
    },
  });

    for (const item of rule.symptoms) {
      const symptomId = symptomMap.get(item.code);
      if (!symptomId) {
        throw new Error(`Symptom tidak ditemukan untuk rule ${rule.code}: ${item.code}`);
      }

      await prisma.ruleDetail.create({
        data: {
          ruleId: createdRule.id,
          symptomId,
          isMandatory: item.isMandatory,
        },
      });
    }
  }

  for (const weight of weights) {
    const diseaseId = diseaseMap.get(weight.diseaseCode);
    const symptomId = symptomMap.get(weight.symptomCode);

    if (!diseaseId) {
      throw new Error(`Disease tidak ditemukan pada weight: ${weight.diseaseCode}`);
    }

    if (!symptomId) {
      throw new Error(`Symptom tidak ditemukan pada weight: ${weight.symptomCode}`);
    }

    const cfExpert = calculateCfExpert(weight.mb, weight.md);

    await prisma.diseaseSymptomWeight.create({
      data: {
        diseaseId,
        symptomId,
        mb: weight.mb,
        md: weight.md,
        cfExpert,
        candidateCfMin: null,
        candidateCfMax: null,
        symptomRole: weight.symptomRole,
        phase: "saputra_2022_knowledge_acquisition",
        keepStatus: KeepStatus.KEEP,
        urgencyMode: UrgencyMode.ORDINARY,
        evidenceDoi: null,
        note:
          weight.note ??
          `Saputra et al. 2022 knowledge acquisition. CF expert = MB (${weight.mb}) - MD (${weight.md}) = ${cfExpert}`,
      },
    });
  }

  await seedEvidenceChunks(diseaseMap);

  console.log("Seed Saputra 2022 selesai.");
  console.log(`Diseases: ${diseases.length}`);
  console.log(`Symptoms: ${symptoms.length}`);
  console.log(`Weights: ${weights.length}`);
  console.log("CF expert dihitung dari MB - MD, bukan dari MB mentah.");
}

main()
  .catch((error) => {
    console.error("Seed gagal:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });