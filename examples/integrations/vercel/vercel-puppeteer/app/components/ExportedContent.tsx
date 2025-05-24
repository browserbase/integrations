import React, { useState, useEffect } from "react";
import Image from "next/image";

interface ExportedContentProps {
  content: string;
  format?: "html" | "screenshot";
  loading?: boolean;
}

const ExportedContent: React.FC<ExportedContentProps> = ({
  content,
  format,
  loading,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!content) return null;

  if (format === "screenshot") {
    if (loading) {
      return (
        <div className="mt-8 flex justify-center items-center h-[800px] border border-black/[.08]">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full" />
            <p className="text-foreground/60">Generating Screenshot...</p>
          </div>
        </div>
      );
    }

    if (isMobile) {
      return (
        <div className="mt-8">
          <a
            href={`/api/screenshot?url=${encodeURIComponent(content)}`}
            download="export.png"
            className="w-full py-4 px-6 flex items-center justify-center bg-foreground text-background hover:bg-foreground/90 transition-colors rounded-lg"
          >
            Download Screenshot
          </a>
        </div>
      );
    }

    return (
      <div className="mt-8">
        <Image
          src={`/api/screenshot?url=${encodeURIComponent(content)}`}
          alt="Website Screenshot"
          width={1200}
          height={800}
          className="w-full border border-black/[.08]"
        />
      </div>
    );
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className="mt-8">
      <div
        className={`relative ${!isExpanded ? "max-h-[400px] overflow-hidden" : ""}`}
      >
        <div className="relative">
          <pre className="p-4 rounded-lg bg-black/[.03] dark:bg-white/[.03] font-mono text-sm overflow-x-auto">
            <code>{content}</code>
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 px-2 py-1 text-xs rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors"
          >
            {isCopied ? "Copied!" : "Copy"}
          </button>
        </div>
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-2 text-sm text-foreground/60 hover:text-foreground transition-colors"
      >
        {isExpanded ? "Show less" : "Extend to view all"}
      </button>
    </div>
  );
};

export default ExportedContent;
