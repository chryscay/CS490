import dotenv from 'dotenv';
dotenv.config({ override: true });

import app from './app.js';
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