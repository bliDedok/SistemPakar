type SymptomItem = {
  id: string;
  code: string;
  name: string;
  questionText: string | null;
  description: string | null;
};

type SymptomRepository = {
  findAll(): Promise<SymptomItem[]>;
};

export class ListSymptomsUseCase {
  constructor(private readonly repository: SymptomRepository) {}

  async execute() {
    return this.repository.findAll();
  }
}