"use client";

import { useState } from "react";
import ExportedContent from "./ExportedContent";
import FormatToggle from "./FormatToggle";
import ExistingUrl from './ExistingUrl';

export type ExportFormat = "html" | "screenshot";

const UrlExporter = () => {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<ExportFormat>("html");
  const [exportedContent, setExportedContent] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!url) {
      alert("Please enter a URL");
      return;
    }

    setLoading(true);
    setExportedContent("");

    try {
      const response = await fetch(`/api/${format}?url=${encodeURIComponent(url)}`, {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to export content");
      }

      if (format === "screenshot") {
        setExportedContent(url);
      } else {
        const data = await response.json();
        setExportedContent(data.html);
      }
    } catch (error) {
      alert((error as Error).message || "Failed to export content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full sm:max-w-4xl space-y-4 max-w-xs">
      {loading && (
        <div className="p-4 mb-4 text-sm bg-foreground/5 text-foreground/60">
          <p>
            Note: Some websites are computationally hard to load, which can lead
            to incomplete website loads.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-3">
        <div className="flex flex-col gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter URL to export"
            className="w-full px-4 py-2 border border-black/[.08] bg-transparent focus:outline-none focus:ring-2 focus:ring-foreground/20 h-10"
          />
          <ExistingUrl onSelect={setUrl} />
        </div>
        <FormatToggle value={format} onChange={setFormat} />
        <button
          onClick={handleExport}
          disabled={loading}
          className="w-full sm:w-auto border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] text-base h-10 px-5 disabled:opacity-50"
        >
          {loading ? "Exporting..." : "Export"}
        </button>
      </div>

      <ExportedContent content={exportedContent} format={format} />
    </div>
  );
};

export default UrlExporter;
