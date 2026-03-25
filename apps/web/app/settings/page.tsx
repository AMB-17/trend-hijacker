'use client';

import { useState } from 'react';
import { useSavedTrends, useUserPreferences } from '@/lib/hooks';
import { Card, CardBody, CardHeader, Button, Input, Badge } from '@/components/ui';

const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || 'demo-user';

export default function SettingsPage() {
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [notice, setNotice] = useState<string | null>(null);

  const {
    preferences,
    loading,
    saving,
    error,
    setPreferences,
    savePreferences,
    refetch: refetchPreferences,
  } = useUserPreferences(userId);

  const {
    trends: savedTrends,
    loading: savedLoading,
    error: savedError,
    remove,
    refetch: refetchSaved,
  } = useSavedTrends(userId);

  const toggleStage = (stage: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredStages: prev.preferredStages.includes(stage)
        ? prev.preferredStages.filter(s => s !== stage)
        : [...prev.preferredStages, stage],
    }));
  };

  const onSave = async () => {
    setNotice(null);
    try {
      await savePreferences(preferences);
      setNotice('Preferences saved.');
    } catch {
      setNotice('Failed to save preferences.');
    }
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Settings</h1>
        <p className="text-muted">Manage personalization defaults and saved trends.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">User Context</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input value={userId} onChange={e => setUserId(e.target.value)} placeholder="User ID" />
          <Button variant="outline" onClick={() => { refetchPreferences(); refetchSaved(); }}>
            Reload Data
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardBody>
      </Card>

      {(error || savedError) && (
        <Card>
          <CardBody className="text-danger">{error || savedError}</CardBody>
        </Card>
      )}

      {notice && (
        <Card>
          <CardBody className="text-success">{notice}</CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">Preference Rules</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          {loading ? (
            <p className="text-muted">Loading preferences...</p>
          ) : (
            <>
              <div>
                <p className="text-sm text-muted mb-2">Preferred Stages</p>
                <div className="flex flex-wrap gap-2">
                  {['early_signal', 'emerging', 'exploding', 'mature'].map(stage => (
                    <Button
                      key={stage}
                      size="sm"
                      variant="outline"
                      className={preferences.preferredStages.includes(stage) ? 'bg-primary text-white border-primary hover:bg-primary/90' : ''}
                      onClick={() => toggleStage(stage)}
                    >
                      {stage}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted mb-2">Minimum Opportunity Score</p>
                <Input
                  type="number"
                  value={preferences.minOpportunityScore}
                  onChange={e =>
                    setPreferences(prev => ({
                      ...prev,
                      minOpportunityScore: Number(e.target.value || 0),
                    }))
                  }
                />
              </div>

              <div>
                <p className="text-sm text-muted mb-2">Digest Cadence</p>
                <select
                  value={preferences.digestCadence}
                  onChange={e =>
                    setPreferences(prev => ({
                      ...prev,
                      digestCadence: e.target.value as 'off' | 'daily' | 'weekly',
                    }))
                  }
                  className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm text-foreground"
                >
                  <option value="off">Off</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">Saved Trends</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {savedLoading ? (
            <p className="text-muted">Loading saved trends...</p>
          ) : savedTrends.length === 0 ? (
            <p className="text-muted">No saved trends yet.</p>
          ) : (
            savedTrends.map(trend => (
              <div key={trend.id} className="p-4 rounded-lg border border-border bg-card/40 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{trend.title}</p>
                    <p className="text-sm text-muted line-clamp-2">{trend.summary}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => remove(trend.id)}>
                    Remove
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(trend.keywords || []).slice(0, 4).map(keyword => (
                    <Badge key={keyword} variant="default" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
