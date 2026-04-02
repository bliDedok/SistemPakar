export type ConsultationListItem = {
  id: string;
  childName: string | null;
  childAgeMonths: number;
  gender: "MALE" | "FEMALE" | null;
  createdAt: Date;
  answersCount: number;
  resultsCount: number;
};

export type ConsultationDetail = {
  id: string;
  childName: string | null;
  childAgeMonths: number;
  gender: "MALE" | "FEMALE" | null;
  createdAt: Date;
  answers: {
    id: string;
    userCf: number;
    symptom: {
      id: string;
      code: string;
      name: string;
      questionText: string;
      category: string | null;
      isRedFlag: boolean;
    };
  }[];
  results: {
    id: string;
    rank: number;
    matchCount: number;
    cfResult: number;
    disease: {
      id: string;
      code: string;
      name: string;
      advice: string | null;
      severityLevel: string | null;
    };
  }[];
};

export interface ConsultationHistoryRepository {
  findAll(): Promise<ConsultationListItem[]>;
  findById(id: string): Promise<ConsultationDetail | null>;
}