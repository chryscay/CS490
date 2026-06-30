import PropTypes from 'prop-types';
import { useAuth } from '../../auth/useAuth.js';
import useSectionSave from '../useSectionSave.js';
import SectionCard from '../SectionCard.jsx';
import { saveProfileSection } from '../profileApi.js';
import { endNotBeforeStart, isRequired } from '../validators.js';

const FIELD_CLASS =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL_CLASS = 'block text-sm font-medium text-white/70 mb-2';

function pick(profile) {
  return {
    experience: Array.isArray(profile.experience)
      ? profile.experience.map((exp) => ({
          id: exp.id,
          title: exp.title ?? '',
          company: exp.company ?? '',
          startDate: exp.startDate ?? '',
          endDate: exp.endDate ?? '',
          description: exp.description ?? '',
        }))
      : [],
  };
}

function validate(values) {
  const errors = {};
  values.experience.forEach((exp, idx) => {
    if (!isRequired(exp.title)) {
      errors[`experience[${idx}].title`] = 'Title is required';
    }
    if (!isRequired(exp.company)) {
      errors[`experience[${idx}].company`] = 'Company is required';
    }
    if (!exp.startDate) {
      errors[`experience[${idx}].startDate`] = 'Start date is required';
    }
    if (!endNotBeforeStart(exp.startDate, exp.endDate)) {
      errors[`experience[${idx}].endDate`] = 'End date cannot be earlier than start date';
    }
  });
  return errors;
}

function makeId() {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}`;
}

export default function ExperienceSection({ profile, onSaved }) {
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
      const result = await saveProfileSection('experience', vals, token);
      if (result.fieldErrors) return { fieldErrors: result.fieldErrors };
      onSaved?.(result.profile);
      return { values: pick(result.profile) };
    },
  });

  function addExperience() {
    setValues({
      experience: [
        ...values.experience,
        {
          id: makeId(),
          title: '',
          company: '',
          startDate: '',
          endDate: '',
          description: '',
        },
      ],
    });
  }

  function updateExperience(idx, field, value) {
    setValues({
      experience: values.experience.map((exp, index) =>
        index === idx ? { ...exp, [field]: value } : exp
      ),
    });
  }

  function deleteExperience(idx) {
    setValues({
      experience: values.experience.filter((_, index) => index !== idx),
    });
  }

  return (
    <SectionCard
      title="Experience"
      description="Add your employment and project history as separate records."
      status={status}
      saveError={saveError}
      isDirty={isDirty}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-white/70">
            Add one or more experience entries.
          </p>
          <button
            type="button"
            onClick={addExperience}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Add Experience
          </button>
        </div>

        {values.experience.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white/70">
            No experience records have been added yet.
          </p>
        ) : (
          <div className="space-y-4">
            {values.experience.map((exp, idx) => {
              const errorKey = (field) => `experience[${idx}].${field}`;
              return (
                <div
                  key={exp.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 space-y-4"
                >
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label htmlFor={`title-${exp.id}`} className={LABEL_CLASS}>
                        Title*
                      </label>
                      <input
                        id={`title-${exp.id}`}
                        type="text"
                        value={exp.title}
                        onChange={(e) => updateExperience(idx, 'title', e.target.value)}
                        aria-invalid={errors[errorKey('title')] ? 'true' : 'false'}
                        className={FIELD_CLASS}
                      />
                      {errors[errorKey('title')] && (
                        <p className="mt-2 text-sm text-red-400">
                          {errors[errorKey('title')]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`company-${exp.id}`} className={LABEL_CLASS}>
                        Company*
                      </label>
                      <input
                        id={`company-${exp.id}`}
                        type="text"
                        value={exp.company}
                        onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                        aria-invalid={errors[errorKey('company')] ? 'true' : 'false'}
                        className={FIELD_CLASS}
                      />
                      {errors[errorKey('company')] && (
                        <p className="mt-2 text-sm text-red-400">
                          {errors[errorKey('company')]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label htmlFor={`startDate-${exp.id}`} className={LABEL_CLASS}>
                        Start Date*
                      </label>
                      <input
                        id={`startDate-${exp.id}`}
                        type="date"
                        value={exp.startDate}
                        onChange={(e) => updateExperience(idx, 'startDate', e.target.value)}
                        aria-invalid={errors[errorKey('startDate')] ? 'true' : 'false'}
                        className={FIELD_CLASS}
                      />
                      {errors[errorKey('startDate')] && (
                        <p className="mt-2 text-sm text-red-400">
                          {errors[errorKey('startDate')]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`endDate-${exp.id}`} className={LABEL_CLASS}>
                        End Date
                      </label>
                      <input
                        id={`endDate-${exp.id}`}
                        type="date"
                        value={exp.endDate}
                        onChange={(e) => updateExperience(idx, 'endDate', e.target.value)}
                        aria-invalid={errors[errorKey('endDate')] ? 'true' : 'false'}
                        className={FIELD_CLASS}
                      />
                      {errors[errorKey('endDate')] && (
                        <p className="mt-2 text-sm text-red-400">
                          {errors[errorKey('endDate')]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`description-${exp.id}`} className={LABEL_CLASS}>
                      Description
                    </label>
                    <textarea
                      id={`description-${exp.id}`}
                      value={exp.description}
                      onChange={(e) => updateExperience(idx, 'description', e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => deleteExperience(idx)}
                      className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 hover:border-red-500/60 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
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

ExperienceSection.propTypes = {
  profile: PropTypes.object.isRequired,
  onSaved: PropTypes.func,
};
