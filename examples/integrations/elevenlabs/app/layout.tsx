import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ElevenLabs + Browserbase",
  description: "Prototype showing a voice agent and a Browserbase-backed browser agent sharing the same run state."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
