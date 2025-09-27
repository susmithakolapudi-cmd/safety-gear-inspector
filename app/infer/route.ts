// app/api/infer/route.ts
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey  = process.env.ROBOFLOW_API_KEY!;
    const modelId = process.env.ROBOFLOW_MODEL_ID!;      // e.g. "autodamage-vjy6i"
    const version = process.env.ROBOFLOW_MODEL_VERSION!; // e.g. "3"
    const conf    = process.env.ROBOFLOW_CONFIDENCE ?? "0.4";
    const overlap = process.env.ROBOFLOW_OVERLAP ?? "0.5";

    if (!apiKey || !modelId || !version) {
      return Response.json({ error: "Missing envs" }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // Build RF URL with api_key in the query string (most reliable)
    const url =
      `https://detect.roboflow.com/${encodeURIComponent(modelId)}/${encodeURIComponent(version)}` +
      `?api_key=${encodeURIComponent(apiKey)}` +
      `&format=json&confidence=${encodeURIComponent(conf)}&overlap=${encodeURIComponent(overlap)}` +
      `&name=${encodeURIComponent(file.name || "upload.jpg")}`;

    const rfForm = new FormData();
    rfForm.append("file", file, file.name || "upload.jpg");

    const res = await fetch(url, { method: "POST", body: rfForm });

    // If RF ever returns non-JSON (like HTML/error), capture text too
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!res.ok) {
      return Response.json({ error: "Roboflow error", status: res.status, detail: data }, { status: 502 });
    }
    return Response.json(data);
  } catch (e: any) {
    return Response.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
