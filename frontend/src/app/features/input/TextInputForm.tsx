import type { EnglishLevel } from "@/app/types/englishLevel";

type TextInputFormProps = {
  text: string;
  level: EnglishLevel;
  isScanning: boolean;
  scanStatus: string;
  onTextChange: (value: string) => void;
  onLevelChange: (level: EnglishLevel) => void;
  onStartScan: () => void;
};

export function TextInputForm({
  text,
  level,
  isScanning,
  scanStatus,
  onTextChange,
  onLevelChange,
  onStartScan,
}: TextInputFormProps) {
  return (
    <section className="panel">
      <h2 className="pane-heading">Paste text and run the scan</h2>
      <label className="field">
        <span className="label">English text</span>
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={10}
          placeholder="Paste an English paragraph here..."
          required
        />
      </label>

      <label className="field">
        <span className="label">English level</span>
        <select value={level} onChange={(e) => onLevelChange(e.target.value as EnglishLevel)} required>
          <option value="Beginner">Beginner</option>
          <option value="Intermediary">Intermediary</option>
          <option value="Advanced">Advanced</option>
        </select>
      </label>

      <div className="flow-actions">
        {!!text.trim() && !isScanning && (
          <button type="button" className="button" onClick={onStartScan}>
            Start scan
          </button>
        )}
      </div>

      <p className="status" aria-live="polite">
        {isScanning ? "Finding terms..." : scanStatus}
      </p>
    </section>
  );
}
