import PropTypes from 'prop-types';
import { useAuth } from '../../auth/useAuth.js';
import useSectionSave from '../useSectionSave.js';
import SectionCard from '../SectionCard.jsx';
import { saveProfileSection } from '../profileApi.js';
import { isRequired } from '../validators.js';

const FIELD_CLASS =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL_CLASS = 'block text-sm font-medium text-white/70 mb-2';

const WORK_MODES = ['Remote', 'Hybrid', 'On-site', 'Flexible'];

function pick(profile) {
  return {
    careerPreferences: {
      targetRoles: Array.isArray(profile.careerPreferences?.targetRoles)
        ? profile.careerPreferences.targetRoles.map((role) => ({
            id: typeof role === 'string' ? makeId() : (role.id || makeId()),
            name: typeof role === 'string' ? role : (role.name ?? ''),
          }))
        : [],
      locations: Array.isArray(profile.careerPreferences?.locations)
        ? profile.careerPreferences.locations.map((loc) => ({
            id: typeof loc === 'string' ? makeId() : (loc.id || makeId()),
            name: typeof loc === 'string' ? loc : (loc.name ?? ''),
          }))
        : [],
      workMode: profile.careerPreferences?.workMode ?? '',
      salaryPreference: profile.careerPreferences?.salaryPreference ?? '',
    },
  };
}

function validate(values) {
  const errors = {};
  const prefs = values.careerPreferences;

  prefs.targetRoles.forEach((role, idx) => {
    if (!isRequired(role.name)) {
      errors[`careerPreferences.targetRoles[${idx}].name`] = 'Target role cannot be blank';
    }
  });

  prefs.locations.forEach((loc, idx) => {
    if (!isRequired(loc.name)) {
      errors[`careerPreferences.locations[${idx}].name`] = 'Location cannot be blank';
    }
  });

  return errors;
}

function makeId() {
  return typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export default function CareerPreferencesSection({ profile, onSaved }) {
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
      const result = await saveProfileSection('careerPreferences', vals, token);
      if (result.fieldErrors) return { fieldErrors: result.fieldErrors };
      onSaved?.(result.profile);
      return { values: pick(result.profile) };
    },
  });

  function addTargetRole() {
    setValues((prev) => ({
      careerPreferences: {
        ...prev.careerPreferences,
        targetRoles: [
          ...prev.careerPreferences.targetRoles,
          { id: makeId(), name: '' },
        ],
      },
    }));
  }

  function updateTargetRole(idx, value) {
    setValues((prev) => ({
      careerPreferences: {
        ...prev.careerPreferences,
        targetRoles: prev.careerPreferences.targetRoles.map((role, index) =>
          index === idx ? { ...role, name: value } : role
        ),
      },
    }));
  }

  function deleteTargetRole(idx) {
    setValues((prev) => ({
      careerPreferences: {
        ...prev.careerPreferences,
        targetRoles: prev.careerPreferences.targetRoles.filter((_, index) => index !== idx),
      },
    }));
  }

  function addLocation() {
    setValues((prev) => ({
      careerPreferences: {
        ...prev.careerPreferences,
        locations: [
          ...prev.careerPreferences.locations,
          { id: makeId(), name: '' },
        ],
      },
    }));
  }

  function updateLocation(idx, value) {
    setValues((prev) => ({
      careerPreferences: {
        ...prev.careerPreferences,
        locations: prev.careerPreferences.locations.map((loc, index) =>
          index === idx ? { ...loc, name: value } : loc
        ),
      },
    }));
  }

  function deleteLocation(idx) {
    setValues((prev) => ({
      careerPreferences: {
        ...prev.careerPreferences,
        locations: prev.careerPreferences.locations.filter((_, index) => index !== idx),
      },
    }));
  }

  function updateWorkMode(value) {
    setValues((prev) => ({
      careerPreferences: {
        ...prev.careerPreferences,
        workMode: value,
      },
    }));
  }

  function updateSalaryPreference(value) {
    setValues((prev) => ({
      careerPreferences: {
        ...prev.careerPreferences,
        salaryPreference: value,
      },
    }));
  }

  const prefs = values.careerPreferences;

  return (
    <SectionCard
      title="Career Preferences"
      description="Manage your target roles, location preferences, work mode, and salary expectations."
      status={status}
      saveError={saveError}
      isDirty={isDirty}
      onSubmit={handleSubmit}
    >
      <div className="space-y-6">
        {/* Target Roles */}
        <div>
          <div className="flex items-center justify-between gap-4 mb-4">
          <span className={LABEL_CLASS + ' mb-0'}>Target Roles</span>
            <button
              type="button"
              onClick={addTargetRole}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Add Role
            </button>
          </div>

          {prefs.targetRoles.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white/70">
              No target roles have been added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {prefs.targetRoles.map((role, idx) => {
                const errorKey = `careerPreferences.targetRoles[${idx}].name`;
                return (
                  <div key={role.id} className="flex items-end gap-3">
                    <div className="flex-1">
                      <input
                        id={`target-role-${role.id}`}
                        type="text"
                        value={role.name}
                        onChange={(e) => updateTargetRole(idx, e.target.value)}
                        placeholder="e.g., Software Engineer"
                        aria-invalid={errors[errorKey] ? 'true' : 'false'}
                        className={FIELD_CLASS}
                      />
                      {errors[errorKey] && (
                        <p className="mt-2 text-sm text-red-400">{errors[errorKey]}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteTargetRole(idx)}
                      className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 hover:border-red-500/60 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Locations */}
        <div>
          <div className="flex items-center justify-between gap-4 mb-4">
          <span className={LABEL_CLASS + ' mb-0'}>Location Preferences</span>
            <button
              type="button"
              onClick={addLocation}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Add Location
            </button>
          </div>

          {prefs.locations.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-white/70">
              No location preferences have been added yet.
            </p>
          ) : (
            <div className="space-y-3">
              {prefs.locations.map((loc, idx) => {
                const errorKey = `careerPreferences.locations[${idx}].name`;
                return (
                  <div key={loc.id} className="flex items-end gap-3">
                    <div className="flex-1">
                      <input
                        id={`location-${loc.id}`}
                        type="text"
                        value={loc.name}
                        onChange={(e) => updateLocation(idx, e.target.value)}
                        placeholder="e.g., San Francisco, CA"
                        aria-invalid={errors[errorKey] ? 'true' : 'false'}
                        className={FIELD_CLASS}
                      />
                      {errors[errorKey] && (
                        <p className="mt-2 text-sm text-red-400">{errors[errorKey]}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteLocation(idx)}
                      className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-300 hover:border-red-500/60 hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Work Mode */}
        <div>
          <label htmlFor="workMode" className={LABEL_CLASS}>
            Work Mode
          </label>
          <select
            id="workMode"
            value={prefs.workMode}
            onChange={(e) => updateWorkMode(e.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Select work mode (optional)</option>
            {WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
        </div>

        {/* Salary Preference */}
        <div>
          <label htmlFor="salaryPreference" className={LABEL_CLASS}>
            Salary Preference
          </label>
          <input
            id="salaryPreference"
            type="text"
            value={prefs.salaryPreference}
            onChange={(e) => updateSalaryPreference(e.target.value)}
            placeholder="e.g., $100,000 - $150,000"
            className={FIELD_CLASS}
          />
        </div>
      </div>
    </SectionCard>
  );
}

CareerPreferencesSection.propTypes = {
  profile: PropTypes.object.isRequired,
  onSaved: PropTypes.func,
};
