import PropTypes from 'prop-types';
import { useAuth } from '../../auth/useAuth.js';
import useSectionSave from '../useSectionSave.js';
import SectionCard from '../SectionCard.jsx';
import { saveProfileSection } from '../profileApi.js';
import { isRequired } from '../validators.js';

const FIELD_CLASS =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL_CLASS = 'block text-sm font-medium text-white/70 mb-2';
const BUTTON_CLASS =
  'rounded-xl border px-3 py-2 text-sm font-medium transition disabled:opacity-50';

function pick(profile) {
  return {
    skills: Array.isArray(profile.skills)
      ? profile.skills.map((skill) => ({
          id: skill.id,
          name: skill.name ?? '',
          category: skill.category ?? '',
          proficiency: skill.proficiency ?? '',
        }))
      : [],
  };
}

function validate(values) {
  const errors = {};
  const seenNames = new Set();

  values.skills.forEach((skill, idx) => {
    const trimmedName = skill.name?.trim();
    if (!isRequired(trimmedName)) {
      errors[`skills[${idx}].name`] = 'Skill name is required';
      return;
    }

    const normalizedName = trimmedName.toLowerCase();
    if (seenNames.has(normalizedName)) {
      errors[`skills[${idx}].name`] = 'Duplicate skill';
    } else {
      seenNames.add(normalizedName);
    }
  });
  return errors;
}

function makeId() {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}`;
}

export default function SkillsSection({ profile, onSaved }) {
  const { currentUser } = useAuth();

  const {
    values,
    setValues,
    errors,
    status,
    saveError,
    isDirty,
    handleSubmit,
  } = useSectionSave({
    initialValues: pick(profile),
    validate,
    save: async (vals) => {
      const token = await currentUser.getIdToken();
      const result = await saveProfileSection('skills', vals, token);
      if (result.fieldErrors) return { fieldErrors: result.fieldErrors };
      onSaved?.(result.profile);
      return { values: pick(result.profile) };
    },
  });

  function addSkill() {
    setValues({
      skills: [
        ...values.skills,
        {
          id: makeId(),
          name: '',
          category: '',
          proficiency: '',
        },
      ],
    });
  }

  function updateSkill(idx, field, value) {
    setValues({
      skills: values.skills.map((skill, index) =>
        index === idx ? { ...skill, [field]: value } : skill
      ),
    });
  }

  function deleteSkill(idx) {
    setValues({
      skills: values.skills.filter((_, index) => index !== idx),
    });
  }

  function moveSkill(idx, direction) {
    setValues((prev) => {
      const next = [...prev.skills];
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { skills: next };
    });
  }

  return (
    <SectionCard
      title="Skills"
      description="Manage your skills as separate records."
      status={status}
      saveError={saveError}
      isDirty={isDirty}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-white/70">
            Add one or more skills to showcase on your profile.
          </p>
          <button
            type="button"
            onClick={addSkill}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Add Skill
          </button>
        </div>

        {values.skills.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white/70">
            No skills have been added yet.
          </p>
        ) : (
          <div className="space-y-4">
            {values.skills.map((skill, idx) => {
              const errorKey = (field) => `skills[${idx}].${field}`;
              return (
                <div
                  key={skill.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveSkill(idx, 'up')}
                        disabled={idx === 0}
                        className={`${BUTTON_CLASS} border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10`}
                      >
                        Move Up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSkill(idx, 'down')}
                        disabled={idx === values.skills.length - 1}
                        className={`${BUTTON_CLASS} border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10`}
                      >
                        Move Down
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteSkill(idx)}
                      className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 hover:border-red-500/60 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label htmlFor={`skill-name-${skill.id}`} className={LABEL_CLASS}>
                        Skill Name*
                      </label>
                      <input
                        id={`skill-name-${skill.id}`}
                        type="text"
                        value={skill.name}
                        onChange={(e) => updateSkill(idx, 'name', e.target.value)}
                        aria-invalid={errors[errorKey('name')] ? 'true' : 'false'}
                        className={FIELD_CLASS}
                      />
                      {errors[errorKey('name')] && (
                        <p className="mt-2 text-sm text-red-400">
                          {errors[errorKey('name')]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`skill-category-${skill.id}`} className={LABEL_CLASS}>
                        Category
                      </label>
                      <input
                        id={`skill-category-${skill.id}`}
                        type="text"
                        value={skill.category}
                        onChange={(e) => updateSkill(idx, 'category', e.target.value)}
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`skill-proficiency-${skill.id}`} className={LABEL_CLASS}>
                      Proficiency
                    </label>
                    <input
                      id={`skill-proficiency-${skill.id}`}
                      type="text"
                      value={skill.proficiency}
                      onChange={(e) => updateSkill(idx, 'proficiency', e.target.value)}
                      className={FIELD_CLASS}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

SkillsSection.propTypes = {
  profile: PropTypes.object.isRequired,
  onSaved: PropTypes.func,
};
