import { db } from '../db';
import { logger } from '@packages/utils';
import { trendAnalysis } from './trend-analysis.service';

/**
 * Report Generation Service
 * Handles PDF/CSV report generation and scheduled reporting
 */
export class ReportGenerationService {
  /**
   * Generate a report
   */
  async generateReport(userId: string, options: {
    format: 'pdf' | 'csv' | 'html';
    trendIds: string[];
    templateId?: string;
    startDate: Date;
    endDate: Date;
    title?: string;
  }) {
    const { format, trendIds, templateId, startDate, endDate, title } = options;

    // Fetch trends data
    const trends = await db.trend.findMany({
      where: { id: { in: trendIds } },
      include: {
        timeseries: {
          where: {
            date: { gte: startDate, lte: endDate },
          },
          orderBy: { date: 'asc' },
        },
        sentiments: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    // Prepare report data
    const reportData = {
      title: title || `Trend Analysis Report - ${new Date().toLocaleDateString()}`,
      generatedAt: new Date(),
      period: { startDate, endDate },
      trends,
      summary: this.generateReportSummary(trends),
      charts: this.prepareChartData(trends),
    };

    // Generate content based on format
    let content: string;
    let mimeType: string;

    if (format === 'pdf') {
      content = this.generatePDFContent(reportData);
      mimeType = 'application/pdf';
    } else if (format === 'csv') {
      content = this.generateCSVContent(reportData);
      mimeType = 'text/csv';
    } else {
      content = this.generateHTMLContent(reportData);
      mimeType = 'text/html';
    }

    // Save to database
    const report = await db.generatedReport.create({
      data: {
        userId,
        templateId: templateId || undefined,
        title: reportData.title,
        format,
        trendIds,
        content,
        summary: reportData.summary,
        insights: reportData.charts,
        startDate,
        endDate,
        mimeType,
        fileSize: content.length,
      },
    });

    return report;
  }

  /**
   * Generate PDF content
   */
  private generatePDFContent(data: any): string {
    // In production, use pdfkit or similar library
    // For now, return a serializable format
    return JSON.stringify({
      type: 'pdf',
      title: data.title,
      sections: [
        {
          title: 'Executive Summary',
          content: data.summary,
        },
        {
          title: 'Trend Analysis',
          trends: data.trends.map(t => ({
            title: t.title,
            score: t.opportunityScore,
            velocity: t.velocityGrowth,
            volume: t.discussionVolume,
          })),
        },
        {
          title: 'Metrics & Charts',
          charts: data.charts,
        },
      ],
    });
  }

  /**
   * Generate CSV content
   */
  private generateCSVContent(data: any): string {
    const headers = [
      'Trend Title',
      'Opportunity Score',
      'Velocity Growth',
      'Discussion Volume',
      'Status',
      'Stage',
      'Momentum',
    ];

    const rows = data.trends.map(t => [
      t.title,
      t.opportunityScore,
      t.velocityGrowth,
      t.discussionVolume,
      t.status,
      t.stage,
      t.momentum,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Generate HTML content
   */
  private generateHTMLContent(data: any): string {
    const trendsTable = data.trends
      .map(t => `
        <tr>
          <td>${t.title}</td>
          <td>${Math.round(t.opportunityScore)}</td>
          <td>${t.velocityGrowth.toFixed(2)}</td>
          <td>${t.discussionVolume}</td>
          <td>${t.status}</td>
        </tr>
      `)
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <title>${data.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>${data.title}</h1>
  <p>Generated: ${data.generatedAt.toLocaleString()}</p>
  <p>Period: ${data.period.startDate.toLocaleDateString()} - ${data.period.endDate.toLocaleDateString()}</p>
  
  <h2>Summary</h2>
  <p>${data.summary}</p>
  
  <h2>Trends Analysis</h2>
  <table>
    <tr>
      <th>Title</th>
      <th>Score</th>
      <th>Velocity</th>
      <th>Volume</th>
      <th>Status</th>
    </tr>
    ${trendsTable}
  </table>
</body>
</html>
    `;
  }

  /**
   * Generate report summary
   */
  private generateReportSummary(trends: any[]): string {
    const totalTrends = trends.length;
    const avgScore = trends.reduce((sum, t) => sum + t.opportunityScore, 0) / totalTrends;
    const emergingCount = trends.filter(t => t.stage === 'emerging').length;
    const explodingCount = trends.filter(t => t.stage === 'exploding').length;

    return `
This report analyzes ${totalTrends} trends with an average opportunity score of ${Math.round(avgScore)}/100.
There are ${emergingCount} emerging trends and ${explodingCount} exploding trends in this analysis.
The data indicates ${avgScore > 70 ? 'strong' : 'moderate'} market opportunities overall.
    `.trim();
  }

  /**
   * Prepare chart data
   */
  private prepareChartData(trends: any[]): any {
    return {
      velocityChart: trends.map(t => ({
        name: t.title.substring(0, 20),
        velocity: t.velocityGrowth,
      })),
      scoreChart: trends.map(t => ({
        name: t.title.substring(0, 20),
        score: t.opportunityScore,
      })),
      timeSeriesChart: this.prepareTimeSeriesChart(trends),
    };
  }

  /**
   * Prepare time-series chart data
   */
  private prepareTimeSeriesChart(trends: any[]): any[] {
    const aggregated: { [key: string]: any } = {};

    trends.forEach(trend => {
      trend.timeseries?.forEach(ts => {
        const dateStr = new Date(ts.date).toISOString().split('T')[0];
        if (!aggregated[dateStr]) {
          aggregated[dateStr] = {
            date: dateStr,
            totalVolume: 0,
            avgScore: 0,
            count: 0,
          };
        }
        aggregated[dateStr].totalVolume += ts.discussionVolume;
        aggregated[dateStr].avgScore += ts.opportunityScore;
        aggregated[dateStr].count += 1;
      });
    });

    return Object.values(aggregated).map(d => ({
      date: d.date,
      volume: d.totalVolume,
      avgScore: d.count > 0 ? d.avgScore / d.count : 0,
    }));
  }

  /**
   * Create scheduled report
   */
  async createScheduledReport(userId: string, config: {
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    dayOfWeek?: number;
    dayOfMonth?: number;
    hourOfDay: number;
    templateId: string;
    recipientEmails: string[];
    trendFilters?: any;
  }) {
    const nextSendAt = this.calculateNextSendTime(config.frequency, config.dayOfWeek, config.dayOfMonth, config.hourOfDay);

    const scheduled = await db.scheduledReport.create({
      data: {
        userId,
        frequency: config.frequency,
        dayOfWeek: config.dayOfWeek,
        dayOfMonth: config.dayOfMonth,
        hourOfDay: config.hourOfDay,
        templateId: config.templateId,
        templateName: 'Custom Report',
        recipientEmails: config.recipientEmails,
        trendFilters: config.trendFilters,
        nextSendAt,
        enabled: true,
      },
    });

    return scheduled;
  }

  /**
   * Calculate next send time
   */
  private calculateNextSendTime(frequency: string, dayOfWeek?: number, dayOfMonth?: number, hourOfDay: number = 9): Date {
    const now = new Date();
    const nextTime = new Date(now);

    if (frequency === 'DAILY') {
      nextTime.setDate(nextTime.getDate() + 1);
      nextTime.setHours(hourOfDay, 0, 0, 0);
    } else if (frequency === 'WEEKLY') {
      const daysUntilTarget = ((dayOfWeek || 0) - nextTime.getDay() + 7) % 7 || 7;
      nextTime.setDate(nextTime.getDate() + daysUntilTarget);
      nextTime.setHours(hourOfDay, 0, 0, 0);
    } else if (frequency === 'MONTHLY') {
      const targetDay = dayOfMonth || 1;
      nextTime.setMonth(nextTime.getMonth() + 1);
      nextTime.setDate(targetDay);
      nextTime.setHours(hourOfDay, 0, 0, 0);
    }

    return nextTime;
  }

  /**
   * Get user's report history
   */
  async getReportHistory(userId: string, limit: number = 20) {
    return db.generatedReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        format: true,
        createdAt: true,
        fileSize: true,
      },
    });
  }

  /**
   * Get scheduled reports for user
   */
  async getScheduledReports(userId: string) {
    return db.scheduledReport.findMany({
      where: { userId },
      orderBy: { nextSendAt: 'asc' },
    });
  }

  /**
   * Update scheduled report
   */
  async updateScheduledReport(reportId: string, updates: any) {
    return db.scheduledReport.update({
      where: { id: reportId },
      data: updates,
    });
  }

  /**
   * Delete scheduled report
   */
  async deleteScheduledReport(reportId: string) {
    return db.scheduledReport.update({
      where: { id: reportId },
      data: { deletedAt: new Date() },
    });
  }
}

export const reportGeneration = new ReportGenerationService();
