import app from './app.js';
import mongodb from 'mongodb';
import dotenv from 'dotenv';
import UsersDAO from './dao/usersDAO.js';
import JobsDAO from './dao/jobsDAO.js';

async function main() {
  dotenv.config();

  const client = new mongodb.MongoClient(process.env.MONGO_URI);
  const port = process.env.PORT || 3001;

  try {
    await client.connect();
    await UsersDAO.injectDB(client);
    await JobsDAO.injectDB(client);

    await app.listen(port, () => {
      console.log(`Listening on port ${port}`);
      console.log(`Health check: http://localhost:${port}/api/health`);
    });
  } catch (e) {
    console.error(e);
  }
}

main().catch(console.error);

