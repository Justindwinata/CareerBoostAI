import type {
  TargetAnalysisPriority,
  TargetCriteriaInput,
  TargetRequiredSectionName,
} from "../types/resumeUpload";

export const TEXT_LIMITS = {
  target_role: 120,
  target_description: 3000,
  experience_expectation: 500,
  education_expectation: 500,
  notes: 1000,
  skill: 80,
  skill_count: 30,
};

export const DEFAULT_REQUIRED_SECTIONS: TargetRequiredSectionName[] = [
  "summary",
  "skills",
  "experience",
  "education",
  "projects",
];

export const DEFAULT_ANALYSIS_PRIORITIES: TargetAnalysisPriority[] = [
  "resume_structure",
  "ats_compatibility",
  "skill_visibility",
];

export const REQUIRED_SECTION_OPTIONS: Array<{ value: TargetRequiredSectionName; label: string }> =
  [
    { value: "summary", label: "Summary" },
    { value: "skills", label: "Skills" },
    { value: "experience", label: "Experience" },
    { value: "education", label: "Education" },
    { value: "projects", label: "Projects" },
    { value: "certifications", label: "Certifications" },
  ];

export const ANALYSIS_PRIORITY_OPTIONS: Array<{ value: TargetAnalysisPriority; label: string }> = [
  { value: "resume_structure", label: "Resume structure" },
  { value: "ats_compatibility", label: "ATS compatibility" },
  { value: "skill_visibility", label: "Skill visibility" },
  { value: "role_alignment", label: "Role alignment" },
  { value: "project_evidence", label: "Project evidence" },
  { value: "education_fit", label: "Education fit" },
];

export type TargetCriteriaFormValue = {
  target_role: string;
  target_description: string;
  required_skills: string;
  preferred_skills: string;
  required_sections: TargetRequiredSectionName[];
  analysis_priorities: TargetAnalysisPriority[];
  experience_expectation: string;
  education_expectation: string;
  notes: string;
};

export type TargetCriteriaValidationErrors = Partial<Record<keyof TargetCriteriaFormValue, string>>;

export function createDefaultTargetCriteriaFormValue(): TargetCriteriaFormValue {
  return {
    target_role: "",
    target_description: "",
    required_skills: "",
    preferred_skills: "",
    required_sections: DEFAULT_REQUIRED_SECTIONS,
    analysis_priorities: DEFAULT_ANALYSIS_PRIORITIES,
    experience_expectation: "",
    education_expectation: "",
    notes: "",
  };
}

export function normalizeDelimitedList(value: string): string[] {
  const normalizedItems: string[] = [];
  const seenItems = new Set<string>();

  value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const normalizedKey = item.toLocaleLowerCase();

      if (!seenItems.has(normalizedKey)) {
        seenItems.add(normalizedKey);
        normalizedItems.push(item);
      }
    });

  return normalizedItems;
}

function isDefaultSelection<T extends string>(currentValues: T[], defaultValues: T[]): boolean {
  if (currentValues.length !== defaultValues.length) {
    return false;
  }

  return currentValues.every((currentValue) => defaultValues.includes(currentValue));
}

function hasSubmittedCriteria(value: TargetCriteriaFormValue): boolean {
  return (
    Boolean(value.target_role.trim()) ||
    Boolean(value.target_description.trim()) ||
    normalizeDelimitedList(value.required_skills).length > 0 ||
    normalizeDelimitedList(value.preferred_skills).length > 0 ||
    !isDefaultSelection(value.required_sections, DEFAULT_REQUIRED_SECTIONS) ||
    !isDefaultSelection(value.analysis_priorities, DEFAULT_ANALYSIS_PRIORITIES) ||
    Boolean(value.experience_expectation.trim()) ||
    Boolean(value.education_expectation.trim()) ||
    Boolean(value.notes.trim())
  );
}

export function buildTargetCriteriaInput(
  value: TargetCriteriaFormValue,
): TargetCriteriaInput | null {
  if (!hasSubmittedCriteria(value)) {
    return null;
  }

  return {
    target_role: value.target_role.trim(),
    target_description: value.target_description.trim(),
    required_skills: normalizeDelimitedList(value.required_skills),
    preferred_skills: normalizeDelimitedList(value.preferred_skills),
    required_sections: value.required_sections,
    analysis_priorities: value.analysis_priorities,
    experience_expectation: value.experience_expectation.trim(),
    education_expectation: value.education_expectation.trim(),
    notes: value.notes.trim(),
  };
}

export function getTargetCriteriaValidationErrors(
  value: TargetCriteriaFormValue,
): TargetCriteriaValidationErrors {
  const errors: TargetCriteriaValidationErrors = {};
  const requiredSkills = normalizeDelimitedList(value.required_skills);
  const preferredSkills = normalizeDelimitedList(value.preferred_skills);

  if (value.target_role.trim().length > TEXT_LIMITS.target_role) {
    errors.target_role = `Target role must be ${TEXT_LIMITS.target_role} characters or fewer.`;
  }

  if (value.target_description.trim().length > TEXT_LIMITS.target_description) {
    errors.target_description = `Target description must be ${TEXT_LIMITS.target_description} characters or fewer.`;
  }

  if (value.experience_expectation.trim().length > TEXT_LIMITS.experience_expectation) {
    errors.experience_expectation = `Experience expectation must be ${TEXT_LIMITS.experience_expectation} characters or fewer.`;
  }

  if (value.education_expectation.trim().length > TEXT_LIMITS.education_expectation) {
    errors.education_expectation = `Education expectation must be ${TEXT_LIMITS.education_expectation} characters or fewer.`;
  }

  if (value.notes.trim().length > TEXT_LIMITS.notes) {
    errors.notes = `Notes must be ${TEXT_LIMITS.notes} characters or fewer.`;
  }

  if (requiredSkills.length > TEXT_LIMITS.skill_count) {
    errors.required_skills = `Required skills must include ${TEXT_LIMITS.skill_count} items or fewer.`;
  } else if (requiredSkills.some((skill) => skill.length > TEXT_LIMITS.skill)) {
    errors.required_skills = `Each required skill must be ${TEXT_LIMITS.skill} characters or fewer.`;
  }

  if (preferredSkills.length > TEXT_LIMITS.skill_count) {
    errors.preferred_skills = `Preferred skills must include ${TEXT_LIMITS.skill_count} items or fewer.`;
  } else if (preferredSkills.some((skill) => skill.length > TEXT_LIMITS.skill)) {
    errors.preferred_skills = `Each preferred skill must be ${TEXT_LIMITS.skill} characters or fewer.`;
  }

  return errors;
}

export function hasTargetCriteriaValidationErrors(errors: TargetCriteriaValidationErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function getFieldErrorId(fieldName: keyof TargetCriteriaFormValue): string {
  return `${fieldName.replaceAll("_", "-")}-error`;
}
