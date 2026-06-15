import { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../auth/useAuth';

const STAGES = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

export default function JobFormModal({ job, onClose, onSaved }) {
  const { currentUser } = useAuth();
  const isEdit = Boolean(job);

  const [company, setCompany] = useState(job?.company ?? '');
  const [title, setTitle] = useState(job?.title ?? '');
  const [jobPostingBody, setJobPostingBody] = useState(
    job?.jobPostingBody ?? ''
  );
  const [stage, setStage] = useState(job?.stage ?? 'Interested');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const validate = () => {
    const next = {};
    if (!company.trim()) next.company = 'Company is required';
    if (!title.trim()) next.title = 'Title is required';
    if (!jobPostingBody.trim())
      next.jobPostingBody = 'Job posting body is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const token = await currentUser.getIdToken();
      const url = isEdit
        ? `${import.meta.env.VITE_API_URL}/api/jobs/${job._id}`
        : `${import.meta.env.VITE_API_URL}/api/jobs`;

      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company: company.trim(),
          title: title.trim(),
          jobPostingBody: jobPostingBody.trim(),
          ...(isEdit ? { stage } : {}),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save job');
      }

      onSaved();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="
    fixed
    inset-0
    z-50
    overflow-y-auto
    bg-black/70
    backdrop-blur-sm
    p-4
  "
    >
      <div
        className="
    w-full
    max-w-2xl
    mx-auto
    my-8
    rounded-3xl
    border
    border-white/10
    bg-[#111111]
    p-6
    sm:p-8
    shadow-2xl
    max-h-[90vh]
    overflow-y-auto
  "
      >
        <h2 className="text-3xl font-semibold text-white mb-8">
          {isEdit ? 'Edit Job' : 'Add Job'}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div>
            <label
              htmlFor="job-company"
              className="block text-sm font-medium text-white/70 mb-2"
            >
              Company
            </label>

            <input
              id="job-company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="
              w-full
              rounded-xl
              border
              border-white/10
              bg-white/5
              px-4
              py-3
              text-white
              placeholder:text-white/40
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
            />

            {errors.company && (
              <p className="mt-2 text-sm text-red-400">{errors.company}</p>
            )}
          </div>

          <div>
            <label htmlFor="job-title">Title</label>
            <input
              id="job-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="
              w-full
              rounded-xl
              border
              border-white/10
              bg-white/5
              px-4
              py-3
              text-white
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
            />

            {errors.title && (
              <p className="mt-2 text-sm text-red-400">{errors.title}</p>
            )}
          </div>

          <div>
            <label htmlFor="job-body">Job Posting Body</label>

            <textarea
              id="job-body"
              rows={6}
              value={jobPostingBody}
              onChange={(e) => setJobPostingBody(e.target.value)}
              className="
              w-full
              rounded-xl
              border
              border-white/10
              bg-white/5
              px-4
              py-3
              text-white
              resize-none
              focus:outline-none
              focus:ring-2
              focus:ring-blue-500
            "
            />

            {errors.jobPostingBody && (
              <p className="mt-2 text-sm text-red-400">
                {errors.jobPostingBody}
              </p>
            )}
          </div>

          {isEdit && (
            <div>
              <label
                htmlFor="job-stage"
                className="block text-sm font-medium text-white/70 mb-2"
              >
                Stage
              </label>

              <select
                id="job-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="
                w-full
                rounded-xl
                border
                border-white/10
                bg-white/5
                px-4
                py-3
                text-white
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500
              "
              >
                {STAGES.map((s) => (
                  <option key={s} value={s} className="bg-[#111111]">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formError && (
            <p className="text-sm text-red-400" role="alert">
              {formError}
            </p>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="
              rounded-xl
              border
              border-white/10
              px-5
              py-3
              text-white/70
              hover:text-white
              hover:bg-white/5
              transition
            "
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="
              rounded-xl
              bg-blue-600
              px-5
              py-3
              text-white
              font-medium
              hover:bg-blue-500
              transition
              disabled:opacity-50
            "
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

JobFormModal.propTypes = {
  job: PropTypes.shape({
    _id: PropTypes.string,
    company: PropTypes.string,
    title: PropTypes.string,
    jobPostingBody: PropTypes.string,
    stage: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};
