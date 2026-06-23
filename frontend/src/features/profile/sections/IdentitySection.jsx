import PropTypes from 'prop-types';
import { useAuth } from '../../auth/useAuth.js';
import useSectionSave from '../useSectionSave.js';
import SectionCard from '../SectionCard.jsx';
import { saveProfileSection } from '../profileApi.js';
import { isRequired, isTenDigitPhone } from '../validators.js';
import { US_STATES } from '../states.js';

const FIELD_CLASS =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const LABEL_CLASS = 'block text-sm font-medium text-white/70 mb-2';

function pick(profile) {
  return {
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    phone: profile.phone ?? '',
    city: profile.city ?? '',
    state: profile.state ?? '',
  };
}

function validate(values) {
  const errors = {};
  if (!isRequired(values.firstName)) errors.firstName = 'First name is required';
  if (!isRequired(values.lastName)) errors.lastName = 'Last name is required';
  if (!isTenDigitPhone(values.phone)) {
    errors.phone = 'Phone number must be exactly 10 digits';
  }
  return errors;
}

export default function IdentitySection({ profile, onSaved }) {
  const { currentUser } = useAuth();

  const { values, setValue, errors, status, saveError, isDirty, handleSubmit } =
    useSectionSave({
      initialValues: pick(profile),
      validate,
      save: async (vals) => {
        const token = await currentUser.getIdToken();
        const result = await saveProfileSection('identity', vals, token);
        if (result.fieldErrors) return { fieldErrors: result.fieldErrors };
        onSaved?.(result.profile);
        return { values: pick(result.profile) };
      },
    });

  return (
    <SectionCard
      title="Identity & Contact"
      description="Your name and contact details."
      status={status}
      saveError={saveError}
      isDirty={isDirty}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={LABEL_CLASS}>First Name*</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            value={values.firstName}
            onChange={(e) => setValue('firstName', e.target.value)}
            aria-invalid={errors.firstName ? 'true' : 'false'}
            className={FIELD_CLASS}
          />
          {errors.firstName && (
            <p className="mt-2 text-sm text-red-400">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label htmlFor="lastName" className={LABEL_CLASS}>Last Name*</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={values.lastName}
            onChange={(e) => setValue('lastName', e.target.value)}
            aria-invalid={errors.lastName ? 'true' : 'false'}
            className={FIELD_CLASS}
          />
          {errors.lastName && (
            <p className="mt-2 text-sm text-red-400">{errors.lastName}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <label htmlFor="phone" className={LABEL_CLASS}>Phone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={values.phone}
            onChange={(e) =>
              setValue('phone', e.target.value.replace(/\D/g, '').slice(0, 10))
            }
            maxLength={10}
            aria-invalid={errors.phone ? 'true' : 'false'}
            className={FIELD_CLASS}
          />
          {errors.phone && (
            <p className="mt-2 text-sm text-red-400">{errors.phone}</p>
          )}
        </div>

        <div>
          <label htmlFor="city" className={LABEL_CLASS}>City</label>
          <input
            id="city"
            name="city"
            type="text"
            value={values.city}
            onChange={(e) => setValue('city', e.target.value)}
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <label htmlFor="state" className={LABEL_CLASS}>State</label>
          <select
            id="state"
            name="state"
            value={values.state}
            onChange={(e) => setValue('state', e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select State</option>
            {US_STATES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
    </SectionCard>
  );
}

IdentitySection.propTypes = {
  profile: PropTypes.object.isRequired,
  onSaved: PropTypes.func,
};