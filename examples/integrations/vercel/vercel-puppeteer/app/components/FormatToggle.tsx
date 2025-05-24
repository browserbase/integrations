import { type ExportFormat } from "./UrlExporter";

interface FormatToggleProps {
  value: ExportFormat;
  onChange: (format: ExportFormat) => void;
}

const FormatToggle: React.FC<FormatToggleProps> = ({ value, onChange }) => {
  const formats: ExportFormat[] = ["html", "screenshot"];

  return (
    <div className="flex w-full sm:w-auto border border-black/[.08] h-10">
      {formats.map((format) => (
        <button
          key={format}
          onClick={() => onChange(format)}
          className={`
            flex-1 px-4 py-1.5 text-sm font-medium transition-colors
            ${
              value === format
                ? "bg-foreground text-background"
                : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
            }
          `}
        >
          {format.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default FormatToggle;
