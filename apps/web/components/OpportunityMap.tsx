'use client';

import { useEffect, useRef } from 'react';

export function OpportunityMap({ trends }: { trends: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || trends.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw trend nodes
    const padding = 50;
    const plotWidth = canvas.width - padding * 2;
    const plotHeight = canvas.height - padding * 2;

    for (const trend of trends) {
      const x = padding + (trend.opportunityScore / 100) * plotWidth;
      const y = padding + (trend.discussionCount / (Math.max(...trends.map((t: any) => t.discussionCount)) || 1)) * plotHeight;

      // Color by status
      let color = '#888';
      if (trend.status === 'peak') color = '#ef4444';
      else if (trend.status === 'growing') color = '#22c55e';
      else if (trend.status === 'emerging') color = '#06b6d4';

      // Draw node
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();

      // Draw label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(trend.title.slice(0, 15), x, y - 15);
    }

    // Draw axes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();

    // Label axes
    ctx.fillStyle = '#999';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Opportunity Score →', canvas.width / 2, canvas.height - 10);

    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('← Discussion Volume', 0, 0);
    ctx.restore();
  }, [trends]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">🗺️ Opportunity Map</h2>
      <canvas
        ref={canvasRef}
        className="w-full h-96 bg-black rounded"
        style={{ display: 'block' }}
      />
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
          <span>Emerging</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
          <span>Growing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <span>Peak</span>
        </div>
      </div>
    </div>
  );
}
