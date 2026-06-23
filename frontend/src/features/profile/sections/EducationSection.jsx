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
    education: Array.isArray(profile.education)
      ? profile.education.map((edu) => ({
          id: edu.id,
          schoolName: edu.schoolName ?? '',
          degree: edu.degree ?? '',
          fieldOfStudy: edu.fieldOfStudy ?? '',
          startDate: edu.startDate ?? '',
          endDate: edu.endDate ?? '',
          description: edu.description ?? '',
        }))
      : [],
  };
}

function validate(values) {
  const errors = {};
  values.education.forEach((edu, idx) => {
    if (!isRequired(edu.schoolName)) {
      errors[`education[${idx}].schoolName`] = 'School name is required';
    }
    if (!isRequired(edu.degree)) {
      errors[`education[${idx}].degree`] = 'Degree is required';
    }
    if (!isRequired(edu.fieldOfStudy)) {
      errors[`education[${idx}].fieldOfStudy`] = 'Field of study is required';
    }
    if (!edu.startDate) {
      errors[`education[${idx}].startDate`] = 'Start date is required';
    }
    if (!endNotBeforeStart(edu.startDate, edu.endDate)) {
      errors[`education[${idx}].endDate`] = 'End date cannot be earlier than start date';
    }
  });
  return errors;
}

function makeId() {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}`;
}

export default function EducationSection({ profile, onSaved }) {
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
      const result = await saveProfileSection('education', vals, token);
      if (result.fieldErrors) return { fieldErrors: result.fieldErrors };
      onSaved?.(result.profile);
      return { values: pick(result.profile) };
    },
  });

  function addEducation() {
    setValues({
      education: [
        ...values.education,
        {
          id: makeId(),
          schoolName: '',
          degree: '',
          fieldOfStudy: '',
          startDate: '',
          endDate: '',
          description: '',
        },
      ],
    });
  }

  function updateEducation(idx, field, value) {
    setValues({
      education: values.education.map((edu, index) =>
        index === idx ? { ...edu, [field]: value } : edu
      ),
    });
  }

  function deleteEducation(idx) {
    setValues({
      education: values.education.filter((_, index) => index !== idx),
    });
  }

  return (
    <SectionCard
      title="Education"
      description="Add your academic background as separate records."
      status={status}
      saveError={saveError}
      isDirty={isDirty}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-white/70">
            Add one or more education entries.
          </p>
          <button
            type="button"
            onClick={addEducation}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Add Education
          </button>
        </div>

        {values.education.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white/70">
            No education records have been added yet.
          </p>
        ) : (
          <div className="space-y-4">
            {values.education.map((edu, idx) => {
              const errorKey = (field) => `education[${idx}].${field}`;
              return (
                <div
                  key={edu.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 space-y-4"
                >
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label htmlFor={`school-${edu.id}`} className={LABEL_CLASS}>
                        School Name*
                      </label>
                      <input
                        id={`school-${edu.id}`}
                        type="text"
                        value={edu.schoolName}
                        onChange={(e) => updateEducation(idx, 'schoolName', e.target.value)}
                        aria-invalid={errors[errorKey('schoolName')] ? 'true' : 'false'}
                        className={FIELD_CLASS}
                      />
                      {errors[errorKey('schoolName')] && (
                        <p className="mt-2 text-sm text-red-400">
                          {errors[errorKey('schoolName')]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor={`degree-${edu.id}`} className={LABEL_CLASS}>
                        Degree*
                      </label>
                      <input
                        id={`degree-${edu.id}`}
                        type="text"
                        value={edu.degree}
                        onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                        aria-invalid={errors[errorKey('degree')] ? 'true' : 'false'}
                        className={FIELD_CLASS}
                      />
                      {errors[errorKey('degree')] && (
                        <p className="mt-2 text-sm text-red-400">
                          {errors[errorKey('degree')]}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`fieldOfStudy-${edu.id}`} className={LABEL_CLASS}>
                      Field of Study*
                    </label>
                    <input
                      id={`fieldOfStudy-${edu.id}`}
                      type="text"
                      value={edu.fieldOfStudy}
                      onChange={(e) => updateEducation(idx, 'fieldOfStudy', e.target.value)}
                      aria-invalid={errors[errorKey('fieldOfStudy')] ? 'true' : 'false'}
                      className={FIELD_CLASS}
                    />
                    {errors[errorKey('fieldOfStudy')] && (
                      <p className="mt-2 text-sm text-red-400">
                        {errors[errorKey('fieldOfStudy')]}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label htmlFor={`startDate-${edu.id}`} className={LABEL_CLASS}>
                        Start Date*
                      </label>
                      <input
                        id={`startDate-${edu.id}`}
                        type="date"
                        value={edu.startDate}
                        onChange={(e) => updateEducation(idx, 'startDate', e.target.value)}
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
                      <label htmlFor={`endDate-${edu.id}`} className={LABEL_CLASS}>
                        End Date
                      </label>
                      <input
                        id={`endDate-${edu.id}`}
                        type="date"
                        value={edu.endDate}
                        onChange={(e) => updateEducation(idx, 'endDate', e.target.value)}
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
                    <label htmlFor={`description-${edu.id}`} className={LABEL_CLASS}>
                      Description
                    </label>
                    <textarea
                      id={`description-${edu.id}`}
                      value={edu.description}
                      onChange={(e) => updateEducation(idx, 'description', e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => deleteEducation(idx)}
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

EducationSection.propTypes = {
  profile: PropTypes.object.isRequired,
  onSaved: PropTypes.func,
};
