import { NextResponse } from 'next/server'
import { getDemoTrends } from '../../lib/server/demo-store'

export async function GET() {
  const demoTrends = getDemoTrends()
  const diagnostics = {
    demoTrendCount: demoTrends.length,
    hasDemoData: demoTrends.length > 0,
    env: process.env.NODE_ENV || 'development',
  }

  if (!diagnostics.hasDemoData) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        diagnostics,
        message: 'Demo data not loaded',
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    diagnostics,
  })
}

