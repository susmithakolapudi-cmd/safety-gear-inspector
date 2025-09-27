"use client";
import { useCallback } from "react";
import { useAppStore } from "@/lib/store";

export default function Dropzone() {
  const { setFile } = useAppStore();

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setFile(files[0]);
    }
  }, [setFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setFile(files[0]);
    }
  }, [setFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div
      className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-12 text-center hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <div className="space-y-4">
        <div className="mx-auto w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>
        <div>
          <p className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
            Drop your image here
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            or click to browse files
          </p>
        </div>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Supports JPG, PNG, WebP up to 10MB
        </p>
      </div>
      <input
        id="file-input"
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
