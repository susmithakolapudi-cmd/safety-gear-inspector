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
    const format = url.searchParams.get('format') || 'json'; // json, csv, xlsx
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const site = url.searchParams.get('site');
    const supervisor = url.searchParams.get('supervisor');

    // Filter data based on criteria
    let filteredData = [...detectionHistory];

    if (startDate) {
      filteredData = filteredData.filter(h => new Date(h.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      filteredData = filteredData.filter(h => new Date(h.timestamp) <= new Date(endDate));
    }
    if (site) {
      filteredData = filteredData.filter(h => h.site?.toLowerCase().includes(site.toLowerCase()));
    }
    if (supervisor) {
      filteredData = filteredData.filter(h => h.supervisor?.toLowerCase().includes(supervisor.toLowerCase()));
    }

    // Sort by timestamp (newest first)
    filteredData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    switch (format.toLowerCase()) {
      case 'csv':
        return exportCSV(filteredData);
      case 'xlsx':
        return exportXLSX(filteredData);
      case 'json':
      default:
        return exportJSON(filteredData);
    }

  } catch (e: any) {
    console.error("Export API error:", e);
    return Response.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

function exportJSON(data: any[]) {
  const exportData = {
    exportInfo: {
      timestamp: new Date().toISOString(),
      totalRecords: data.length,
      format: 'json'
    },
    detections: data
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="helmet-detections-${new Date().toISOString().split('T')[0]}.json"`
    }
  });
}

function exportCSV(data: any[]) {
  const headers = [
    'ID',
    'Timestamp',
    'Filename',
    'Site',
    'Supervisor',
    'Total Detections',
    'Helmet Count',
    'Vest Count',
    'No Helmet Count',
    'No Vest Count',
    'Helmet Compliance %',
    'Vest Compliance %',
    'Detections (JSON)'
  ];

  const rows = data.map(item => {
    const totalPeople = item.summary.helmetCount + item.summary.noHelmetCount;
    const totalVestPeople = item.summary.vestCount + item.summary.noVestCount;
    const helmetCompliance = totalPeople > 0 ? (item.summary.helmetCount / totalPeople) * 100 : 0;
    const vestCompliance = totalVestPeople > 0 ? (item.summary.vestCount / totalVestPeople) * 100 : 0;

    return [
      item.id,
      item.timestamp,
      item.filename,
      item.site || '',
      item.supervisor || '',
      item.summary.totalDetections,
      item.summary.helmetCount,
      item.summary.vestCount,
      item.summary.noHelmetCount,
      item.summary.noVestCount,
      helmetCompliance.toFixed(2),
      vestCompliance.toFixed(2),
      JSON.stringify(item.detections)
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="helmet-detections-${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}

function exportXLSX(data: any[]) {
  // For XLSX export, we'll return a simplified JSON structure
  // In a production environment, you'd use a library like 'xlsx' to create actual Excel files
  const xlsxData = {
    summary: {
      totalRecords: data.length,
      exportDate: new Date().toISOString(),
      format: 'xlsx (simplified)'
    },
    detections: data.map(item => ({
      id: item.id,
      timestamp: item.timestamp,
      filename: item.filename,
      site: item.site || '',
      supervisor: item.supervisor || '',
      totalDetections: item.summary.totalDetections,
      helmetCount: item.summary.helmetCount,
      vestCount: item.summary.vestCount,
      noHelmetCount: item.summary.noHelmetCount,
      noVestCount: item.summary.noVestCount,
      helmetCompliance: item.summary.helmetCount + item.summary.noHelmetCount > 0 
        ? ((item.summary.helmetCount / (item.summary.helmetCount + item.summary.noHelmetCount)) * 100).toFixed(2)
        : '0.00',
      vestCompliance: item.summary.vestCount + item.summary.noVestCount > 0
        ? ((item.summary.vestCount / (item.summary.vestCount + item.summary.noVestCount)) * 100).toFixed(2)
        : '0.00'
    }))
  };

  return new Response(JSON.stringify(xlsxData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="helmet-detections-${new Date().toISOString().split('T')[0]}.xlsx.json"`
    }
  });
}

