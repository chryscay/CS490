import JobsDAO from '../dao/jobsDAO.js';
import UsersDAO from '../dao/usersDAO.js';
import { randomUUID } from 'crypto';
import { isValidStage, isForwardTransition, isOutcomeStage } from '../lib/stageTransitions.js';
import * as AiDraftService from '../services/aiDraft.service.js';
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

      const isOverride = !forward;
      // S2-013: keep the note when overriding (existing) OR when landing in an
      // outcome stage on the forward path (new). Otherwise it's not an outcome
      // reason and is dropped.
      const keepNote = isOverride || isOutcomeStage(toStage);
  
      const entry = {
        id: randomUUID(),
        fromStage,
        toStage,
        changedAt: new Date().toISOString(),
        changedBy: req.user.uid,
        isOverride,
        note: keepNote ? String(note || '') : '',
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
  static async apiAddInterview(req, res) {
    try {
      const { roundType, scheduledAt, notes } = req.body;

      if (!roundType?.trim() || !scheduledAt || !notes?.trim()) {
        return res.status(400).json({
          error: 'Round type, date/time, and notes are required',
        });
      }

      const parsedDate = new Date(scheduledAt);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid scheduledAt date' });
      }

      const entry = {
        id: randomUUID(),
        roundType: roundType.trim(),
        scheduledAt: parsedDate.toISOString(),
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
      };

      const updated = await JobsDAO.addInterview(req.params.id, req.user.uid, entry);
      if (!updated) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.status(201).json({ message: 'Interview added', job: updated });
    } catch (error) {
      console.error('apiAddInterview error:', error);
      return res.status(500).json({ error: 'Failed to add interview' });
    }
  }

  static async apiUpdateInterview(req, res) {
    try {
      const { roundType, scheduledAt, notes } = req.body;
      const { id, interviewId } = req.params;

      if (!roundType?.trim() || !scheduledAt || !notes?.trim()) {
        return res.status(400).json({
          error: 'Round type, date/time, and notes are required',
        });
      }

      const parsedDate = new Date(scheduledAt);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid scheduledAt date' });
      }

      const fields = {
        roundType: roundType.trim(),
        scheduledAt: parsedDate.toISOString(),
        notes: notes.trim(),
      };

      const updated = await JobsDAO.updateInterview(id, req.user.uid, interviewId, fields);
      if (!updated) {
        return res.status(404).json({ error: 'Job or interview not found' });
      }

      return res.status(200).json({ message: 'Interview updated', job: updated });
    } catch (error) {
      console.error('apiUpdateInterview error:', error);
      return res.status(500).json({ error: 'Failed to update interview' });
    }
  }

  static async apiArchiveJob(req, res) {
    try {
      const { note = '' } = req.body ?? {};
      const job = await JobsDAO.findByIdForOwner(req.params.id, req.user.uid);
      if (!job) return res.status(404).json({ error: 'Job not found' });

      if (job.stage === 'Archived') {
        return res.status(400).json({ error: 'Job is already archived' });
      }

      const fromStage = job.stage;
      const isForward = isForwardTransition(fromStage, 'Archived');

      const entry = {
        id: randomUUID(),
        fromStage,
        toStage: 'Archived',
        changedAt: new Date().toISOString(),
        changedBy: req.user.uid,
        isOverride: !isForward,
        note: String(note || ''),
      };

      const updated = await JobsDAO.appendStageTransition(req.params.id, req.user.uid, entry);
      if (!updated) return res.status(404).json({ error: 'Job not found' });

      return res.status(200).json({ message: 'Job archived', job: updated });
    } catch (error) {
      console.error('apiArchiveJob error:', error);
      return res.status(500).json({ error: 'Failed to archive job' });
    }
  }

  static async apiRestoreJob(req, res) {
    try {
      const job = await JobsDAO.findByIdForOwner(req.params.id, req.user.uid);
      if (!job) return res.status(404).json({ error: 'Job not found' });

      if (job.stage !== 'Archived') {
        return res.status(400).json({ error: 'Job is not archived' });
      }

      const history = job.stageHistory ?? [];
      const lastArchiveEntry = [...history].reverse().find((e) => e.toStage === 'Archived');
      const targetStage = lastArchiveEntry?.fromStage ?? 'Interested';

      const entry = {
        id: randomUUID(),
        fromStage: 'Archived',
        toStage: targetStage,
        changedAt: new Date().toISOString(),
        changedBy: req.user.uid,
        isOverride: true,
        note: '',
      };

      const updated = await JobsDAO.appendStageTransition(req.params.id, req.user.uid, entry);
      if (!updated) return res.status(404).json({ error: 'Job not found' });

      return res.status(200).json({ message: 'Job restored', job: updated, restoredTo: targetStage });
    } catch (error) {
      console.error('apiRestoreJob error:', error);
      return res.status(500).json({ error: 'Failed to restore job' });
    }
  }

  static async apiAddFollowUp(req, res) {
    try {
      const { title, dueAt } = req.body;

      if (!title?.trim() || !dueAt) {
        return res.status(400).json({ error: 'Title and due date/time are required' });
      }

      const parsedDue = new Date(dueAt);
      if (isNaN(parsedDue.getTime())) {
        return res.status(400).json({ error: 'Invalid dueAt date' });
      }

      const entry = {
        id: randomUUID(),
        title: title.trim(),
        dueAt: parsedDue.toISOString(),
        completedAt: null,
        createdAt: new Date().toISOString(),
      };

      const updated = await JobsDAO.addFollowUp(req.params.id, req.user.uid, entry);
      if (!updated) return res.status(404).json({ error: 'Job not found' });

      return res.status(201).json({ message: 'Follow-up added', job: updated });
    } catch (error) {
      console.error('apiAddFollowUp error:', error);
      return res.status(500).json({ error: 'Failed to add follow-up' });
    }
  }

  static async apiUpdateFollowUp(req, res) {
    try {
      const { title, dueAt, completedAt } = req.body;
      const { id, followUpId } = req.params;

      if (!title?.trim() || !dueAt) {
        return res.status(400).json({ error: 'Title and due date/time are required' });
      }

      const parsedDue = new Date(dueAt);
      if (isNaN(parsedDue.getTime())) {
        return res.status(400).json({ error: 'Invalid dueAt date' });
      }

      let parsedCompletedAt = null;
      if (completedAt) {
        parsedCompletedAt = new Date(completedAt);
        if (isNaN(parsedCompletedAt.getTime())) {
          return res.status(400).json({ error: 'Invalid completedAt date' });
        }
        parsedCompletedAt = parsedCompletedAt.toISOString();
      }

      const fields = {
        title: title.trim(),
        dueAt: parsedDue.toISOString(),
        completedAt: parsedCompletedAt,
      };

      const updated = await JobsDAO.updateFollowUp(id, req.user.uid, followUpId, fields);
      if (!updated) return res.status(404).json({ error: 'Job or follow-up not found' });

      return res.status(200).json({ message: 'Follow-up updated', job: updated });
    } catch (error) {
      console.error('apiUpdateFollowUp error:', error);
      return res.status(500).json({ error: 'Failed to update follow-up' });
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

  static async apiDraftJob(req, res) {
    try {
      const { type } = req.body;

      if (type !== 'resume' && type !== 'coverLetter') {
        return res.status(400).json({ error: 'Unsupported draft type' });
      }

      const job = await JobsDAO.findByIdForOwner(req.params.id, req.user.uid);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const profile = await UsersDAO.getProfile(req.user.uid);
      const draftText = await AiDraftService.generateAiDraft({
        profile: profile || {},
        job,
        type,
      });

      return res.status(200).json({ draft: draftText });
    } catch (error) {
      console.error('apiDraftJob error:', error);
      return res.status(502).json({ error: 'Failed to generate draft' });
    }
  }
}

export { VALID_STAGES };


