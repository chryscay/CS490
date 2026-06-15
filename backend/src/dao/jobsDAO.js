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
  


}

