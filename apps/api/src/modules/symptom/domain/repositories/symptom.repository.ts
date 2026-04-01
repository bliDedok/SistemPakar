export interface SymptomRepository {
  findAll(): Promise<
    {
      id: string;
      code: string;
      name: string;
      questionText: string;
      category: string | null;
      isRedFlag: boolean;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }[]
  >;
}