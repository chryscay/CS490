import PropTypes from 'prop-types';
import { useAuth } from '../../auth/useAuth.js';
import useSectionSave from '../useSectionSave.js';
import SectionCard from '../SectionCard.jsx';
import { saveProfileSection } from '../profileApi.js';
import { isRequired } from '../validators.js';

function pick(profile) {
  return { summary: profile.summary ?? '' };
}

function validate(values) {
  const errors = {};
  if (!isRequired(values.summary)) errors.summary = 'Summary is required';
  return errors;
}

export default function SummarySection({ profile, onSaved }) {
  const { currentUser } = useAuth();

  const { values, setValue, errors, status, saveError, isDirty, handleSubmit } =
    useSectionSave({
      initialValues: pick(profile),
      validate,
      save: async (vals) => {
        const token = await currentUser.getIdToken();
        const result = await saveProfileSection('summary', vals, token);
        if (result.fieldErrors) return { fieldErrors: result.fieldErrors };
        onSaved?.(result.profile);
        return { values: pick(result.profile) };
      },
    });

  return (
    <SectionCard
      title="Professional Summary"
      description="A short overview of your background."
      status={status}
      saveError={saveError}
      isDirty={isDirty}
      onSubmit={handleSubmit}
    >
      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-white/70 mb-2">
          Professional Summary*
        </label>
        <textarea
          id="summary"
          name="summary"
          rows={4}
          value={values.summary}
          onChange={(e) => setValue('summary', e.target.value)}
          aria-invalid={errors.summary ? 'true' : 'false'}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {errors.summary && (
          <p className="mt-2 text-sm text-red-400">{errors.summary}</p>
        )}
      </div>
    </SectionCard>
  );
}

SummarySection.propTypes = {
  profile: PropTypes.object.isRequired,
  onSaved: PropTypes.func,
};