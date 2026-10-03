import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let server;

// Starts a throwaway in-memory MongoDB; real data in Atlas is never touched
export async function startTestDb() {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri(), { dbName: 'techbridge-test' });
}

export async function clearTestDb() {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function stopTestDb() {
  await mongoose.disconnect();
  if (server) await server.stop();
}