import {
  DEMO_INSIGHTS,
  DEMO_OPPORTUNITY_MAP,
  DEMO_QUICK_WINS,
  DEMO_TRENDS_EARLY,
  DEMO_TRENDS_EXPLODING,
} from '../../lib/demo-data'

type DemoTrend = (typeof DEMO_TRENDS_EARLY)[number]

export type DemoPreferences = {
  preferredStages: string[]
  minOpportunityScore: number
  digestCadence: 'off' | 'daily' | 'weekly'
}

export type DemoAlert = {
  id: string
  userId: string
  name: string
  rule: {
    minOpportunityScore: number
    stages: string[]
    keywords: string[]
  }
  channel: 'in_app' | 'webhook'
  webhookUrl?: string
  enabled: boolean
  lastTriggeredAt?: string
  createdAt: string
  updatedAt: string
}

type DemoState = {
  savedTrendIdsByUser: Record<string, Set<string>>
  alertsByUser: Record<string, DemoAlert[]>
  preferencesByUser: Record<string, DemoPreferences>
}

const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || 'demo-user'

const DEFAULT_PREFERENCES: DemoPreferences = {
  preferredStages: ['early_signal', 'exploding'],
  minOpportunityScore: 65,
  digestCadence: 'daily',
}

const ALL_TRENDS: DemoTrend[] = [...DEMO_TRENDS_EXPLODING, ...DEMO_TRENDS_EARLY]

declare global {
  // eslint-disable-next-line no-var
  var __trendHijackerDemoState: DemoState | undefined
}

function createInitialState(): DemoState {
  return {
    savedTrendIdsByUser: {
      [DEFAULT_USER_ID]: new Set(['trend-exploding-1', 'trend-early-1', 'trend-exploding-2']),
    },
    alertsByUser: {
      [DEFAULT_USER_ID]: [
        {
          id: 'alert-demo-exploding-ai',
          userId: DEFAULT_USER_ID,
          name: 'Exploding AI Opportunities',
          rule: {
            minOpportunityScore: 80,
            stages: ['exploding'],
            keywords: ['ai', 'agents'],
          },
          channel: 'in_app',
          enabled: true,
          createdAt: new Date('2026-03-20T09:00:00.000Z').toISOString(),
          updatedAt: new Date('2026-03-23T09:00:00.000Z').toISOString(),
        },
      ],
    },
    preferencesByUser: {
      [DEFAULT_USER_ID]: { ...DEFAULT_PREFERENCES },
    },
  }
}

export function getDemoState(): DemoState {
  if (!global.__trendHijackerDemoState) {
    global.__trendHijackerDemoState = createInitialState()
  }
  return global.__trendHijackerDemoState
}

export function getDemoTrends() {
  return ALL_TRENDS
}

export function listSavedTrends(userId: string, limit = 50, offset = 0) {
  const state = getDemoState()
  const ids = state.savedTrendIdsByUser[userId] || new Set<string>()
  const rows = ALL_TRENDS.filter(trend => ids.has(trend.id))
  const paginated = rows.slice(offset, offset + limit)

  return {
    data: paginated,
    total: rows.length,
    hasMore: offset + paginated.length < rows.length,
    meta: {
      limit,
      offset,
    },
  }
}

export function saveTrend(userId: string, trendId: string) {
  const state = getDemoState()
  const trendExists = ALL_TRENDS.some(item => item.id === trendId)
  if (!trendExists) {
    return null
  }

  if (!state.savedTrendIdsByUser[userId]) {
    state.savedTrendIdsByUser[userId] = new Set<string>()
  }

  state.savedTrendIdsByUser[userId].add(trendId)
  return { savedAt: new Date().toISOString() }
}

export function removeSavedTrend(userId: string, trendId: string) {
  const state = getDemoState()
  const ids = state.savedTrendIdsByUser[userId]
  if (!ids) {
    return false
  }

  return ids.delete(trendId)
}

export function listAlerts(userId: string, enabledOnly = false) {
  const state = getDemoState()
  const alerts = state.alertsByUser[userId] || []
  return enabledOnly ? alerts.filter(item => item.enabled) : alerts
}

export function createAlert(input: Omit<DemoAlert, 'id' | 'createdAt' | 'updatedAt'>) {
  const state = getDemoState()
  if (!state.alertsByUser[input.userId]) {
    state.alertsByUser[input.userId] = []
  }

  const now = new Date().toISOString()
  const created: DemoAlert = {
    ...input,
    id: `alert-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  }

  state.alertsByUser[input.userId].unshift(created)
  return created
}

export function updateAlert(
  id: string,
  input: Partial<Omit<DemoAlert, 'id' | 'createdAt'>> & { userId: string }
) {
  const state = getDemoState()
  const alerts = state.alertsByUser[input.userId] || []
  const idx = alerts.findIndex(item => item.id === id)
  if (idx < 0) {
    return null
  }

  const updated: DemoAlert = {
    ...alerts[idx],
    ...input,
    id,
    updatedAt: new Date().toISOString(),
  }
  alerts[idx] = updated
  return updated
}

export function deleteAlert(id: string, userId: string) {
  const state = getDemoState()
  const alerts = state.alertsByUser[userId] || []
  const idx = alerts.findIndex(item => item.id === id)
  if (idx < 0) {
    return false
  }

  alerts.splice(idx, 1)
  return true
}

export function evaluateAlerts(userId: string, limit = 20) {
  const alerts = listAlerts(userId, true).slice(0, limit)
  const evaluations = alerts.map(alert => {
    const matchedTrendIds = ALL_TRENDS.filter(trend => {
      const stageMatch = alert.rule.stages.length === 0 || alert.rule.stages.includes(trend.stage)
      const scoreMatch = trend.opportunityScore >= alert.rule.minOpportunityScore
      const keywordMatch =
        alert.rule.keywords.length === 0 ||
        alert.rule.keywords.some(keyword => {
          const normalized = keyword.toLowerCase()
          const haystack = [trend.title, trend.summary, ...trend.keywords].join(' ').toLowerCase()
          return haystack.includes(normalized)
        })

      return stageMatch && scoreMatch && keywordMatch
    }).map(item => item.id)

    return {
      alertId: alert.id,
      matchedTrendIds,
      matchedCount: matchedTrendIds.length,
    }
  })

  return evaluations
}

export function getPreferences(userId: string): DemoPreferences {
  const state = getDemoState()
  if (!state.preferencesByUser[userId]) {
    state.preferencesByUser[userId] = { ...DEFAULT_PREFERENCES }
  }
  return state.preferencesByUser[userId]
}

export function updatePreferences(userId: string, next: DemoPreferences) {
  const state = getDemoState()
  state.preferencesByUser[userId] = {
    preferredStages: [...next.preferredStages],
    minOpportunityScore: Number.isFinite(next.minOpportunityScore) ? next.minOpportunityScore : 0,
    digestCadence: next.digestCadence,
  }
  return state.preferencesByUser[userId]
}

export function getDemoOpportunityData() {
  return {
    map: DEMO_OPPORTUNITY_MAP,
    insights: DEMO_INSIGHTS,
    quickWins: DEMO_QUICK_WINS,
  }
}
