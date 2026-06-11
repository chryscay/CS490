// TODO: Firebase Admin SDK placeholder.
// Initialize Firebase Admin here using a service account from environment variables.
// Firebase service account credentials must never be hardcoded (see engineering-coding-standards.md §6).

import { initializeApp, cert } from "firebase-admin/app";
import dotenv from "dotenv";

dotenv.config();

const firebaseAdmin = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

export default firebaseAdmin;
