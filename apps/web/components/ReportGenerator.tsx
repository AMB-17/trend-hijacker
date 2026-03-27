'use client';

import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { LoadingSpinner } from './LoadingSpinner';

interface ReportConfig {
  format: 'pdf' | 'csv' | 'html';
  trendIds: string[];
  startDate: Date;
  endDate: Date;
}

interface ScheduledReportConfig {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  dayOfWeek?: number;
  dayOfMonth?: number;
  hourOfDay: number;
  templateId: string;
  recipientEmails: string[];
}

export const ReportGeneratorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  trendIds?: string[];
  onGenerate?: (config: ReportConfig) => void;
}> = ({ isOpen, onClose, trendIds = [], onGenerate }) => {
  const [format, setFormat] = useState<'pdf' | 'csv' | 'html'>('pdf');
  const [selectedTrends, setSelectedTrends] = useState<string[]>(trendIds);
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (selectedTrends.length === 0) {
      alert('Please select at least one trend');
      return;
    }

    setLoading(true);
    try {
      const config: ReportConfig = {
        format,
        trendIds: selectedTrends,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };

      const response = await fetch('/api/reports/generate?format=' + format, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trendIds: selectedTrends,
          startDate,
          endDate,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const result = await response.json();
      onGenerate?.(config);

      // Download the report if it's a file format
      if (result.data?.fileUrl) {
        window.open(result.data.fileUrl, '_blank');
      }

      onClose();
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">Generate Report</h2>

        {/* Format Selection */}
        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Report Format</label>
          <div className="grid grid-cols-3 gap-2">
            {(['pdf', 'csv', 'html'] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`p-2 rounded border-2 ${
                  format === fmt
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <LoadingSpinner /> : 'Generate'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export const ReportHistoryPanel: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('/api/reports/history');
        const data = await response.json();
        setReports(data.data?.reports || []);
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Reports</h3>

      {reports.length === 0 ? (
        <p className="text-gray-500 text-sm">No reports generated yet</p>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex-1">
                <p className="font-semibold text-sm">{report.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(report.createdAt).toLocaleDateString()} • {report.format.toUpperCase()}
                </p>
              </div>
              <Badge variant="default">{report.format}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export const ScheduledReportManager: React.FC = () => {
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ScheduledReportConfig>({
    frequency: 'WEEKLY',
    hourOfDay: 9,
    templateId: '',
    recipientEmails: [],
  });

  React.useEffect(() => {
    const fetchScheduled = async () => {
      try {
        const response = await fetch('/api/reports/scheduled');
        const data = await response.json();
        setScheduled(data.data?.scheduled || []);
      } catch (error) {
        console.error('Failed to fetch scheduled reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScheduled();
  }, []);

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/reports/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create scheduled report');

      const result = await response.json();
      setScheduled([...scheduled, result.data]);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to create scheduled report:', error);
      alert('Failed to create scheduled report');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return;

    try {
      await fetch(`/api/reports/scheduled/${id}`, { method: 'DELETE' });
      setScheduled(scheduled.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete scheduled report:', error);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Scheduled Reports</h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'Schedule New'}
        </Button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Frequency</label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
              className="w-full px-3 py-2 border rounded text-sm"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Time of Day (Hour)</label>
            <input
              type="number"
              min="0"
              max="23"
              value={formData.hourOfDay}
              onChange={(e) => setFormData({ ...formData, hourOfDay: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Recipient Emails</label>
            <input
              type="text"
              placeholder="email1@example.com, email2@example.com"
              onChange={(e) => setFormData({ ...formData, recipientEmails: e.target.value.split(',').map(e => e.trim()) })}
              className="w-full px-3 py-2 border rounded text-sm"
            />
          </div>

          <Button onClick={handleCreate} className="w-full">
            Create Schedule
          </Button>
        </div>
      )}

      {scheduled.length === 0 ? (
        <p className="text-gray-500 text-sm">No scheduled reports</p>
      ) : (
        <div className="space-y-2">
          {scheduled.map((schedule) => (
            <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <p className="font-semibold text-sm">{schedule.templateName}</p>
                <p className="text-xs text-gray-500">
                  {schedule.frequency} at {schedule.hourOfDay}:00
                  {schedule.nextSendAt && ` • Next: ${new Date(schedule.nextSendAt).toLocaleDateString()}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(schedule.id)}
                className="text-red-500 hover:text-red-700 text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default { ReportGeneratorModal, ReportHistoryPanel, ScheduledReportManager };
