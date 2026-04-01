export type SymptomData = {
  id: string;
  code: string;
  name: string;
  questionText: string;
  category: string | null;
  isRedFlag: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSymptomInput = {
  code: string;
  name: string;
  questionText: string;
  category?: string | null;
  isRedFlag?: boolean;
  isActive?: boolean;
};

export type UpdateSymptomInput = {
  code?: string;
  name?: string;
  questionText?: string;
  category?: string | null;
  isRedFlag?: boolean;
  isActive?: boolean;
};

export interface SymptomRepository {
  findAll(): Promise<SymptomData[]>;
  findById(id: string): Promise<SymptomData | null>;
  create(data: CreateSymptomInput): Promise<SymptomData>;
  update(id: string, data: UpdateSymptomInput): Promise<SymptomData>;
  delete(id: string): Promise<void>;
}