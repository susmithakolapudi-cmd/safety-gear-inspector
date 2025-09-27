export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ROBOFLOW_API_KEY;
    const modelId = process.env.ROBOFLOW_MODEL_ID;
    const version = process.env.ROBOFLOW_MODEL_VERSION ?? "1";
    const confidence = process.env.ROBOFLOW_CONFIDENCE ?? "0.4";
    const overlap = process.env.ROBOFLOW_OVERLAP ?? "0.5";

    if (!apiKey || !modelId) {
      return Response.json(
        { error: "Missing ROBOFLOW_API_KEY or ROBOFLOW_MODEL_ID" },
        { status: 500 }
      );
    }

    // Read the incoming multipart body
    const incoming = await req.formData();
    const files = incoming.getAll("files") as File[];
    
    if (!files || files.length === 0) {
      return Response.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > 10) {
      return Response.json({ error: "Maximum 10 files allowed per batch" }, { status: 400 });
    }

    console.log(`Processing batch of ${files.length} files`);

    // Process files in parallel
    const results = await Promise.allSettled(
      files.map(async (file, index) => {
        try {
          // Rebuild a FormData to forward to Roboflow
          const buf = Buffer.from(await file.arrayBuffer());
          const rfForm = new FormData();
          rfForm.append(
            "file",
            new Blob([buf], { type: file.type || "image/jpeg" }),
            file.name || `upload_${index}.jpg`
          );

          const url =
            `https://detect.roboflow.com/${encodeURIComponent(modelId)}/${encodeURIComponent(version)}` +
            `?api_key=${encodeURIComponent(apiKey)}` +
            `&confidence=${encodeURIComponent(confidence)}` +
            `&overlap=${encodeURIComponent(overlap)}`;

          const rf = await fetch(url, {
            method: "POST",
            body: rfForm,
          });

          if (!rf.ok) {
            throw new Error(`Roboflow error: ${rf.status}`);
          }

          const data = await rf.json();
          return {
            filename: file.name,
            success: true,
            data: data,
            detections: data.predictions?.length || 0
          };
        } catch (error: any) {
          return {
            filename: file.name,
            success: false,
            error: error.message,
            detections: 0
          };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    const totalDetections = results
      .filter(r => r.status === 'fulfilled' && r.value.success)
      .reduce((sum, r) => sum + (r as any).value.detections, 0);

    return Response.json({
      summary: {
        totalFiles: files.length,
        successful,
        failed,
        totalDetections
      },
      results: results.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: 'Processing failed' })
    });

  } catch (e: any) {
    console.error("Batch API Route error:", e);
    return Response.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
