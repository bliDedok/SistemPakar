export type WeightData = {
  id: string;
  diseaseId: string;
  symptomId: string;
  cfExpert: number;
  note: string | null;
  disease: {
    id: string;
    code: string;
    name: string;
  };
  symptom: {
    id: string;
    code: string;
    name: string;
  };
};

export type CreateWeightInput = {
  diseaseId: string;
  symptomId: string;
  cfExpert: number;
  note?: string | null;
};

export type UpdateWeightInput = {
  diseaseId?: string;
  symptomId?: string;
  cfExpert?: number;
  note?: string | null;
};

export interface WeightRepository {
  findAll(): Promise<WeightData[]>;
  findById(id: string): Promise<WeightData | null>;
  create(data: CreateWeightInput): Promise<WeightData>;
  update(id: string, data: UpdateWeightInput): Promise<WeightData>;
  delete(id: string): Promise<void>;
}