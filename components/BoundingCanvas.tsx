"use client";
import { useEffect, useRef } from "react";
import type { BoundingBox } from "@/lib/types";

interface BoundingCanvasProps {
  imgRef: React.RefObject<HTMLImageElement>;
  boxes: BoundingBox[];
}

export default function BoundingCanvas({ imgRef, boxes }: BoundingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = img.offsetWidth;
    canvas.height = img.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bounding boxes
    boxes.forEach((box) => {
      const { x, y, width, height, class: className, confidence } = box;
      
      // Calculate actual coordinates based on image display size
      const scaleX = canvas.width / img.naturalWidth;
      const scaleY = canvas.height / img.naturalHeight;
      
      const actualX = x * scaleX;
      const actualY = y * scaleY;
      const actualWidth = width * scaleX;
      const actualHeight = height * scaleY;

      // Set color based on class
      let color = "#8b5cf6"; // default purple
      if (className.toLowerCase().includes("no-helmet")) color = "#ef4444"; // red
      if (className.toLowerCase().includes("no-vest")) color = "#f97316"; // orange
      if (className.toLowerCase().includes("helmet") && !className.toLowerCase().includes("no-")) color = "#06b6d4"; // cyan
      if (className.toLowerCase().includes("vest") && !className.toLowerCase().includes("no-")) color = "#10b981"; // green

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(actualX, actualY, actualWidth, actualHeight);

      // Draw label background
      const label = `${className} (${(confidence * 100).toFixed(1)}%)`;
      const textMetrics = ctx.measureText(label);
      const labelWidth = textMetrics.width + 16;
      const labelHeight = 24;

      ctx.fillStyle = color;
      ctx.fillRect(actualX, actualY - labelHeight, labelWidth, labelHeight);

      // Draw label text
      ctx.fillStyle = "white";
      ctx.font = "12px system-ui, -apple-system, sans-serif";
      ctx.fillText(label, actualX + 8, actualY - 6);
    });
  }, [boxes, imgRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
