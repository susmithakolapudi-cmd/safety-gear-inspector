export const runtime = "nodejs";

// In-memory storage for demo purposes
// In production, you'd use a database like PostgreSQL, MongoDB, or Redis
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
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const site = url.searchParams.get('site');
    const supervisor = url.searchParams.get('supervisor');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    let filteredHistory = [...detectionHistory];

    // Apply filters
    if (site) {
      filteredHistory = filteredHistory.filter(h => h.site?.toLowerCase().includes(site.toLowerCase()));
    }
    if (supervisor) {
      filteredHistory = filteredHistory.filter(h => h.supervisor?.toLowerCase().includes(supervisor.toLowerCase()));
    }
    if (startDate) {
      filteredHistory = filteredHistory.filter(h => new Date(h.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      filteredHistory = filteredHistory.filter(h => new Date(h.timestamp) <= new Date(endDate));
    }

    // Sort by timestamp (newest first)
    filteredHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    const paginatedHistory = filteredHistory.slice(offset, offset + limit);

    return Response.json({
      data: paginatedHistory,
      pagination: {
        total: filteredHistory.length,
        limit,
        offset,
        hasMore: offset + limit < filteredHistory.length
      }
    });

  } catch (e: any) {
    console.error("History GET error:", e);
    return Response.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filename, site, supervisor, detections } = body;

    if (!filename || !detections) {
      return Response.json(
        { error: "Missing required fields: filename, detections" },
        { status: 400 }
      );
    }

    // Calculate summary statistics
    const summary = {
      totalDetections: detections.length,
      helmetCount: detections.filter((d: any) => d.class.toLowerCase().includes('helmet') && !d.class.toLowerCase().includes('no-')).length,
      vestCount: detections.filter((d: any) => d.class.toLowerCase().includes('vest') && !d.class.toLowerCase().includes('no-')).length,
      noHelmetCount: detections.filter((d: any) => d.class.toLowerCase().includes('no-helmet')).length,
      noVestCount: detections.filter((d: any) => d.class.toLowerCase().includes('no-vest')).length,
    };

    const newEntry = {
      id: `det_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      filename,
      site,
      supervisor,
      detections,
      summary
    };

    detectionHistory.unshift(newEntry);

    // Keep only last 1000 entries to prevent memory issues
    if (detectionHistory.length > 1000) {
      detectionHistory = detectionHistory.slice(0, 1000);
    }

    return Response.json({
      success: true,
      id: newEntry.id,
      data: newEntry
    });

  } catch (e: any) {
    console.error("History POST error:", e);
    return Response.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return Response.json(
        { error: "Missing id parameter" },
        { status: 400 }
      );
    }

    const initialLength = detectionHistory.length;
    detectionHistory = detectionHistory.filter(h => h.id !== id);

    if (detectionHistory.length === initialLength) {
      return Response.json(
        { error: "Detection not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Detection deleted successfully"
    });

  } catch (e: any) {
    console.error("History DELETE error:", e);
    return Response.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

