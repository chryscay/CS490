// Demo seed script — run ONCE before the Sprint 2 demo.
// Usage: FIREBASE_UID=<uid> node seed.js
// Get the uid from the Firebase console or by logging in and checking the network tab.
//
// Clears existing jobs + profile for that UID, then inserts fresh demo data.

import mongodb from 'mongodb';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI;
const FIREBASE_UID = process.env.FIREBASE_UID;

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

const profile = {
  firebaseUid: FIREBASE_UID,
  // Identity (Sprint 1 baseline — C04)
  firstName: 'Alex',
  lastName: 'Rivera',
  email: 'alex.rivera@example.com',
  phone: '4155550182',
  location: 'San Francisco, CA',
  linkedIn: 'https://linkedin.com/in/alex-rivera',
  website: 'https://alexrivera.dev',
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
      startDate: '2022-06',
      endDate: '2025-01',
      description:
        'Built and maintained the core API used by 50k+ customers. Led migration from REST to GraphQL. ' +
        'Reduced p99 latency by 40% through query optimization and caching.',
    },
    {
      id: randomUUID(),
      company: 'StartupXYZ',
      title: 'Junior Developer',
      startDate: '2021-05',
      endDate: '2022-05',
      description:
        'Full-stack feature development on a React + Node.js SaaS platform. ' +
        'Owned the user onboarding flow end-to-end.',
    },
  ],
  // Education
  education: [
    {
      id: randomUUID(),
      institution: 'University of California, Berkeley',
      degree: 'B.S. Computer Science',
      startDate: '2017-08',
      endDate: '2021-05',
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
    targetLocations: [
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

    // Clear existing data for this user
    const deletedJobs = await db.collection('jobs').deleteMany({ firebaseUid: FIREBASE_UID });
    console.log(`Cleared ${deletedJobs.deletedCount} existing jobs.`);

    // Insert jobs
    const result = await db.collection('jobs').insertMany(jobs);
    console.log(`Inserted ${result.insertedCount} demo jobs.`);

    // Upsert profile
    await db.collection('users').updateOne(
      { firebaseUid: FIREBASE_UID },
      { $set: profile },
      { upsert: true }
    );
    console.log('Profile upserted.');

    console.log('\nSeed complete. Jobs inserted:');
    jobs.forEach((j) => console.log(`  [${j.stage.padEnd(10)}] ${j.company} — ${j.title}`));
  } finally {
    await client.close();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
