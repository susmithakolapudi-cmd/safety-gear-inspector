export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ROBOFLOW_API_KEY;
    const modelId = process.env.ROBOFLOW_MODEL_ID;
    const version = process.env.ROBOFLOW_MODEL_VERSION ?? "1";
    const confidence = process.env.ROBOFLOW_CONFIDENCE ?? "0.4";
    const overlap = process.env.ROBOFLOW_OVERLAP ?? "0.5";

    // Debug logging
    console.log("=== ROBOFLOW DEBUG ===");
    console.log("API Key:", apiKey ? `${apiKey.slice(0, 10)}...` : "MISSING");
    console.log("Model ID:", modelId);
    console.log("Version:", version);
    console.log("Confidence:", confidence);
    console.log("Overlap:", overlap);

    if (!apiKey || !modelId) {
      return Response.json(
        { error: "Missing ROBOFLOW_API_KEY or ROBOFLOW_MODEL_ID" },
        { status: 500 }
      );
    }

    // Optional mock mode for demos
    if (process.env.MOCK_INFER === "1") {
      return Response.json({
        time: 42,
        predictions: [
          {
            x: 320, y: 220, width: 180, height: 160,
            class: "helmet", confidence: 0.91
          },
          {
            x: 315, y: 360, width: 220, height: 240,
            class: "vest", confidence: 0.84
          }
        ]
      });
    }

    // Read the incoming multipart body
    const incoming = await req.formData();
    const file = incoming.get("file") as unknown as File | null;
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    console.log("File received:", file.name, file.type, file.size);

    // Rebuild a FormData to forward to Roboflow
    const buf = Buffer.from(await file.arrayBuffer());
    const rfForm = new FormData();
    rfForm.append(
      "file",
      new Blob([buf], { type: file.type || "image/jpeg" }),
      (file as any).name || "upload.jpg"
    );

    const url =
      `https://detect.roboflow.com/${encodeURIComponent(modelId)}/${encodeURIComponent(version)}` +
      `?api_key=${encodeURIComponent(apiKey)}` +
      `&confidence=${encodeURIComponent(confidence)}` +
      `&overlap=${encodeURIComponent(overlap)}`;

    console.log("Roboflow URL:", url.replace(apiKey, "***"));

    const rf = await fetch(url, {
      method: "POST",
      body: rfForm,
    });

    console.log("Roboflow response status:", rf.status);
    console.log("Roboflow response headers:", Object.fromEntries(rf.headers.entries()));

    const text = await rf.text();
    console.log("Roboflow response body:", text);

    if (!rf.ok) {
      return Response.json(
        { error: "Roboflow error", status: rf.status, detail: safeJSON(text) },
        { status: 502 }
      );
    }

    return new Response(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("API Route error:", e);
    return Response.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

function safeJSON(s: string) {
  try { return JSON.parse(s); } catch { return s; }
}