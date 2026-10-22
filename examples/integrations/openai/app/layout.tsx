import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Give your agent access to the whole web",
  description: "A voice agent and a browser agent share one live session, so what the agent says stays in sync with what it does."
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
