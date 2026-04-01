export type DiseaseData = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  advice: string | null;
  severityLevel: string | null;
  sourceUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateDiseaseInput = {
  code: string;
  name: string;
  description?: string | null;
  advice?: string | null;
  severityLevel?: string | null;
  sourceUrl?: string | null;
  isActive?: boolean;
};

export type UpdateDiseaseInput = {
  code?: string;
  name?: string;
  description?: string | null;
  advice?: string | null;
  severityLevel?: string | null;
  sourceUrl?: string | null;
  isActive?: boolean;
};

export interface DiseaseRepository {
  findAll(): Promise<DiseaseData[]>;
  findById(id: string): Promise<DiseaseData | null>;
  create(data: CreateDiseaseInput): Promise<DiseaseData>;
  update(id: string, data: UpdateDiseaseInput): Promise<DiseaseData>;
  softDelete(id: string): Promise<DiseaseData>;
}