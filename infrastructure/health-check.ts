#!/usr/bin/env node

import fetch from 'node-fetch';
import pg from 'pg';

const { Pool } = pg;

const API_URL = process.env.API_URL || 'http://localhost:3001';
const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/trend_hijacker';

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
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('API failed to start');
}

async function waitForDatabase() {
  console.log('⏳ Waiting for database to be ready...');
  const pool = new Pool({ connectionString: DB_URL });
  
  for (let i = 0; i < 30; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database is ready');
      await pool.end();
      return true;
    } catch (error) {
      // Database not ready yet
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  
  await pool.end();
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
