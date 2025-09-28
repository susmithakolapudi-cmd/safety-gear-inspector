"use client";
import React, { useRef, useState, useMemo } from "react";
import Dropzone from "@/components/Dropzone";
import Header from "@/components/Header";
import BoundingCanvas from "@/components/BoundingCanvas";
import { useAppStore } from "@/lib/store";
import type { RFResponse } from "@/lib/types";

function colorFor(label: string) {
  const l = label.toLowerCase();
  if (l.includes("no-helmet")) return "#ef4444"; // bright red
  if (l.includes("no-vest")) return "#f97316";   // bright orange
  if (l.includes("helmet")) return "#06b6d4";    // bright cyan
  if (l.includes("vest")) return "#10b981";      // bright green
  return "#8b5cf6"; // bright purple fallback
}

function Chip({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span 
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs text-white font-medium ${className || 'bg-cyan-500'}`}
      style={style}
    >
      {text}
    </span>
  );
}

export default function Page() {
  const { file, previewUrl, boxes, setBoxes, status, setStatus, reset } = useAppStore();
  const imgRef = useRef<HTMLImageElement>(null);
  const [meta, setMeta] = useState({ site: "", supervisor: "" });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const b of boxes) c[b.class] = (c[b.class] ?? 0) + 1;
    return c;
  }, [boxes]);

  async function runInference() {
    if (!file) return;
    setStatus("loading");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/infer", { method: "POST", body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as RFResponse;
      setBoxes(data.predictions ?? []);
      setStatus("done");
    } catch (e: any) {
      setStatus("error", e.message);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Header />

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border p-3">
          <div className="text-xs text-neutral-500">Status</div>
          <div className="mt-1 font-semibold">
            {status === "loading" ? "Running…" : status === "done" ? "Complete" : "Idle"}
          </div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-neutral-500">Detections</div>
          <div className="mt-1 font-semibold">{boxes.length || 0}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-neutral-500">Classes</div>
          <div className="mt-1 flex gap-1 flex-wrap">
            {Object.keys(counts).length === 0 ? (
              <span className="text-neutral-400 text-sm">—</span>
            ) : (
              Object.entries(counts).map(([k, v]) => (
                <Chip 
                  key={k} 
                  text={`${k} × ${v}`}
                  className={`text-white font-medium`}
                  style={{backgroundColor: colorFor(k)}}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: image / dropzone */}
        <div className="md:col-span-2">
          {!previewUrl ? (
            <Dropzone />
          ) : (
            <div className="relative rounded-2xl overflow-hidden border shadow-sm">
              <img
                ref={imgRef}
                src={previewUrl}
                alt="preview"
                className="block w-full h-auto select-none"
                onLoad={() => setBoxes([])}
              />
              <BoundingCanvas imgRef={imgRef} boxes={boxes} />
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={runInference}
              disabled={!file || status === "loading"}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {status === "loading" ? "Checking PPE…" : "Detect Safety Gear"}
            </button>
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded-lg border hover:bg-neutral-50"
            >
              Reset
            </button>
          </div>

          {status === "error" && (
            <p className="text-red-600 text-sm mt-2">
              Inference failed. Verify Roboflow env + model ID/version or toggle mock mode.
            </p>
          )}
        </div>

        {/* Right: details + detections */}
        <aside className="space-y-4">
          <div className="p-4 rounded-2xl border">
            <div className="font-medium mb-2">Job Details (optional)</div>
            <label className="text-sm block mb-2">
              Site / Job #
              <input
                value={meta.site}
                onChange={(e) => setMeta({ ...meta, site: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 bg-transparent"
                placeholder="Plant-12 / Slab-Deck"
              />
            </label>
            <label className="text-sm block">
              Supervisor
              <input
                value={meta.supervisor}
                onChange={(e) => setMeta({ ...meta, supervisor: e.target.value })}
                className="mt-1 w-full rounded-md border px-3 py-2 bg-transparent"
                placeholder="Alex Rivera"
              />
            </label>
          </div>

          <div className="p-4 rounded-2xl border">
            <div className="font-medium mb-2">Detections</div>
            {boxes.length === 0 ? (
              <div className="text-sm text-neutral-500">No detections yet. Upload a photo and run **Detect Safety Gear**.</div>
            ) : (
              <ul className="text-sm space-y-1 max-h-64 overflow-auto">
                {boxes.map((b, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="capitalize">{b.class.replaceAll("-", " ")}</span>
                    <span className="opacity-70">{(b.confidence * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}