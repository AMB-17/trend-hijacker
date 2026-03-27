#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'

const port = process.env.PORT || '3000'
const baseUrl = `http://localhost:${port}`
const healthUrl = `${baseUrl}/health`

const child = spawn('pnpm', ['dev'], {
  cwd: 'D:\\workspace\\apps\\web',
  env: {
    ...process.env,
    PORT: port,
    NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4096',
  },
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
})

let ready = false
const outputBuffer = []

function printAndStore(chunk) {
  const text = chunk.toString()
  process.stdout.write(text)
  outputBuffer.push(text)
  if (text.includes('Ready in') || text.includes('started server on')) {
    ready = true
  }
}

function printErr(chunk) {
  const text = chunk.toString()
  process.stderr.write(text)
  outputBuffer.push(text)
}

child.stdout.on('data', printAndStore)
child.stderr.on('data', printErr)

async function checkHealthWithRetries() {
  for (let i = 0; i < 30; i += 1) {
    if (!ready) {
      await delay(1000)
      continue
    }

    try {
      const response = await fetch(healthUrl)
      const json = await response.json()
      if (response.ok && json.status === 'ok') {
        console.log(`\n[web-runtime-check] Health check passed on ${healthUrl}`)
        return
      }
      throw new Error(`Unexpected health payload: ${JSON.stringify(json)}`)
    } catch (error) {
      if (i === 29) {
        throw error
      }
      await delay(1000)
    }
  }

  throw new Error('Server did not become ready within expected time window.')
}

checkHealthWithRetries().catch(error => {
  console.error(`\n[web-runtime-check] Startup validation failed: ${error.message}`)
  console.error('[web-runtime-check] Recent output:')
  console.error(outputBuffer.slice(-40).join(''))
  child.kill('SIGTERM')
  process.exit(1)
})
