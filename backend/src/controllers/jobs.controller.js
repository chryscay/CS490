import JobsDAO from '../dao/jobsDAO.js';

const VALID_STAGES = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

export default class JobsController {
  static async apiCreateJob(req, res) {
    try {
      const { company, title, jobPostingBody } = req.body;

      if (!company?.trim() || !title?.trim() || !jobPostingBody?.trim()) {
        return res.status(400).json({
          error: 'Company, title, and job posting body are required',
        });
      }

      const job = {
        firebaseUid: req.user.uid,
        company: company.trim(),
        title: title.trim(),
        jobPostingBody: jobPostingBody.trim(),
        stage: 'Interested',
      };

      const result = await JobsDAO.addJob(job);

      return res.status(201).json({
        message: 'Job created',
        id: result.insertedId,
      });
    } catch (error) {
      console.error('apiCreateJob error:', error);
      return res.status(500).json({ error: 'Failed to create job' });
    }
  }

  static async apiGetJobs(req, res) {
    try {
      const jobs = await JobsDAO.findByOwner(req.user.uid);
      return res.status(200).json({ jobs });
    } catch (error) {
      console.error('apiGetJobs error:', error);
      return res.status(500).json({ error: 'Failed to fetch jobs' });
    }
  }

  static async apiGetJobById(req, res) {
    try {
      const job = await JobsDAO.findByIdForOwner(req.params.id, req.user.uid);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.status(200).json({ job });
    } catch (error) {
      console.error('apiGetJobById error:', error);
      return res.status(500).json({ error: 'Failed to fetch job' });
    }
  }

  static async apiUpdateJob(req, res) {
    try {
      const { company, title, jobPostingBody, stage } = req.body;

      if (!company?.trim() || !title?.trim() || !jobPostingBody?.trim()) {
        return res.status(400).json({
          error: 'Company, title, and job posting body are required',
        });
      }

      if (stage && !VALID_STAGES.includes(stage)) {
        return res.status(400).json({ error: 'Invalid stage' });
      }

      const fields = {
        company: company.trim(),
        title: title.trim(),
        jobPostingBody: jobPostingBody.trim(),
      };

      if (stage) {
        fields.stage = stage;
      }

      const updated = await JobsDAO.updateJob(
        req.params.id,
        req.user.uid,
        fields
      );

      if (!updated) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.status(200).json({ message: 'Job updated', job: updated });
    } catch (error) {
      console.error('apiUpdateJob error:', error);
      return res.status(500).json({ error: 'Failed to update job' });
    }
  }


}

export { VALID_STAGES };


