export type RuleDetailData = {
  id: string;
  symptomId: string;
  isMandatory: boolean;
  symptom: {
    id: string;
    code: string;
    name: string;
  };
};

export type RuleData = {
  id: string;
  code: string;
  name: string;
  diseaseId: string;
  operator: "AND" | "OR";
  minMatch: number;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  disease: {
    id: string;
    code: string;
    name: string;
  };
  details: RuleDetailData[];
};

export type CreateRuleInput = {
  code: string;
  name: string;
  diseaseId: string;
  operator: "AND" | "OR";
  minMatch: number;
  priority?: number;
  isActive?: boolean;
};

export type UpdateRuleInput = {
  code?: string;
  name?: string;
  diseaseId?: string;
  operator?: "AND" | "OR";
  minMatch?: number;
  priority?: number;
  isActive?: boolean;
};

export type CreateRuleDetailInput = {
  ruleId: string;
  symptomId: string;
  isMandatory?: boolean;
};

export interface RuleRepository {
  findAll(): Promise<RuleData[]>;
  findById(id: string): Promise<RuleData | null>;
  create(data: CreateRuleInput): Promise<RuleData>;
  update(id: string, data: UpdateRuleInput): Promise<RuleData>;
  softDelete(id: string): Promise<RuleData>;
  addDetail(data: CreateRuleDetailInput): Promise<RuleData>;
  removeDetail(ruleId: string, detailId: string): Promise<RuleData>;
}