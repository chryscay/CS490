import { ObjectId } from 'mongodb';

let jobs;

export default class JobsDAO {
  static async injectDB(conn) {
    if (jobs) {
      return;
    }
    try {
      jobs = await conn.db('ats').collection('jobs');
    } catch (e) {
      console.error(`Unable to connect in jobsDAO: ${e}`);
    }
  }

  static async addJob(job) {
    const result = await jobs.insertOne({
      firebaseUid: job.firebaseUid,
      company: job.company,
      title: job.title,
      jobPostingBody: job.jobPostingBody,
      stage: job.stage,
      deadline: job.deadline,
      recruiterName: job.recruiterName,
      contactNotes: job.contactNotes,
      lastActivityAt: new Date(),
      createdAt: new Date(),
    });

    return result;
  }

  static async findByOwner(uid) {
    const result = await jobs
      .find({ firebaseUid: uid })
      .sort({ createdAt: -1 })
      .toArray();

    return result;
  }

  static async findByIdForOwner(id, uid) {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const result = await jobs.findOne({
      _id: new ObjectId(id),
      firebaseUid: uid,
    });

    return result;
  }

  static async updateJob(id, uid, fields) {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const result = await jobs.findOneAndUpdate(
      { _id: new ObjectId(id), firebaseUid: uid },
      {
        $set: {
          ...fields,
          lastActivityAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    return result;
  }

  static async deleteJob(id, uid) {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const result = await jobs.findOneAndDelete({
      _id: new ObjectId(id),
      firebaseUid: uid,
    });

    return result;
  }

  static async addInterview(id, uid, entry) {
    if (!ObjectId.isValid(id)) return null;
    return await jobs.findOneAndUpdate(
      { _id: new ObjectId(id), firebaseUid: uid },
      {
        $push: { interviews: entry },
        $set: { lastActivityAt: new Date() },
      },
      { returnDocument: 'after' }
    );
  }

  static async updateInterview(id, uid, interviewId, fields) {
    if (!ObjectId.isValid(id)) return null;
    return await jobs.findOneAndUpdate(
      { _id: new ObjectId(id), firebaseUid: uid, 'interviews.id': interviewId },
      {
        $set: {
          'interviews.$.roundType': fields.roundType,
          'interviews.$.scheduledAt': fields.scheduledAt,
          'interviews.$.notes': fields.notes,
          lastActivityAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
  }

  static async addFollowUp(id, uid, entry) {
    if (!ObjectId.isValid(id)) return null;
    return await jobs.findOneAndUpdate(
      { _id: new ObjectId(id), firebaseUid: uid },
      {
        $push: { followUps: entry },
        $set: { lastActivityAt: new Date() },
      },
      { returnDocument: 'after' }
    );
  }

  static async updateFollowUp(id, uid, followUpId, fields) {
    if (!ObjectId.isValid(id)) return null;
    return await jobs.findOneAndUpdate(
      { _id: new ObjectId(id), firebaseUid: uid, 'followUps.id': followUpId },
      {
        $set: {
          'followUps.$.title': fields.title,
          'followUps.$.dueAt': fields.dueAt,
          'followUps.$.completedAt': fields.completedAt ?? null,
          lastActivityAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
  }

  static async appendStageTransition(id, uid, entry) {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    return await jobs.findOneAndUpdate(
      {
        _id: new ObjectId(id),
        firebaseUid: uid,
      },
      {
        $set: {
          stage: entry.toStage,
          lastActivityAt: new Date(),
        },
        $push: {
          stageHistory: entry,
        },
      },
      {
        returnDocument: 'after',
      }
    );
  }

  // S3-009: link a library document to this job (S3-BR-010, S3-BR-012).
  static async setLinkedDocument(jobId, uid, type, documentId) {
    if (!ObjectId.isValid(jobId)) return null;
    const docOid = ObjectId.isValid(documentId)
      ? new ObjectId(documentId)
      : documentId;
    const result = await jobs.findOneAndUpdate(
      { _id: new ObjectId(jobId), firebaseUid: uid },
      {
        $set: {
          [`linkedDocuments.${type}`]: docOid,
          lastActivityAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );
    return result?.value ?? result ?? null;
  }

  // S3-009: remove a library document link from this job.
  static async clearLinkedDocument(jobId, uid, type) {
    if (!ObjectId.isValid(jobId)) return null;
    const result = await jobs.findOneAndUpdate(
      { _id: new ObjectId(jobId), firebaseUid: uid },
      {
        $set: { [`linkedDocuments.${type}`]: null, lastActivityAt: new Date() },
      },
      { returnDocument: 'after' }
    );
    return result?.value ?? result ?? null;
  }

  static async updateResearchNotes(id, uid, researchNotes) {
    try {
      if (!ObjectId.isValid(id)) {
        return null;
      }

      const result = await jobs.findOneAndUpdate(
        {
          _id: new ObjectId(id),
          firebaseUid: uid,
        },
        {
          $set: {
            researchNotes,
            researchUpdatedAt: new Date(),
            lastActivityAt: new Date(),
          },
        },
        {
          returnDocument: 'after',
        }
      );

      return result;
    } catch (e) {
      console.error(`Unable to update research notes: ${e}`);
    }
  }

  static async updateInterviewPrepNotes(id, uid, interviewPrepNotes) {
    try {
      if (!ObjectId.isValid(id)) {
        return null;
      }

      const result = await jobs.findOneAndUpdate(
        {
          _id: new ObjectId(id),
          firebaseUid: uid,
        },
        {
          $set: {
            interviewPrepNotes,
            interviewPrepUpdatedAt: new Date(),
            lastActivityAt: new Date(),
          },
        },
        {
          returnDocument: 'after',
        }
      );

      return result;
    } catch (e) {
      console.error(`Unable to update interview prep notes: ${e}`);
    }
  }

  static async getVelocity(uid) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await jobs
      .aggregate([
        {
          $match: {
            firebaseUid: uid,
          },
        },
        {
          $unwind: '$stageHistory',
        },
        {
          $match: {
            'stageHistory.fromStage': 'Interested',
            'stageHistory.toStage': 'Applied',
            'stageHistory.changedAt': {
              $gte: sevenDaysAgo.toISOString(),
            },
          },
        },
        {
          $count: 'velocity',
        },
      ])
      .toArray();

    return result[0]?.velocity || 0;
  }

  static async getStageConversion(uid) {
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;

    const userJobs = await jobs
      .find({
        firebaseUid: uid,
      })
      .toArray();

    let appliedCount = 0;
    let convertedCount = 0;

    userJobs.forEach((job) => {
      const history = job.stageHistory || [];

      const applied = history.find(
        (entry) =>
          entry.fromStage === 'Interested' && entry.toStage === 'Applied'
      );

      if (!applied) {
        return;
      }

      appliedCount++;

      const interview = history.find(
        (entry) =>
          entry.fromStage === 'Applied' && entry.toStage === 'Interview'
      );

      if (!interview) {
        return;
      }

      const difference =
        new Date(interview.changedAt) - new Date(applied.changedAt);

      if (difference <= fourteenDays) {
        convertedCount++;
      }
    });

    if (appliedCount === 0) {
      return 0;
    }

    return convertedCount / appliedCount;
  }

  static async getTimeInStage(uid) {
    const userJobs = await jobs
      .find({
        firebaseUid: uid,
      })
      .toArray();

    const totals = {};

    userJobs.forEach((job) => {
      const history = job.stageHistory || [];

      for (let i = 0; i < history.length - 1; i++) {
        const current = history[i];
        const next = history[i + 1];

        const days =
          (new Date(next.changedAt) - new Date(current.changedAt)) /
          (1000 * 60 * 60 * 24);

        if (!totals[current.toStage]) {
          totals[current.toStage] = [];
        }

        totals[current.toStage].push(days);
      }
    });

    const averages = {};

    Object.keys(totals).forEach((stage) => {
      const values = totals[stage];

      averages[stage] = values.reduce((a, b) => a + b, 0) / values.length;
    });

    return averages;
  }
}
