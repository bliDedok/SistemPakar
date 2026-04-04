export type ChatRole = "user" | "assistant";

export type ChatMessageDto = {
  role: ChatRole;
  content: string;
};

export type StructuredSymptomCandidate = {
  code: string;
  confidence: number;
  symptomName: string;
  matchedAlias: string;
};

export type ChildProfileDraft = {
  childName?: string | null;
  childAgeMonths?: number | null;
  gender?: "MALE" | "FEMALE" | null;
};

export type ChatbotRequestDto = {
  message: string;
  history?: ChatMessageDto[];
  profile?: ChildProfileDraft;
};

export type ChatbotResponseDto = {
  reply: string;
  profile: ChildProfileDraft;
  structured: {
    symptoms: StructuredSymptomCandidate[];
    missingFields: string[];
    canDiagnose: boolean;
  };
  meta: {
    source: "rule-based-fallback";
    note: string;
  };
};
