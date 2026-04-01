import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { RuleOperator } from "../src/generated/prisma/enums.ts";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const symptoms = [
  { code: "G001", name: "Batuk", questionText: "Apakah anak mengalami batuk?", category: "respiratory", isRedFlag: false },
  { code: "G002", name: "Napas cepat", questionText: "Apakah napas anak terlihat cepat?", category: "respiratory", isRedFlag: false },
  { code: "G003", name: "Tarikan dinding dada", questionText: "Apakah ada tarikan dinding dada ke dalam saat bernapas?", category: "respiratory", isRedFlag: true },
  { code: "G004", name: "Demam", questionText: "Apakah anak mengalami demam?", category: "general", isRedFlag: false },
  { code: "G005", name: "Pilek", questionText: "Apakah anak mengalami pilek?", category: "respiratory", isRedFlag: false },
  { code: "G006", name: "Diare", questionText: "Apakah anak buang air besar cair berulang?", category: "digestive", isRedFlag: false },
  { code: "G007", name: "Muntah", questionText: "Apakah anak mengalami muntah?", category: "digestive", isRedFlag: false },
  { code: "G008", name: "Mata cekung", questionText: "Apakah mata anak tampak cekung?", category: "digestive", isRedFlag: false },
  { code: "G009", name: "Malas minum", questionText: "Apakah anak tampak malas minum?", category: "digestive", isRedFlag: false },
  { code: "G010", name: "Tidak bisa minum", questionText: "Apakah anak tidak bisa minum sama sekali?", category: "danger", isRedFlag: true },
  { code: "G011", name: "Nyeri telinga", questionText: "Apakah anak mengeluh atau tampak nyeri telinga?", category: "ear", isRedFlag: false },
  { code: "G012", name: "Keluar cairan dari telinga", questionText: "Apakah ada cairan yang keluar dari telinga?", category: "ear", isRedFlag: false },
  { code: "G013", name: "Mengi", questionText: "Apakah anak mengalami mengi atau bunyi ngik-ngik?", category: "respiratory", isRedFlag: false },
  { code: "G014", name: "Ruam kemerahan", questionText: "Apakah muncul ruam kemerahan pada kulit?", category: "skin", isRedFlag: false },
  { code: "G015", name: "Mata merah", questionText: "Apakah mata anak tampak merah?", category: "eye", isRedFlag: false },
];

const diseases = [
  {
    code: "P001",
    name: "Pneumonia",
    severityLevel: "high",
    description: "Infeksi saluran napas bawah pada anak.",
    advice: "Segera periksa ke fasilitas kesehatan, terutama bila napas cepat atau ada tarikan dinding dada.",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/pneumonia",
  },
  {
    code: "P002",
    name: "ISPA / Common Cold",
    severityLevel: "low",
    description: "Infeksi saluran napas atas ringan.",
    advice: "Cukupi cairan, istirahat, pantau gejala. Periksa bila memburuk.",
    sourceUrl: "https://www.who.int",
  },
  {
    code: "P003",
    name: "Diare tanpa dehidrasi",
    severityLevel: "medium",
    description: "Diare tanpa tanda dehidrasi.",
    advice: "Berikan cairan dan pantau tanda dehidrasi.",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
  },
  {
    code: "P004",
    name: "Diare dehidrasi ringan/sedang",
    severityLevel: "high",
    description: "Diare dengan tanda dehidrasi ringan atau sedang.",
    advice: "Perbanyak cairan/ORS dan bawa berobat bila anak tampak lemah.",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
  },
  {
    code: "P005",
    name: "Diare dehidrasi berat",
    severityLevel: "critical",
    description: "Diare dengan tanda bahaya dehidrasi berat.",
    advice: "Segera ke IGD atau fasilitas kesehatan terdekat.",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
  },
  {
    code: "P006",
    name: "Otitis media",
    severityLevel: "medium",
    description: "Infeksi telinga tengah.",
    advice: "Periksakan ke dokter untuk evaluasi lebih lanjut.",
    sourceUrl: "https://medlineplus.gov/earinfections.html",
  },
  {
    code: "P007",
    name: "Bronkiolitis",
    severityLevel: "high",
    description: "Infeksi saluran napas kecil, sering ditandai mengi.",
    advice: "Pantau napas anak. Segera ke dokter bila napas cepat atau sulit minum.",
    sourceUrl: "https://www.nhs.uk/conditions/bronchiolitis/",
  },
  {
    code: "P008",
    name: "Campak",
    severityLevel: "high",
    description: "Infeksi virus dengan demam dan ruam.",
    advice: "Segera konsultasi ke tenaga medis, terutama bila anak lemah atau sulit makan/minum.",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/measles",
  },
];

const rules = [
  {
    code: "R001",
    name: "Pneumonia dasar",
    diseaseCode: "P001",
    operator: RuleOperator.AND,
    minMatch: 2,
    symptoms: [
      { code: "G001", isMandatory: true },
      { code: "G002", isMandatory: true },
      { code: "G003", isMandatory: false },
    ],
  },
  {
    code: "R002",
    name: "ISPA umum",
    diseaseCode: "P002",
    operator: RuleOperator.AND,
    minMatch: 2,
    symptoms: [
      { code: "G001", isMandatory: false },
      { code: "G005", isMandatory: true },
      { code: "G004", isMandatory: false },
    ],
  },
  {
    code: "R003",
    name: "Diare tanpa dehidrasi",
    diseaseCode: "P003",
    operator: RuleOperator.AND,
    minMatch: 1,
    symptoms: [{ code: "G006", isMandatory: true }],
  },
  {
    code: "R004",
    name: "Diare dehidrasi ringan sedang",
    diseaseCode: "P004",
    operator: RuleOperator.AND,
    minMatch: 3,
    symptoms: [
      { code: "G006", isMandatory: true },
      { code: "G008", isMandatory: true },
      { code: "G009", isMandatory: true },
    ],
  },
  {
    code: "R005",
    name: "Diare dehidrasi berat",
    diseaseCode: "P005",
    operator: RuleOperator.AND,
    minMatch: 2,
    symptoms: [
      { code: "G006", isMandatory: true },
      { code: "G010", isMandatory: true },
      { code: "G008", isMandatory: false },
    ],
  },
  {
    code: "R006",
    name: "Otitis media",
    diseaseCode: "P006",
    operator: RuleOperator.OR,
    minMatch: 1,
    symptoms: [
      { code: "G011", isMandatory: false },
      { code: "G012", isMandatory: false },
      { code: "G004", isMandatory: false },
    ],
  },
  {
    code: "R007",
    name: "Bronkiolitis",
    diseaseCode: "P007",
    operator: RuleOperator.AND,
    minMatch: 2,
    symptoms: [
      { code: "G001", isMandatory: false },
      { code: "G002", isMandatory: false },
      { code: "G013", isMandatory: true },
    ],
  },
  {
    code: "R008",
    name: "Campak",
    diseaseCode: "P008",
    operator: RuleOperator.AND,
    minMatch: 2,
    symptoms: [
      { code: "G004", isMandatory: true },
      { code: "G014", isMandatory: true },
      { code: "G015", isMandatory: false },
    ],
  },
];

const weights = [
  { diseaseCode: "P001", symptomCode: "G001", cfExpert: 0.6 },
  { diseaseCode: "P001", symptomCode: "G002", cfExpert: 0.8 },
  { diseaseCode: "P001", symptomCode: "G003", cfExpert: 1.0 },

  { diseaseCode: "P002", symptomCode: "G005", cfExpert: 0.8 },
  { diseaseCode: "P002", symptomCode: "G001", cfExpert: 0.5 },
  { diseaseCode: "P002", symptomCode: "G004", cfExpert: 0.3 },

  { diseaseCode: "P003", symptomCode: "G006", cfExpert: 0.8 },

  { diseaseCode: "P004", symptomCode: "G006", cfExpert: 0.8 },
  { diseaseCode: "P004", symptomCode: "G008", cfExpert: 0.7 },
  { diseaseCode: "P004", symptomCode: "G009", cfExpert: 0.8 },

  { diseaseCode: "P005", symptomCode: "G006", cfExpert: 0.8 },
  { diseaseCode: "P005", symptomCode: "G010", cfExpert: 1.0 },
  { diseaseCode: "P005", symptomCode: "G008", cfExpert: 0.7 },

  { diseaseCode: "P006", symptomCode: "G011", cfExpert: 0.8 },
  { diseaseCode: "P006", symptomCode: "G012", cfExpert: 1.0 },
  { diseaseCode: "P006", symptomCode: "G004", cfExpert: 0.4 },

  { diseaseCode: "P007", symptomCode: "G013", cfExpert: 0.9 },
  { diseaseCode: "P007", symptomCode: "G002", cfExpert: 0.7 },
  { diseaseCode: "P007", symptomCode: "G001", cfExpert: 0.5 },

  { diseaseCode: "P008", symptomCode: "G004", cfExpert: 0.7 },
  { diseaseCode: "P008", symptomCode: "G014", cfExpert: 1.0 },
  { diseaseCode: "P008", symptomCode: "G015", cfExpert: 0.6 },
];

async function main() {
  await prisma.consultationResult.deleteMany();
  await prisma.consultationAnswer.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.ruleDetail.deleteMany();
  await prisma.rule.deleteMany();
  await prisma.diseaseSymptomWeight.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.disease.deleteMany();

  for (const symptom of symptoms) {
    await prisma.symptom.create({ data: symptom });
  }

  for (const disease of diseases) {
    await prisma.disease.create({ data: disease });
  }

  const symptomMap = new Map(
    (await prisma.symptom.findMany()).map((s) => [s.code, s.id]),
  );
  const diseaseMap = new Map(
    (await prisma.disease.findMany()).map((d) => [d.code, d.id]),
  );

  for (const rule of rules) {
    const createdRule = await prisma.rule.create({
      data: {
        code: rule.code,
        name: rule.name,
        diseaseId: diseaseMap.get(rule.diseaseCode)!,
        operator: rule.operator,
        minMatch: rule.minMatch,
      },
    });

    for (const item of rule.symptoms) {
      await prisma.ruleDetail.create({
        data: {
          ruleId: createdRule.id,
          symptomId: symptomMap.get(item.code)!,
          isMandatory: item.isMandatory,
        },
      });
    }
  }

  for (const weight of weights) {
    await prisma.diseaseSymptomWeight.create({
      data: {
        diseaseId: diseaseMap.get(weight.diseaseCode)!,
        symptomId: symptomMap.get(weight.symptomCode)!,
        cfExpert: weight.cfExpert,
      },
    });
  }

  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });