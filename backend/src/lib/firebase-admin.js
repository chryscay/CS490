import { initializeApp, cert } from "firebase-admin/app";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";

function loadServiceAccount() {
  // Cloud path: full JSON in an env var (Render).
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  // Local dev path: gitignored key file next to backend/.
  const keyPath = fileURLToPath(new URL("../../serviceAccountKey.json", import.meta.url));
  if (existsSync(keyPath)) {
    return JSON.parse(readFileSync(keyPath));
  }
  // No credentials (e.g. CI, where firebase-admin is mocked). Return null
  // so module load doesn't crash; init is skipped below.
  return null;
}

const serviceAccount = loadServiceAccount();

const firebaseAdmin = serviceAccount
  ? initializeApp({ credential: cert(serviceAccount) })
  : initializeApp();

export default firebaseAdmin;