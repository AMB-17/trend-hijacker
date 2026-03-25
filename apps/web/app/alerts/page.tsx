'use client';

import { useMemo, useState } from 'react';
import { useAlerts } from '@/lib/hooks';
import { Card, CardBody, CardHeader, Button, Input, Badge } from '@/components/ui';

const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || 'demo-user';

export default function AlertsPage() {
  const [userId, setUserId] = useState(DEFAULT_USER_ID);
  const [name, setName] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [minScore, setMinScore] = useState(70);
  const [stages, setStages] = useState<string[]>(['exploding']);
  const [message, setMessage] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<Array<{ alertId: string; matchedCount: number }>>([]);

  const { alerts, enabledCount, loading, error, create, toggleEnabled, remove, evaluate, refetch } = useAlerts(userId);

  const keywords = useMemo(
    () => keywordInput.split(',').map(k => k.trim()).filter(Boolean),
    [keywordInput]
  );

  const toggleStage = (stage: string) => {
    setStages(prev => (prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]));
  };

  const handleCreate = async () => {
    setMessage(null);
    try {
      await create({
        name,
        rule: {
          minOpportunityScore: minScore,
          stages,
          keywords,
        },
        channel: 'in_app',
        enabled: true,
      });
      setName('');
      setKeywordInput('');
      setMinScore(70);
      setStages(['exploding']);
      setMessage('Alert created successfully.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to create alert.');
    }
  };

  const handleEvaluate = async () => {
    const results = await evaluate();
    setEvaluations(results.map(item => ({ alertId: item.alertId, matchedCount: item.matchedCount })));
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Alerts</h1>
        <p className="text-muted">Create and evaluate alert rules against live trend signals.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">Alert Context</h2>
        </CardHeader>
        <CardBody className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input value={userId} onChange={e => setUserId(e.target.value)} placeholder="User ID" />
          <Button variant="outline" onClick={() => refetch()}>
            Reload Alerts
          </Button>
          <Button variant="outline" onClick={handleEvaluate}>
            Evaluate Alerts
          </Button>
        </CardBody>
      </Card>

      {error && (
        <Card>
          <CardBody className="text-danger">{error}</CardBody>
        </Card>
      )}

      {message && (
        <Card>
          <CardBody className="text-success">{message}</CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">Create Alert</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Alert name" />
          <Input
            type="number"
            value={minScore}
            onChange={e => setMinScore(Number(e.target.value || 0))}
            placeholder="Minimum opportunity score"
          />
          <Input
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            placeholder="Keywords (comma separated)"
          />

          <div className="space-y-2">
            <p className="text-sm text-muted">Stages</p>
            <div className="flex flex-wrap gap-2">
              {['early_signal', 'emerging', 'exploding', 'mature'].map(stage => (
                <Button
                  key={stage}
                  size="sm"
                  variant="outline"
                  className={stages.includes(stage) ? 'bg-primary text-white border-primary hover:bg-primary/90' : ''}
                  onClick={() => toggleStage(stage)}
                >
                  {stage}
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create Alert
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-foreground">Your Alerts</h2>
          <p className="text-sm text-muted">{enabledCount} enabled of {alerts.length}</p>
        </CardHeader>
        <CardBody className="space-y-3">
          {loading ? (
            <p className="text-muted">Loading alerts...</p>
          ) : alerts.length === 0 ? (
            <p className="text-muted">No alerts created yet.</p>
          ) : (
            alerts.map(alert => (
              <div key={alert.id} className="p-4 rounded-lg border border-border bg-card/40 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{alert.name}</p>
                    <p className="text-xs text-muted">Min score: {alert.rule.minOpportunityScore}</p>
                  </div>
                  <Badge variant={alert.enabled ? 'success' : 'default'}>
                    {alert.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  {alert.rule.stages.map(stage => (
                    <Badge key={stage} variant="primary" className="text-xs">{stage}</Badge>
                  ))}
                  {alert.rule.keywords.map(keyword => (
                    <Badge key={keyword} variant="default" className="text-xs">{keyword}</Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleEnabled(alert)}>
                    {alert.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(alert.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {evaluations.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">Last Evaluation</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {evaluations.map(item => (
              <div key={item.alertId} className="flex items-center justify-between text-sm">
                <span className="text-muted">Alert {item.alertId}</span>
                <span className="text-foreground font-semibold">{item.matchedCount} matches</span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
