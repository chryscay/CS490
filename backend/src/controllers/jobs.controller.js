import JobsDAO from '../dao/jobsDAO.js';
import { randomUUID } from 'crypto';
import { isValidStage, isForwardTransition } from '../lib/stageTransitions.js';
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
      const {
        company,
        title,
        jobPostingBody,
        deadline,
        recruiterName,
        contactNotes,
      } = req.body;

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
        deadline: '',
        recruiterName: '',
        contactNotes: '',
      };

      if (deadline !== undefined && deadline !== null && deadline !== '') {
        const parsedDeadline = new Date(deadline);
        if (Number.isNaN(parsedDeadline.getTime())) {
          return res.status(400).json({ error: 'Invalid deadline' });
        }
        job.deadline = parsedDeadline;
      }

      if (recruiterName !== undefined && recruiterName !== null) {
        job.recruiterName = recruiterName.trim();
      }

      if (contactNotes !== undefined && contactNotes !== null) {
        job.contactNotes = contactNotes.trim();
      }

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
      const {
        company,
        title,
        jobPostingBody,
        stage,
        deadline,
        recruiterName,
        contactNotes,
      } = req.body;

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
        deadline: '',
        recruiterName: '',
        contactNotes: '',
      };

      if (stage) {
        fields.stage = stage;
      }

      if (deadline !== undefined && deadline !== null && deadline !== '') {
        const parsedDeadline = new Date(deadline);
        if (Number.isNaN(parsedDeadline.getTime())) {
          return res.status(400).json({ error: 'Invalid deadline' });
        }
        fields.deadline = parsedDeadline;
      }

      if (recruiterName !== undefined && recruiterName !== null) {
        fields.recruiterName = recruiterName.trim();
      }

      if (contactNotes !== undefined && contactNotes !== null) {
        fields.contactNotes = contactNotes.trim();
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

  static async apiTransitionStage(req, res) {
    try {
      const { toStage, confirmOverride = false, note = '' } = req.body;

      // S2-BR-004: target must be a canonical stage
      if (!isValidStage(toStage)) {
        return res.status(400).json({ error: 'Invalid target stage' });
      }

      // Load the owned job to read its current stage. null -> 404.
      const job = await JobsDAO.findByIdForOwner(req.params.id, req.user.uid);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const fromStage = job.stage;

      if (fromStage === toStage) {
        return res
          .status(400)
          .json({ error: `Job is already in stage ${toStage}` });
      }

      const forward = isForwardTransition(fromStage, toStage);

      // S2-BR-007: non-forward needs explicit confirmation before proceeding
      if (!forward && !confirmOverride) {
        return res.status(409).json({
          error: 'Non-forward transition requires confirmation',
          requiresConfirmation: true,
          fromStage,
          toStage,
        });
      }

      // S2-BR-008/009: server stamps identity + time; single entry-builder
      const entry = {
        id: randomUUID(),
        fromStage,
        toStage,
        changedAt: new Date().toISOString(),
        changedBy: req.user.uid,
        isOverride: !forward,
        note: !forward ? String(note || '') : '',
      };

      // Single writer (SCRUM-46) — sets job.stage + pushes the entry
      const updated = await JobsDAO.appendStageTransition(
        req.params.id,
        req.user.uid,
        entry
      );

      if (!updated) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.status(200).json({ message: 'Stage updated', job: updated });
    } catch (error) {
      console.error('apiTransitionStage error:', error);
      return res.status(500).json({ error: 'Failed to update stage' });
    }
  }
  static async apiDeleteJob(req, res) {
    try {
      const deleted = await JobsDAO.deleteJob(req.params.id, req.user.uid);

      if (!deleted) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.status(200).json({ message: 'Job deleted', id: req.params.id });
    } catch (error) {
      console.error('apiDeleteJob error:', error);
      return res.status(500).json({ error: 'Failed to delete job' });
    }
  }


}

export { VALID_STAGES };


