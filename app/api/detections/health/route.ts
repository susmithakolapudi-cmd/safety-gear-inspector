export const runtime = "nodejs";

export async function GET() {
  try {
    const apiKey = process.env.ROBOFLOW_API_KEY;
    const modelId = process.env.ROBOFLOW_MODEL_ID;
    const version = process.env.ROBOFLOW_MODEL_VERSION ?? "1";

    // Check environment variables
    const envStatus = {
      apiKey: !!apiKey,
      modelId: !!modelId,
      version: version
    };

    // Test Roboflow API connectivity
    let roboflowStatus = {
      connected: false,
      responseTime: 0,
      error: null as string | null
    };

    if (apiKey && modelId) {
      try {
        const startTime = Date.now();
        
        // Make a simple test request to Roboflow
        const testUrl = `https://api.roboflow.com/${encodeURIComponent(modelId)}/${encodeURIComponent(version)}?api_key=${encodeURIComponent(apiKey)}`;
        
        const response = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        roboflowStatus.responseTime = Date.now() - startTime;
        roboflowStatus.connected = response.ok;

        if (!response.ok) {
          roboflowStatus.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (error: any) {
        roboflowStatus.error = error.message;
      }
    } else {
      roboflowStatus.error = "Missing API key or model ID";
    }

    // System information
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };

    // Overall health status
    const overallHealth = {
      status: roboflowStatus.connected && envStatus.apiKey && envStatus.modelId ? 'healthy' : 'unhealthy',
      score: calculateHealthScore(envStatus, roboflowStatus)
    };

    return Response.json({
      status: overallHealth.status,
      score: overallHealth.score,
      timestamp: systemInfo.timestamp,
      environment: envStatus,
      roboflow: roboflowStatus,
      system: systemInfo,
      endpoints: {
        inference: '/api/infer',
        batch: '/api/detections/batch',
        history: '/api/detections/history',
        statistics: '/api/detections/statistics',
        export: '/api/detections/export',
        validation: '/api/detections/validate',
        health: '/api/detections/health'
      }
    });

  } catch (error: any) {
    console.error("Health check error:", error);
    return Response.json(
      {
        status: 'error',
        score: 0,
        timestamp: new Date().toISOString(),
        error: error.message
      },
      { status: 500 }
    );
  }
}

function calculateHealthScore(envStatus: any, roboflowStatus: any): number {
  let score = 0;
  
  // Environment variables (40% of score)
  if (envStatus.apiKey) score += 20;
  if (envStatus.modelId) score += 20;
  
  // Roboflow connectivity (60% of score)
  if (roboflowStatus.connected) {
    score += 40;
    // Response time bonus
    if (roboflowStatus.responseTime < 1000) score += 10;
    else if (roboflowStatus.responseTime < 3000) score += 5;
  }
  
  return Math.min(100, score);
}

