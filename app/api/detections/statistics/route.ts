export const runtime = "nodejs";

// Import the same in-memory storage (in production, this would be a shared database)
let detectionHistory: Array<{
  id: string;
  timestamp: string;
  filename: string;
  site?: string;
  supervisor?: string;
  detections: Array<{
    class: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  summary: {
    totalDetections: number;
    helmetCount: number;
    vestCount: number;
    noHelmetCount: number;
    noVestCount: number;
  };
}> = [];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || '7d'; // 1d, 7d, 30d, 90d, all
    const site = url.searchParams.get('site');
    const supervisor = url.searchParams.get('supervisor');

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date | null = null;

    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = null;
        break;
    }

    // Filter data based on criteria
    let filteredData = [...detectionHistory];

    if (startDate) {
      filteredData = filteredData.filter(h => new Date(h.timestamp) >= startDate!);
    }
    if (site) {
      filteredData = filteredData.filter(h => h.site?.toLowerCase().includes(site.toLowerCase()));
    }
    if (supervisor) {
      filteredData = filteredData.filter(h => h.supervisor?.toLowerCase().includes(supervisor.toLowerCase()));
    }

    // Calculate statistics
    const totalScans = filteredData.length;
    const totalDetections = filteredData.reduce((sum, h) => sum + h.summary.totalDetections, 0);
    const totalHelmets = filteredData.reduce((sum, h) => sum + h.summary.helmetCount, 0);
    const totalVests = filteredData.reduce((sum, h) => sum + h.summary.vestCount, 0);
    const totalNoHelmets = filteredData.reduce((sum, h) => sum + h.summary.noHelmetCount, 0);
    const totalNoVests = filteredData.reduce((sum, h) => sum + h.summary.noVestCount, 0);

    // Calculate compliance rates
    const totalPeople = totalHelmets + totalNoHelmets;
    const helmetComplianceRate = totalPeople > 0 ? (totalHelmets / totalPeople) * 100 : 0;
    
    const totalVestPeople = totalVests + totalNoVests;
    const vestComplianceRate = totalVestPeople > 0 ? (totalVests / totalVestPeople) * 100 : 0;

    // Calculate daily trends
    const dailyStats = new Map<string, {
      date: string;
      scans: number;
      detections: number;
      helmets: number;
      vests: number;
      noHelmets: number;
      noVests: number;
    }>();

    filteredData.forEach(h => {
      const date = new Date(h.timestamp).toISOString().split('T')[0];
      const existing = dailyStats.get(date) || {
        date,
        scans: 0,
        detections: 0,
        helmets: 0,
        vests: 0,
        noHelmets: 0,
        noVests: 0
      };

      existing.scans += 1;
      existing.detections += h.summary.totalDetections;
      existing.helmets += h.summary.helmetCount;
      existing.vests += h.summary.vestCount;
      existing.noHelmets += h.summary.noHelmetCount;
      existing.noVests += h.summary.noVestCount;

      dailyStats.set(date, existing);
    });

    const dailyTrends = Array.from(dailyStats.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    // Site statistics
    const siteStats = new Map<string, {
      site: string;
      scans: number;
      totalDetections: number;
      helmetCompliance: number;
      vestCompliance: number;
    }>();

    filteredData.forEach(h => {
      const siteName = h.site || 'Unknown';
      const existing = siteStats.get(siteName) || {
        site: siteName,
        scans: 0,
        totalDetections: 0,
        helmetCompliance: 0,
        vestCompliance: 0
      };

      existing.scans += 1;
      existing.totalDetections += h.summary.totalDetections;
      
      const siteHelmets = h.summary.helmetCount;
      const siteNoHelmets = h.summary.noHelmetCount;
      const siteVests = h.summary.vestCount;
      const siteNoVests = h.summary.noVestCount;
      
      const siteTotalPeople = siteHelmets + siteNoHelmets;
      const siteTotalVestPeople = siteVests + siteNoVests;
      
      existing.helmetCompliance = siteTotalPeople > 0 ? (siteHelmets / siteTotalPeople) * 100 : 0;
      existing.vestCompliance = siteTotalVestPeople > 0 ? (siteVests / siteTotalVestPeople) * 100 : 0;

      siteStats.set(siteName, existing);
    });

    const siteStatistics = Array.from(siteStats.values())
      .sort((a, b) => b.scans - a.scans);

    return Response.json({
      period,
      dateRange: {
        start: startDate?.toISOString() || null,
        end: now.toISOString()
      },
      summary: {
        totalScans,
        totalDetections,
        totalHelmets,
        totalVests,
        totalNoHelmets,
        totalNoVests,
        helmetComplianceRate: Math.round(helmetComplianceRate * 100) / 100,
        vestComplianceRate: Math.round(vestComplianceRate * 100) / 100
      },
      dailyTrends,
      siteStatistics: siteStatistics.slice(0, 10), // Top 10 sites
      topDetections: {
        mostDetections: filteredData
          .sort((a, b) => b.summary.totalDetections - a.summary.totalDetections)
          .slice(0, 5)
          .map(h => ({
            id: h.id,
            filename: h.filename,
            timestamp: h.timestamp,
            detections: h.summary.totalDetections,
            site: h.site
          }))
      }
    });

  } catch (e: any) {
    console.error("Statistics API error:", e);
    return Response.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

