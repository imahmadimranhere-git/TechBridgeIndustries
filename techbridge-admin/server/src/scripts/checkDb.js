import mongoose from 'mongoose';
import { connectDB, disconnectDB, supportsTransactions } from '../config/db.js';
import logger from '../config/logger.js';

async function main() {
  await connectDB();
  const connection = mongoose.connection;
  logger.info(`Database name: ${connection.name}`);

  if (!(await supportsTransactions())) {
    logger.error('❌ Connected, but this MongoDB is not a replica set. Transactions will not work.');
    process.exitCode = 1;
    return;
  }

  // Run a tiny real transaction to prove everything works end to end
  const collection = connection.db.collection('_healthchecks');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await collection.insertOne({ checkedAt: new Date() }, { session });
    });
  } finally {
    await session.endSession();
  }
  await collection.drop().catch(() => {});

  logger.info('✅ Connection OK, replica set OK, transactions OK. Database setup is complete.');
}

main()
  .catch((err) => {
    logger.error(`❌ Database check failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB().catch(() => {});
    process.exit(process.exitCode ?? 0);
  });