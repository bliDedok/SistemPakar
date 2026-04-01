export type DiagnoseAnswerDto = {
  symptomCode: string;
  userCf: number;
};

export type DiagnoseRequestDto = {
  childName?: string;
  childAgeMonths: number;
  gender?: "MALE" | "FEMALE";
  answers: DiagnoseAnswerDto[];
};