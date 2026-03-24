#!/usr/bin/env node

import net from 'node:net';
import { URL } from 'node:url';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/trend_hijacker';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseDbHostPort(connectionString: string): { host: string; port: number } {
  const parsed = new URL(connectionString);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
  };
}

async function canConnectTcp(host: string, port: number): Promise<boolean> {
  return new Promise(resolve => {
    const socket = new net.Socket();
    const onDone = (ok: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(1000);
    socket.once('connect', () => onDone(true));
    socket.once('timeout', () => onDone(false));
    socket.once('error', () => onDone(false));
    socket.connect(port, host);
  });
}

async function waitForAPI() {
  console.log('⏳ Waiting for API to be ready...');
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`${API_URL}/health`);
      if (response.ok) {
        console.log('✅ API is ready');
        return true;
      }
    } catch (error) {
      // API not ready yet
    }
    await sleep(1000);
  }
  throw new Error('API failed to start');
}

async function waitForDatabase() {
  console.log('⏳ Waiting for database to be ready...');
  const { host, port } = parseDbHostPort(DB_URL);
  
  for (let i = 0; i < 30; i++) {
    const isReachable = await canConnectTcp(host, port);
    if (isReachable) {
      console.log('✅ Database is ready');
      return true;
    }
    await sleep(1000);
  }

  throw new Error('Database failed to start');
}

async function main() {
  try {
    console.log('🚀 Starting health checks...\n');
    
    await waitForDatabase();
    await waitForAPI();
    
    console.log('\n✅ All services are healthy!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Health check failed:', error);
    process.exit(1);
  }
}

main();
