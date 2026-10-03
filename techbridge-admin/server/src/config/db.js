import mongoose from 'mongoose';
import env from './env.js';
import logger from './logger.js';
import dns from 'node:dns';

mongoose.set('strictQuery', true);

let listenersAttached = false;

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

  const connection = mongoose.connection;
  connection.on('connected', () =>
    logger.info(`MongoDB connected: ${connection.host}/${connection.name}`)
  );
  connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  connection.on('error', (err) => logger.error(`MongoDB error: ${err.message}`));
}

// Translate common connection errors into beginner-friendly hints
function connectionHint(message = '') {
  if (message.includes('querySrv')) {
    return 'DNS lookup for the Atlas address failed. Check your internet, or set your Windows DNS to 8.8.8.8 / 1.1.1.1 and try again.';
  }
  if (message.includes('ECONNREFUSED')) {
    return 'Nothing is listening at that address. Is the local MongoDB service running? Use 127.0.0.1 instead of localhost.';
  }
  if (message.toLowerCase().includes('authentication failed') || message.includes('bad auth')) {
    return 'Wrong database username or password in MONGODB_URI.';
  }
  if (message.includes('whitelist') || message.includes('Server selection timed out')) {
    return 'Could not reach the server. On Atlas, add your IP (or 0.0.0.0/0) under Network Access.';
  }
  return 'Double-check MONGODB_URI in server/.env.';
}

export async function supportsTransactions() {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  // Replica set members report a setName; mongos routers report "isdbgrid"
  return Boolean(hello.setName) || hello.msg === 'isdbgrid';
}

export async function connectDB() {
  attachConnectionListeners();

  // Some ISPs/routers refuse the SRV lookups that mongodb+srv:// needs; use public DNS instead
  if (env.DNS_SERVERS) {
    const servers = env.DNS_SERVERS.split(',').map((server) => server.trim()).filter(Boolean);
    dns.setServers(servers);
    logger.info(`Using DNS servers: ${servers.join(', ')}`);
  }

  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    logger.error(`Could not connect to MongoDB: ${err.message}`);
    logger.error(`Hint: ${connectionHint(err.message)}`);
    throw err;
  }

  try {
    if (!(await supportsTransactions())) {
      logger.warn(
        'MongoDB is NOT running as a replica set. Saving payments (transactions) will fail. ' +
          'Use MongoDB Atlas or start a local single-node replica set.'
      );
    }
  } catch (err) {
    logger.warn(`Could not check replica set status: ${err.message}`);
  }

  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.connection.close();
}