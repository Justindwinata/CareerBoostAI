import type { TargetAnalysisPriority, TargetRequiredSectionName } from "../types/resumeUpload";
import {
  ANALYSIS_PRIORITY_OPTIONS,
  getFieldErrorId,
  normalizeDelimitedList,
  REQUIRED_SECTION_OPTIONS,
  TEXT_LIMITS,
  type TargetCriteriaFormValue,
  type TargetCriteriaValidationErrors,
} from "./targetCriteriaForm";

function formatSkillCount(skills: string[]): string {
  if (skills.length === 0) {
    return "No skills listed";
  }

  return `${skills.length} unique skill${skills.length === 1 ? "" : "s"} listed`;
}

function renderError(
  errors: TargetCriteriaValidationErrors,
  fieldName: keyof TargetCriteriaFormValue,
) {
  const error = errors[fieldName];

  if (!error) {
    return null;
  }

  return (
    <p className="field-error" id={getFieldErrorId(fieldName)}>
      {error}
    </p>
  );
}

type TargetCriteriaPanelProps = {
  value: TargetCriteriaFormValue;
  errors: TargetCriteriaValidationErrors;
  disabled: boolean;
  onChange: (value: TargetCriteriaFormValue) => void;
};

export function TargetCriteriaPanel({
  value,
  errors,
  disabled,
  onChange,
}: TargetCriteriaPanelProps) {
  const requiredSkills = normalizeDelimitedList(value.required_skills);
  const preferredSkills = normalizeDelimitedList(value.preferred_skills);

  function updateField(fieldName: keyof TargetCriteriaFormValue, fieldValue: string) {
    onChange({
      ...value,
      [fieldName]: fieldValue,
    });
  }

  function toggleRequiredSection(sectionName: TargetRequiredSectionName) {
    const nextSections = value.required_sections.includes(sectionName)
      ? value.required_sections.filter((currentSection) => currentSection !== sectionName)
      : [...value.required_sections, sectionName];

    onChange({
      ...value,
      required_sections: nextSections,
    });
  }

  function toggleAnalysisPriority(priorityName: TargetAnalysisPriority) {
    const nextPriorities = value.analysis_priorities.includes(priorityName)
      ? value.analysis_priorities.filter((currentPriority) => currentPriority !== priorityName)
      : [...value.analysis_priorities, priorityName];

    onChange({
      ...value,
      analysis_priorities: nextPriorities,
    });
  }

  return (
    <section className="target-criteria-panel" aria-labelledby="target-criteria-title">
      <div className="target-criteria-intro">
        <div>
          <p className="eyebrow">Application Target</p>
          <h2 id="target-criteria-title">Define the target role before analyzing a resume.</h2>
          <p id="target-criteria-description">
            Optional criteria are captured as validated metadata for future resume alignment work.
            They do not produce scores, pass/fail outcomes, or hiring predictions.
          </p>
        </div>
      </div>

      <div className="target-criteria-grid">
        <div className="field-group">
          <label htmlFor="target-role">Target role</label>
          <input
            id="target-role"
            type="text"
            value={value.target_role}
            maxLength={TEXT_LIMITS.target_role + 1}
            aria-describedby={`target-role-help ${errors.target_role ? getFieldErrorId("target_role") : ""}`}
            aria-invalid={Boolean(errors.target_role)}
            disabled={disabled}
            onChange={(event) => updateField("target_role", event.target.value)}
            placeholder="Frontend Developer Intern"
          />
          <p id="target-role-help" className="field-help">
            Optional but recommended. {value.target_role.trim().length}/{TEXT_LIMITS.target_role}
            characters.
          </p>
          {renderError(errors, "target_role")}
        </div>

        <div className="field-group">
          <label htmlFor="target-description">Job or internship description</label>
          <textarea
            id="target-description"
            value={value.target_description}
            maxLength={TEXT_LIMITS.target_description + 1}
            aria-describedby={`target-description-help ${
              errors.target_description ? getFieldErrorId("target_description") : ""
            }`}
            aria-invalid={Boolean(errors.target_description)}
            disabled={disabled}
            rows={5}
            onChange={(event) => updateField("target_description", event.target.value)}
            placeholder="Paste a short role description or application context."
          />
          <p id="target-description-help" className="field-help">
            {value.target_description.trim().length}/{TEXT_LIMITS.target_description} characters.
          </p>
          {renderError(errors, "target_description")}
        </div>

        <div className="field-group">
          <label htmlFor="required-skills">Required skills</label>
          <textarea
            id="required-skills"
            value={value.required_skills}
            aria-describedby={`required-skills-help ${
              errors.required_skills ? getFieldErrorId("required_skills") : ""
            }`}
            aria-invalid={Boolean(errors.required_skills)}
            disabled={disabled}
            rows={3}
            onChange={(event) => updateField("required_skills", event.target.value)}
            placeholder="Python, React, SQL"
          />
          <p id="required-skills-help" className="field-help">
            Use commas or new lines. Duplicates are removed case-insensitively.
          </p>
          <SkillPreview label="Normalized required skills" skills={requiredSkills} />
          {renderError(errors, "required_skills")}
        </div>

        <div className="field-group">
          <label htmlFor="preferred-skills">Preferred skills</label>
          <textarea
            id="preferred-skills"
            value={value.preferred_skills}
            aria-describedby={`preferred-skills-help ${
              errors.preferred_skills ? getFieldErrorId("preferred_skills") : ""
            }`}
            aria-invalid={Boolean(errors.preferred_skills)}
            disabled={disabled}
            rows={3}
            onChange={(event) => updateField("preferred_skills", event.target.value)}
            placeholder="Docker, PostgreSQL, Power BI"
          />
          <p id="preferred-skills-help" className="field-help">
            Optional skills or tools that provide extra role context.
          </p>
          <SkillPreview label="Normalized preferred skills" skills={preferredSkills} />
          {renderError(errors, "preferred_skills")}
        </div>

        <fieldset className="checkbox-group" disabled={disabled}>
          <legend>Required resume sections</legend>
          <p className="field-help">
            Default sections are selected for common internship resumes and can be adjusted.
          </p>
          <div className="checkbox-grid">
            {REQUIRED_SECTION_OPTIONS.map((option) => (
              <label key={option.value} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={value.required_sections.includes(option.value)}
                  onChange={() => toggleRequiredSection(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="checkbox-group" disabled={disabled}>
          <legend>Analysis priorities</legend>
          <p className="field-help">
            These priorities define future review focus only. They do not create a score.
          </p>
          <div className="checkbox-grid">
            {ANALYSIS_PRIORITY_OPTIONS.map((option) => (
              <label key={option.value} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={value.analysis_priorities.includes(option.value)}
                  onChange={() => toggleAnalysisPriority(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field-group">
          <label htmlFor="experience-expectation">Experience expectation</label>
          <input
            id="experience-expectation"
            type="text"
            value={value.experience_expectation}
            maxLength={TEXT_LIMITS.experience_expectation + 1}
            aria-describedby={`experience-expectation-help ${
              errors.experience_expectation ? getFieldErrorId("experience_expectation") : ""
            }`}
            aria-invalid={Boolean(errors.experience_expectation)}
            disabled={disabled}
            onChange={(event) => updateField("experience_expectation", event.target.value)}
            placeholder="Internship level"
          />
          <p id="experience-expectation-help" className="field-help">
            {value.experience_expectation.trim().length}/{TEXT_LIMITS.experience_expectation}
            characters.
          </p>
          {renderError(errors, "experience_expectation")}
        </div>

        <div className="field-group">
          <label htmlFor="education-expectation">Education expectation</label>
          <input
            id="education-expectation"
            type="text"
            value={value.education_expectation}
            maxLength={TEXT_LIMITS.education_expectation + 1}
            aria-describedby={`education-expectation-help ${
              errors.education_expectation ? getFieldErrorId("education_expectation") : ""
            }`}
            aria-invalid={Boolean(errors.education_expectation)}
            disabled={disabled}
            onChange={(event) => updateField("education_expectation", event.target.value)}
            placeholder="Computer Science or related field preferred"
          />
          <p id="education-expectation-help" className="field-help">
            {value.education_expectation.trim().length}/{TEXT_LIMITS.education_expectation}
            characters.
          </p>
          {renderError(errors, "education_expectation")}
        </div>

        <div className="field-group field-group--full">
          <label htmlFor="target-notes">Notes</label>
          <textarea
            id="target-notes"
            value={value.notes}
            maxLength={TEXT_LIMITS.notes + 1}
            aria-describedby={`target-notes-help ${errors.notes ? getFieldErrorId("notes") : ""}`}
            aria-invalid={Boolean(errors.notes)}
            disabled={disabled}
            rows={4}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Optional application context or review notes."
          />
          <p id="target-notes-help" className="field-help">
            {value.notes.trim().length}/{TEXT_LIMITS.notes} characters.
          </p>
          {renderError(errors, "notes")}
        </div>
      </div>
    </section>
  );
}

function SkillPreview({ label, skills }: { label: string; skills: string[] }) {
  return (
    <div className="skill-preview" aria-label={label}>
      <p>{formatSkillCount(skills)}</p>
      {skills.length > 0 ? (
        <ul className="section-chip-list">
          {skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
