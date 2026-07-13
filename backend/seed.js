// Demo seed script — run ONCE before the Sprint 2 demo.
//
// Pre-requisites (each team member must do these):
//   1. backend/.env must contain MONGO_URI (and any other backend vars)
//   2. frontend/.env.local must contain: VITE_API_URL=http://localhost:3001/
//      (missing this causes empty dashboard + "could not save/load profile" errors)
//   3. Get YOUR Firebase UID: log in to the app, open DevTools Network tab,
//      click any /api/ request, and copy the uid from the decoded Authorization token.
//      Or find it in the Firebase console under Authentication.
//
// Usage (run from the backend/ directory):
//   FIREBASE_UID=<your-uid> node seed.js
//
// Clears existing jobs + profile for that UID, then inserts fresh demo data.

import mongodb from 'mongodb';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const FIREBASE_UID = process.env.FIREBASE_UID;
const FIREBASE_UID_2 = process.env.FIREBASE_UID_2; // optional — enables ownership-demo data (C04)

if (!MONGO_URI) {
  console.error('MONGO_URI not set. Make sure .env is at the project root.');
  process.exit(1);
}
if (!FIREBASE_UID) {
  console.error('Usage: FIREBASE_UID=<uid> node seed.js');
  process.exit(1);
}

const NOW = new Date();
const daysAgo = (n) => new Date(NOW - n * 86400_000).toISOString();

const jobs = [
  {
    firebaseUid: FIREBASE_UID,
    company: 'Stripe',
    title: 'Software Engineer, Payments',
    stage: 'Interested',
    jobPostingBody:
      'Join Stripe and help build the economic infrastructure of the internet. ' +
      'We are looking for engineers with strong backend experience in distributed systems.',
    location: 'San Francisco, CA',
    deadline: null,
    recruiterName: null,
    contactNotes: null,
    stageHistory: [],
    interviews: [],
    followUps: [],
    createdAt: daysAgo(14),
    lastActivityAt: daysAgo(14),
  },
  {
    firebaseUid: FIREBASE_UID,
    company: 'Vercel',
    title: 'Frontend Engineer',
    stage: 'Applied',
    jobPostingBody:
      'Vercel is the platform for frontend developers. We are seeking engineers ' +
      'who love building fast, beautiful web experiences with React and Next.js.',
    location: 'Remote',
    deadline: daysAgo(-10), // 10 days from now
    recruiterName: 'Taylor Kim',
    contactNotes: 'Applied via LinkedIn. Recruiter responded same day.',
    stageHistory: [
      {
        id: randomUUID(),
        fromStage: 'Interested',
        toStage: 'Applied',
        changedAt: daysAgo(9),
        changedBy: FIREBASE_UID,
        isOverride: false,
        note: '',
      },
    ],
    interviews: [],
    followUps: [
      {
        id: randomUUID(),
        title: 'Follow up if no response by Friday',
        dueAt: daysAgo(-5),
        completedAt: null,
        createdAt: daysAgo(8),
      },
    ],
    createdAt: daysAgo(11),
    lastActivityAt: daysAgo(9),
  },
  {
    firebaseUid: FIREBASE_UID,
    company: 'Linear',
    title: 'Full Stack Engineer',
    stage: 'Interview',
    jobPostingBody:
      'Linear is building the next generation of project management software. ' +
      'We value craftsmanship and speed. TypeScript, React, Node.js stack.',
    location: 'Remote',
    deadline: null,
    recruiterName: 'Jordan Lee',
    contactNotes: 'Very responsive team. Two-stage process.',
    stageHistory: [
      {
        id: randomUUID(),
        fromStage: 'Interested',
        toStage: 'Applied',
        changedAt: daysAgo(20),
        changedBy: FIREBASE_UID,
        isOverride: false,
        note: '',
      },
      {
        id: randomUUID(),
        fromStage: 'Applied',
        toStage: 'Interview',
        changedAt: daysAgo(12),
        changedBy: FIREBASE_UID,
        isOverride: false,
        note: '',
      },
    ],
    interviews: [
      {
        id: randomUUID(),
        roundType: 'Phone Screen',
        scheduledAt: daysAgo(10),
        notes: 'Intro call with Jordan. Went well — discussed React architecture and past projects.',
        createdAt: daysAgo(13),
      },
      {
        id: randomUUID(),
        roundType: 'Technical Screen',
        scheduledAt: daysAgo(-3), // 3 days from now
        notes: 'Live coding session. Will cover data structures and system design.',
        createdAt: daysAgo(9),
      },
    ],
    followUps: [
      {
        id: randomUUID(),
        title: 'Send thank you note to Jordan',
        dueAt: daysAgo(9),
        completedAt: daysAgo(9),
        createdAt: daysAgo(10),
      },
    ],
    createdAt: daysAgo(22),
    lastActivityAt: daysAgo(12),
  },
  {
    firebaseUid: FIREBASE_UID,
    company: 'Anthropic',
    title: 'Software Engineer, Product',
    stage: 'Offer',
    jobPostingBody:
      'Anthropic is an AI safety company building reliable, interpretable, and steerable AI systems. ' +
      'We are looking for engineers to build the products that make Claude accessible to everyone.',
    location: 'San Francisco, CA',
    deadline: null,
    recruiterName: 'Casey Chen',
    contactNotes: 'Verbal offer extended. Written offer expected this week.',
    stageHistory: [
      {
        id: randomUUID(),
        fromStage: 'Interested',
        toStage: 'Applied',
        changedAt: daysAgo(30),
        changedBy: FIREBASE_UID,
        isOverride: false,
        note: '',
      },
      {
        id: randomUUID(),
        fromStage: 'Applied',
        toStage: 'Interview',
        changedAt: daysAgo(22),
        changedBy: FIREBASE_UID,
        isOverride: false,
        note: '',
      },
      {
        id: randomUUID(),
        fromStage: 'Interview',
        toStage: 'Offer',
        changedAt: daysAgo(3),
        changedBy: FIREBASE_UID,
        isOverride: false,
        note: 'Verbal offer: $185k base + equity. Waiting on written.',
      },
    ],
    interviews: [
      {
        id: randomUUID(),
        roundType: 'HR Screen',
        scheduledAt: daysAgo(20),
        notes: 'Standard intro. Covered background, motivations, remote work setup.',
        createdAt: daysAgo(22),
      },
      {
        id: randomUUID(),
        roundType: 'Technical Screen',
        scheduledAt: daysAgo(15),
        notes: 'Strong performance. Systems design question about rate limiting.',
        createdAt: daysAgo(18),
      },
      {
        id: randomUUID(),
        roundType: 'On-site',
        scheduledAt: daysAgo(8),
        notes: 'Full day virtual on-site. 4 rounds: coding, system design, behavioral, product sense.',
        createdAt: daysAgo(12),
      },
    ],
    followUps: [
      {
        id: randomUUID(),
        title: 'Review and sign written offer',
        dueAt: daysAgo(-7),
        completedAt: null,
        createdAt: daysAgo(3),
      },
    ],
    createdAt: daysAgo(32),
    lastActivityAt: daysAgo(3),
  },
  {
    firebaseUid: FIREBASE_UID,
    company: 'Palantir',
    title: 'Forward Deployed Engineer',
    stage: 'Rejected',
    jobPostingBody:
      'Palantir FDEs work directly with customers to deploy and extend Palantir platforms. ' +
      'Strong problem solving and customer-facing skills required.',
    location: 'New York, NY',
    deadline: null,
    recruiterName: null,
    contactNotes: null,
    stageHistory: [
      {
        id: randomUUID(),
        fromStage: 'Interested',
        toStage: 'Applied',
        changedAt: daysAgo(25),
        changedBy: FIREBASE_UID,
        isOverride: false,
        note: '',
      },
      {
        id: randomUUID(),
        fromStage: 'Applied',
        toStage: 'Rejected',
        changedAt: daysAgo(18),
        changedBy: FIREBASE_UID,
        isOverride: false,
        note: 'Automated rejection. No feedback provided.',
      },
    ],
    interviews: [],
    followUps: [],
    createdAt: daysAgo(27),
    lastActivityAt: daysAgo(18),
  },
  {
    firebaseUid: FIREBASE_UID,
    company: 'Figma',
    title: 'Software Engineer, Editor',
    stage: 'Archived',
    jobPostingBody:
      'Figma is building the future of design tooling. We are looking for engineers ' +
      'to work on the core editor experience.',
    location: 'San Francisco, CA',
    deadline: daysAgo(5), // expired
    recruiterName: null,
    contactNotes: 'Deadline passed. No longer interested.',
    stageHistory: [
      {
        id: randomUUID(),
        fromStage: 'Interested',
        toStage: 'Archived',
        changedAt: daysAgo(5),
        changedBy: FIREBASE_UID,
        isOverride: true,
        note: 'Deadline passed, not pursuing.',
      },
    ],
    interviews: [],
    followUps: [],
    createdAt: daysAgo(20),
    lastActivityAt: daysAgo(5),
  },
];

// --- Sprint 3 demo data: documents, links, research/prep notes, second user ---

// Give each job a stable _id so documents can reference them and jobs can link back.
jobs.forEach((job) => { job._id = new mongodb.ObjectId(); });
const [stripeJob, vercelJob, linearJob, anthropicJob, , figmaJob] = jobs;

const dVer = (n, text, jobId, type) => ({
  version: n,
  label: `Version ${n}`,
  text,
  createdAt: NOW,
  firebaseUid: FIREBASE_UID,
  jobId,
  type,
});

const documents = [
  { // Linear resume — active, tagged, TWO versions (version history → C08)
    _id: new mongodb.ObjectId(), firebaseUid: FIREBASE_UID, jobId: linearJob._id,
    type: 'resume', title: 'Full Stack Resume — Linear', status: 'active',
    tags: ['software', 'fullstack'], currentVersion: 2,
    versions: [
      dVer(1, 'Alex Rivera — Full Stack Engineer (v1 draft)…', linearJob._id, 'resume'),
      dVer(2, 'Alex Rivera — Full Stack Engineer (v2 tailored for Linear)…', linearJob._id, 'resume'),
    ],
    createdAt: NOW, updatedAt: NOW,
  },
  { // Linear cover letter — active
    _id: new mongodb.ObjectId(), firebaseUid: FIREBASE_UID, jobId: linearJob._id,
    type: 'coverLetter', title: 'Cover Letter — Linear', status: 'active',
    tags: ['fullstack'], currentVersion: 1,
    versions: [dVer(1, 'Dear Linear team, I admire your craft-focused culture…', linearJob._id, 'coverLetter')],
    createdAt: NOW, updatedAt: NOW,
  },
  { // Anthropic resume — active
    _id: new mongodb.ObjectId(), firebaseUid: FIREBASE_UID, jobId: anthropicJob._id,
    type: 'resume', title: 'Product Resume — Anthropic', status: 'active',
    tags: ['ai', 'product'], currentVersion: 1,
    versions: [dVer(1, 'Alex Rivera — Software Engineer, Product…', anthropicJob._id, 'resume')],
    createdAt: NOW, updatedAt: NOW,
  },
  { // Figma resume — ARCHIVED (archive/restore demo → C09/C10)
    _id: new mongodb.ObjectId(), firebaseUid: FIREBASE_UID, jobId: figmaJob._id,
    type: 'resume', title: 'Editor Resume — Figma', status: 'archived',
    tags: ['design'], currentVersion: 1,
    versions: [dVer(1, 'Alex Rivera — Editor…', figmaJob._id, 'resume')],
    createdAt: NOW, updatedAt: NOW,
  },
  { // Stripe cover letter — active, different tags (filter/sort variety → C05/C06)
    _id: new mongodb.ObjectId(), firebaseUid: FIREBASE_UID, jobId: stripeJob._id,
    type: 'coverLetter', title: 'Cover Letter — Stripe', status: 'active',
    tags: ['backend', 'payments'], currentVersion: 1,
    versions: [dVer(1, 'Dear Stripe hiring team…', stripeJob._id, 'coverLetter')],
    createdAt: NOW, updatedAt: NOW,
  },
];

// Link two jobs to library documents (C11, C12). Stored as the document _id.
linearJob.linkedDocuments = { resume: documents[0]._id, coverLetter: documents[1]._id };
anthropicJob.linkedDocuments = { resume: documents[2]._id };

// Company research + interview prep notes (C13/C14, C15).
anthropicJob.researchNotes =
  'Anthropic — AI safety company building reliable, interpretable systems. ' +
  'Recent: Claude model family. Interviewer likely values safety mindset and clear reasoning.';
anthropicJob.interviewPrepNotes =
  'Prep checklist: review RLHF + Constitutional AI at a high level; prepare 2 STAR stories on ' +
  'ambiguous problems; questions to ask: team structure, on-call, how safety trades against velocity.';

// Optional second user for live ownership checks (C04). Set FIREBASE_UID_2 to enable.
const secondUserJobs = FIREBASE_UID_2 ? [{
  _id: new mongodb.ObjectId(), firebaseUid: FIREBASE_UID_2,
  company: 'Datadog', title: 'Backend Engineer', stage: 'Applied',
  jobPostingBody: 'Datadog observability platform…', location: 'Remote',
  deadline: null, recruiterName: null, contactNotes: null,
  stageHistory: [{ id: randomUUID(), fromStage: 'Interested', toStage: 'Applied', changedAt: daysAgo(5), changedBy: FIREBASE_UID_2, isOverride: false, note: '' }],
  interviews: [], followUps: [], createdAt: daysAgo(7), lastActivityAt: daysAgo(5),
}] : [];

const secondUserDocs = FIREBASE_UID_2 ? [{
  _id: new mongodb.ObjectId(), firebaseUid: FIREBASE_UID_2, jobId: secondUserJobs[0]._id,
  type: 'resume', title: 'Resume — User B', status: 'active', tags: ['backend'], currentVersion: 1,
  versions: [{ version: 1, label: 'Version 1', text: 'User B resume…', createdAt: NOW, firebaseUid: FIREBASE_UID_2, jobId: secondUserJobs[0]._id, type: 'resume' }],
  createdAt: NOW, updatedAt: NOW,
}] : [];

const profile = {
  firebaseUid: FIREBASE_UID,
  // Identity (Sprint 1 baseline — C04)
  firstName: 'Alex',
  lastName: 'Rivera',
  email: 'alex.rivera@example.com',
  phone: '4155550182',
  city: 'San Francisco',
  state: 'CA',
  // Summary
  summary:
    'Full-stack software engineer with 3 years of experience building scalable web ' +
    'applications. Passionate about developer tooling, performance, and clean architecture. ' +
    'Seeking a role where I can grow into technical leadership.',
  // Experience
  experience: [
    {
      id: randomUUID(),
      company: 'Acme Corp',
      title: 'Software Engineer',
      startDate: '2022-06-01',
      endDate: '2025-01-01',
      description:
        'Built and maintained the core API used by 50k+ customers. Led migration from REST to GraphQL. ' +
        'Reduced p99 latency by 40% through query optimization and caching.',
    },
    {
      id: randomUUID(),
      company: 'StartupXYZ',
      title: 'Junior Developer',
      startDate: '2021-05-01',
      endDate: '2022-05-01',
      description:
        'Full-stack feature development on a React + Node.js SaaS platform. ' +
        'Owned the user onboarding flow end-to-end.',
    },
  ],
  // Education
  education: [
    {
      id: randomUUID(),
      schoolName: 'University of California, Berkeley',
      degree: 'B.S. Computer Science',
      fieldOfStudy: 'Computer Science',
      startDate: '2017-08-01',
      endDate: '2021-05-01',
      description: 'GPA 3.7. Coursework in algorithms, systems, and machine learning.',
    },
  ],
  // Skills
  skills: [
    { id: randomUUID(), name: 'JavaScript' },
    { id: randomUUID(), name: 'TypeScript' },
    { id: randomUUID(), name: 'React' },
    { id: randomUUID(), name: 'Node.js' },
    { id: randomUUID(), name: 'Python' },
    { id: randomUUID(), name: 'MongoDB' },
    { id: randomUUID(), name: 'PostgreSQL' },
    { id: randomUUID(), name: 'Docker' },
  ],
  // Career Preferences
  careerPreferences: {
    targetRoles: [
      { id: randomUUID(), name: 'Software Engineer' },
      { id: randomUUID(), name: 'Full Stack Engineer' },
    ],
    locations: [
      { id: randomUUID(), name: 'San Francisco, CA' },
      { id: randomUUID(), name: 'Remote' },
    ],
    workMode: 'Hybrid',
    salaryPreference: '$160,000 – $200,000',
  },
  profileUpdatedAt: new Date(),
};

async function seed() {
  const client = new mongodb.MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db('ats');

    // Clear + reseed primary user (idempotent).
    const delJobs = await db.collection('jobs').deleteMany({ firebaseUid: FIREBASE_UID });
    const delDocs = await db.collection('documents').deleteMany({ firebaseUid: FIREBASE_UID });
    console.log(`Cleared ${delJobs.deletedCount} jobs, ${delDocs.deletedCount} documents (primary).`);

    const jobsRes = await db.collection('jobs').insertMany(jobs);
    console.log(`Inserted ${jobsRes.insertedCount} jobs.`);
    const docsRes = await db.collection('documents').insertMany(documents);
    console.log(`Inserted ${docsRes.insertedCount} documents.`);

    await db.collection('users').updateOne(
      { firebaseUid: FIREBASE_UID }, { $set: profile }, { upsert: true }
    );
    console.log('Primary profile upserted.');

    if (FIREBASE_UID_2) {
      await db.collection('jobs').deleteMany({ firebaseUid: FIREBASE_UID_2 });
      await db.collection('documents').deleteMany({ firebaseUid: FIREBASE_UID_2 });
      if (secondUserJobs.length) await db.collection('jobs').insertMany(secondUserJobs);
      if (secondUserDocs.length) await db.collection('documents').insertMany(secondUserDocs);
      await db.collection('users').updateOne(
        { firebaseUid: FIREBASE_UID_2 },
        { $set: { firebaseUid: FIREBASE_UID_2, firstName: 'Sam', lastName: 'Chen', email: 'sam.chen@example.com', profileUpdatedAt: NOW } },
        { upsert: true }
      );
      console.log(`Second user seeded (${secondUserJobs.length} jobs, ${secondUserDocs.length} docs).`);
    } else {
      console.log('FIREBASE_UID_2 not set — skipping second user (set it to enable ownership demo data).');
    }

    console.log('\nSeed complete.');
    jobs.forEach((j) => console.log(`  [${j.stage.padEnd(10)}] ${j.company} — ${j.title}`));
  } finally {
    await client.close();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
