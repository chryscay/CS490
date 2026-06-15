import { useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../auth/useAuth';
import './JobFormModal.css';

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
  const [jobPostingBody, setJobPostingBody] = useState(job?.jobPostingBody ?? '');
  const [stage, setStage] = useState(job?.stage ?? 'Interested');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const validate = () => {
    const next = {};
    if (!company.trim()) next.company = 'Company is required';
    if (!title.trim()) next.title = 'Title is required';
    if (!jobPostingBody.trim()) next.jobPostingBody = 'Job posting body is required';
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
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit job' : 'Add job'}>
      <div className="modal">
        <h2 className="modal-title">{isEdit ? 'Edit Job' : 'Add Job'}</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-field">
            <label htmlFor="job-company">Company</label>
            <input
              id="job-company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            {errors.company && <span className="field-error">{errors.company}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="job-title">Title</label>
            <input
              id="job-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && <span className="field-error">{errors.title}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="job-body">Job Posting Body</label>
            <textarea
              id="job-body"
              rows={5}
              value={jobPostingBody}
              onChange={(e) => setJobPostingBody(e.target.value)}
            />
            {errors.jobPostingBody && (
              <span className="field-error">{errors.jobPostingBody}</span>
            )}
          </div>

          {isEdit && (
            <div className="form-field">
              <label htmlFor="job-stage">Stage</label>
              <select
                id="job-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formError && <p className="form-error" role="alert">{formError}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
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





