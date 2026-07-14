import JobsDAO from '../dao/jobsDAO.js';
import UsersDAO from '../dao/usersDAO.js';
import DocumentsDAO from '../dao/documentsDAO.js';
import { randomUUID } from 'crypto';
import {
  isValidStage,
  isForwardTransition,
  isOutcomeStage,
} from '../lib/stageTransitions.js';
import * as AiDraftService from '../services/aiDraft.service.js';
import * as AiResearchService from '../services/aiResearch.service.js';
import { buildExport, isValidExportFormat } from '../lib/documentExport.js';
import { ApiError } from '../middleware/error.middleware.js';
const VALID_STAGES = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

export default class JobsController {
  static async apiCreateJob(req, res, next) {
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
      return next(error);
    }
  }

  static async apiGetJobs(req, res, next) {
    try {
      const jobs = await JobsDAO.findByOwner(req.user.uid);
      return res.status(200).json({ jobs });
    } catch (error) {
      return next(error);
    }
  }

  static async apiGetJobById(req, res, next) {
    try {
      const job = await JobsDAO.findByIdForOwner(req.params.id, req.user.uid);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.status(200).json({ job });
    } catch (error) {
      return next(error);
    }
  }

  static async apiUpdateJob(req, res, next) {
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
      return next(error);
    }
  }

  static async apiTransitionStage(req, res, next) {
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
      return next(error);
    }
  }
  static async apiAddInterview(req, res, next) {
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

      const updated = await JobsDAO.addInterview(
        req.params.id,
        req.user.uid,
        entry
      );
      if (!updated) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.status(201).json({ message: 'Interview added', job: updated });
    } catch (error) {
      return next(error);
    }
  }

  static async apiUpdateInterview(req, res, next) {
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

      const updated = await JobsDAO.updateInterview(
        id,
        req.user.uid,
        interviewId,
        fields
      );
      if (!updated) {
        return res.status(404).json({ error: 'Job or interview not found' });
      }

      return res
        .status(200)
        .json({ message: 'Interview updated', job: updated });
    } catch (error) {
      return next(error);
    }
  }

  static async apiArchiveJob(req, res, next) {
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

      const updated = await JobsDAO.appendStageTransition(
        req.params.id,
        req.user.uid,
        entry
      );
      if (!updated) return res.status(404).json({ error: 'Job not found' });

      return res.status(200).json({ message: 'Job archived', job: updated });
    } catch (error) {
      return next(error);
    }
  }

  static async apiRestoreJob(req, res, next) {
    try {
      const job = await JobsDAO.findByIdForOwner(req.params.id, req.user.uid);
      if (!job) return res.status(404).json({ error: 'Job not found' });

      if (job.stage !== 'Archived') {
        return res.status(400).json({ error: 'Job is not archived' });
      }

      const history = job.stageHistory ?? [];
      const lastArchiveEntry = [...history]
        .reverse()
        .find((e) => e.toStage === 'Archived');
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

      const updated = await JobsDAO.appendStageTransition(
        req.params.id,
        req.user.uid,
        entry
      );
      if (!updated) return res.status(404).json({ error: 'Job not found' });

      return res.status(200).json({
        message: 'Job restored',
        job: updated,
        restoredTo: targetStage,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async apiAddFollowUp(req, res, next) {
    try {
      const { title, dueAt } = req.body;

      if (!title?.trim() || !dueAt) {
        return res
          .status(400)
          .json({ error: 'Title and due date/time are required' });
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

      const updated = await JobsDAO.addFollowUp(
        req.params.id,
        req.user.uid,
        entry
      );
      if (!updated) return res.status(404).json({ error: 'Job not found' });

      return res.status(201).json({ message: 'Follow-up added', job: updated });
    } catch (error) {
      return next(error);
    }
  }

  static async apiUpdateFollowUp(req, res, next) {
    try {
      const { title, dueAt, completedAt } = req.body;
      const { id, followUpId } = req.params;

      if (!title?.trim() || !dueAt) {
        return res
          .status(400)
          .json({ error: 'Title and due date/time are required' });
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

      const updated = await JobsDAO.updateFollowUp(
        id,
        req.user.uid,
        followUpId,
        fields
      );
      if (!updated)
        return res.status(404).json({ error: 'Job or follow-up not found' });

      return res
        .status(200)
        .json({ message: 'Follow-up updated', job: updated });
    } catch (error) {
      return next(error);
    }
  }

  static async apiDeleteJob(req, res, next) {
    try {
      const deleted = await JobsDAO.deleteJob(req.params.id, req.user.uid);

      if (!deleted) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res
        .status(200)
        .json({ message: 'Job deleted', id: req.params.id });
    } catch (error) {
      return next(error);
    }
  }

  static async apiDraftJob(req, res, next) {
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
      return next(new ApiError(502, 'Failed to generate draft', { cause: error }));
    }
  }

  // S3-011: generate AI-assisted company research using user-provided context.
  static async apiResearchCompany(req, res, next) {
    try {
      const { userContext } = req.body;

      const job = await JobsDAO.findByIdForOwner(req.params.id, req.user.uid);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const research = await AiResearchService.generateCompanyResearch({
        job,
        userContext,
      });

      return res.status(200).json({ research });
    } catch (error) {
      return next(new ApiError(502, 'Failed to generate company research', { cause: error }));
    }
  }

  static async apiRewriteDraft(req, res, next) {
    try {
      const { type, text, instruction } = req.body;

      if (type !== 'resume' && type !== 'coverLetter') {
        return res.status(400).json({ error: 'Unsupported draft type' });
      }

      if (!text?.trim()) {
        return res.status(400).json({ error: 'Draft text is required' });
      }

      const job = await JobsDAO.findByIdForOwner(req.params.id, req.user.uid);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const profile = await UsersDAO.getProfile(req.user.uid);
      const rewrittenText = await AiDraftService.rewriteAiDraft({
        profile: profile || {},
        job,
        type,
        text,
        instruction,
      });

      return res.status(200).json({ draft: rewrittenText });
    } catch (error) {
      return next(new ApiError(502, 'Failed to rewrite draft', { cause: error }));
    }
  }

  static async apiSaveDraftDocument(req, res, next) {
    try {
      const { type, title, text } = req.body;

      if (type !== 'resume' && type !== 'coverLetter') {
        return res.status(400).json({ error: 'Unsupported document type' });
      }

      if (!text?.trim()) {
        return res.status(400).json({ error: 'Draft text is required' });
      }

      const job = await JobsDAO.findByIdForOwner(req.params.id, req.user.uid);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const safeTitle = title?.trim()
        ? title.trim()
        : `${job.title} ${type === 'coverLetter' ? 'Cover Letter' : 'Resume'}`;

      const document = await DocumentsDAO.saveDocumentVersion({
        firebaseUid: req.user.uid,
        jobId: req.params.id,
        type,
        title: safeTitle,
        text: text.trim(),
      });

      if (!document) {
        return res.status(500).json({ error: 'Failed to save document' });
      }

      const safeDocument = {
        _id: document._id,
        type: document.type,
        title: document.title,
        currentVersion: document.currentVersion,
        updatedAt: document.updatedAt,
      };

      return res.status(201).json({ document: safeDocument });
    } catch (error) {
      return next(error);
    }
  }

  static async apiGetJobDocuments(req, res, next) {
    try {
      const job = await JobsDAO.findByIdForOwner(req.params.id, req.user.uid);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const documents = await DocumentsDAO.findByJobForOwner(
        req.user.uid,
        req.params.id
      );

      return res.status(200).json({ documents });
    } catch (error) {
      return next(error);
    }
  }

  static async apiUpdateResearchNotes(req, res, next) {
    try {
      const { researchNotes } = req.body;

      if (!researchNotes?.trim()) {
        return res.status(400).json({
          error: 'Research notes are required',
        });
      }

      const updated = await JobsDAO.updateResearchNotes(
        req.params.id,
        req.user.uid,
        researchNotes.trim()
      );

      if (!updated) {
        return res.status(404).json({
          error: 'Job not found',
        });
      }

      return res.status(200).json({
        message: 'Research notes updated',
        job: updated,
      });
    } catch (error) {
      return next(error);
    }
  }

  static async apiUpdateInterviewPrepNotes(req, res, next) {
    try {
      const { interviewPrepNotes } = req.body;

      if (!interviewPrepNotes?.trim()) {
        return res.status(400).json({
          error: 'Interview prep notes are required',
        });
      }

      const updated = await JobsDAO.updateInterviewPrepNotes(
        req.params.id,
        req.user.uid,
        interviewPrepNotes.trim()
      );

      if (!updated) {
        return res.status(404).json({
          error: 'Job not found',
        });
      }

      return res.status(200).json({
        message: 'Interview prep notes updated',
        job: updated,
      });
    } catch (error) {
      return next(error);
    }
  }

  // S3-009: link a library document to a job (S3-BR-010, S3-BR-011, S3-BR-012).
  static async apiLinkDocument(req, res, next) {
    try {
      const { type, documentId, confirmReplace = false } = req.body;

      if (type !== 'resume' && type !== 'coverLetter') {
        return res
          .status(400)
          .json({ error: 'type must be resume or coverLetter' });
      }
      if (!documentId) {
        return res.status(400).json({ error: 'documentId is required' });
      }

      // S3-BR-012: validate document ownership and type match before touching the job.
      const doc = await DocumentsDAO.findOneForOwner(req.user.uid, documentId);
      if (!doc) {
        return res.status(404).json({ error: 'Document not found' });
      }
      if (doc.type !== type) {
        return res
          .status(400)
          .json({ error: 'Document type does not match requested link type' });
      }

      const job = await JobsDAO.findByIdForOwner(req.params.id, req.user.uid);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // S3-BR-011: if a *different* document is already linked, require explicit confirmation.
      const currentLinkedId = job.linkedDocuments?.[type]
        ? String(job.linkedDocuments[type])
        : null;
      if (
        currentLinkedId &&
        currentLinkedId !== String(documentId) &&
        !confirmReplace
      ) {
        const currentDoc = await DocumentsDAO.findOneForOwner(
          req.user.uid,
          currentLinkedId
        );
        return res.status(409).json({
          error: 'A document is already linked',
          requiresConfirmation: true,
          currentDocumentTitle: currentDoc?.title ?? 'the existing document',
        });
      }

      const updated = await JobsDAO.setLinkedDocument(
        req.params.id,
        req.user.uid,
        type,
        documentId
      );
      if (!updated) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.status(200).json({ message: 'Document linked', job: updated });
    } catch (error) {
      return next(error);
    }
  }

  // S3-009: remove a linked document from a job.
  static async apiUnlinkDocument(req, res, next) {
    try {
      const { type } = req.params;

      if (type !== 'resume' && type !== 'coverLetter') {
        return res
          .status(400)
          .json({ error: 'type must be resume or coverLetter' });
      }

      const updated = await JobsDAO.clearLinkedDocument(
        req.params.id,
        req.user.uid,
        type
      );
      if (!updated) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res
        .status(200)
        .json({ message: 'Document unlinked', job: updated });
    } catch (error) {
      return next(error);
    }
  }

  // S3-005: export a specific document version as txt or pdf, owner-scoped.
  static async apiExportJobDocument(req, res, next) {
    try {
      const { id, documentId } = req.params;
      const { format = 'txt', version } = req.query;

      if (!isValidExportFormat(format)) {
        return res.status(400).json({ error: 'Unsupported export format' });
      }

      // Confirm the job is owned (consistent with the other document handlers).
      const job = await JobsDAO.findByIdForOwner(id, req.user.uid);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const doc = await DocumentsDAO.findVersionForOwner(
        req.user.uid,
        documentId,
        version
      );
      if (!doc) {
        return res.status(404).json({ error: 'Document version not found' });
      }

      const { buffer, contentType, filename } = await buildExport({
        format,
        title: doc.title,
        version: doc.version,
        text: doc.text,
      });

      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.setHeader('Content-Length', buffer.length);
      return res.status(200).send(buffer);
    } catch (error) {
      return next(error);
    }
  }

  static async apiGetAnalytics(req, res, next) {
    try {
      const velocity = await JobsDAO.getVelocity(req.user.uid);

      const stageConversion = await JobsDAO.getStageConversion(req.user.uid);

      const timeInStage = await JobsDAO.getTimeInStage(req.user.uid);

      return res.status(200).json({
        velocity,
        stageConversion,
        timeInStage,
      });
    } catch (error) {
      return next(error);
    }
  }
}

export { VALID_STAGES };
