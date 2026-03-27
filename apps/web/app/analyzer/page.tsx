'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, Button } from '@/components/ui';

export default function AnalyzerPage() {
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (!url) return;
    setAnalyzing(true);
    setTimeout(() => {
      alert('Analysis requested for source: ' + url);
      setAnalyzing(false);
      setUrl('');
    }, 1000);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">Project Analyzer</h1>
        <p className="text-muted">
          Research and rate external projects manually. Submit a URL to process it through our analysis engine.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-foreground">Rate & Analyze a New Project</h3>
          <p className="text-sm text-muted mt-1">Enter a Website, Source, or GitHub Repo URL to instantly analyze trends, velocity, and sentiment.</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex gap-2">
            <input 
              type="url" 
              placeholder="https://github.com/microsoft/vscode..." 
              className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <Button 
              onClick={handleAnalyze} 
              disabled={!url || analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Analyze Source'}
            </Button>
          </div>
        </CardBody>
      </Card>
      
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
         <Card className="border-l-4 border-l-accent">
          <CardBody>
            <h4 className="font-medium mb-2">Supported Sources</h4>
            <ul className="text-sm text-muted space-y-2 list-disc list-inside">
              <li>GitHub Repositories (Code activity, Stars, Issues)</li>
              <li>Hacker News Links (Comments, Velocity)</li>
              <li>Reddit Threads (Engagement, Sentiment)</li>
              <li>Product Hunt Launches (Upvotes, Reviews)</li>
              <li>General Websites (Mention tracking)</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}