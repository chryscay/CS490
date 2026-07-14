import dotenv from 'dotenv';
dotenv.config({ override: true });

// Static `import` statements are hoisted and evaluated before any of this
// file's own top-level code — including the dotenv.config() call above —
// regardless of source order. app.js's module graph (firebase-admin.js in
// particular) reads process.env.FIREBASE_* at module-evaluation time, so it
// must be imported dynamically, after .env has actually been loaded.
const { default: app } = await import('./app.js');
import mongodb from 'mongodb';
import UsersDAO from './dao/usersDAO.js';
import JobsDAO from './dao/jobsDAO.js';
import DocumentsDAO from './dao/documentsDAO.js';

async function main() {
  const client = new mongodb.MongoClient(process.env.MONGO_URI);
  const port = process.env.PORT || 3001;

  try {
    await client.connect();
    await UsersDAO.injectDB(client);
    await JobsDAO.injectDB(client);
    await DocumentsDAO.injectDB(client);

    app.listen(port, () => {
      console.log(`Listening on port ${port}`);
      console.log(`Health check: http://localhost:${port}/api/health`);
    });
  } catch (e) {
    console.error(e);
  }
}

main().catch(console.error);