import {
  KeepStatus,
  SymptomRole,
  UrgencyMode,
} from "../../generated/prisma/enums";

export function round(value: number, decimals = 4) {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
}

export function combinePositiveCf(oldCf: number, newCf: number) {
  return oldCf + newCf * (1 - oldCf);
}

export function getDiagnosticRoleMultiplier(params: {
  symptomRole: SymptomRole;
  urgencyMode: UrgencyMode;
  keepStatus: KeepStatus;
}) {
  if (params.keepStatus === KeepStatus.EXCLUDE) return 0;
  if (params.urgencyMode === UrgencyMode.URGENCY_ONLY) return 0;

  switch (params.symptomRole) {
    case SymptomRole.CORE:
      return 0.65;

    case SymptomRole.SUPPORTING:
      return 0.35;

    case SymptomRole.WARNING_SIGN:
      return 0.45;

    case SymptomRole.COMPLICATION:
      return 0.30;

    case SymptomRole.SEVERE:
      return 0;

    case SymptomRole.CONTEXT_ONLY:
      return 0;

    default:
      return 0.30;
  }
}

export function calculateRawEvidenceCf(params: {
  userCf: number;
  cfExpert: number;
}) {
  return round(params.userCf * params.cfExpert);
}

export function calculateEffectiveEvidenceCf(params: {
  userCf: number;
  cfExpert: number;
  symptomRole: SymptomRole;
  urgencyMode: UrgencyMode;
  keepStatus: KeepStatus;
}) {
  const rawEvidenceCf = calculateRawEvidenceCf({
    userCf: params.userCf,
    cfExpert: params.cfExpert,
  });

  const multiplier = getDiagnosticRoleMultiplier({
    symptomRole: params.symptomRole,
    urgencyMode: params.urgencyMode,
    keepStatus: params.keepStatus,
  });

  return round(rawEvidenceCf * multiplier);
}

export function combineEvidenceValues(values: number[]) {
  return round(
    values.reduce((current, next) => combinePositiveCf(current, next), 0)
  );
}