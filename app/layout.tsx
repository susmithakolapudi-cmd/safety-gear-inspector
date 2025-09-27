import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safety Gear Inspector",
  description: "Detect helmets and vests (PPE) from site photos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {children}
      </body>
    </html>
  );
}
