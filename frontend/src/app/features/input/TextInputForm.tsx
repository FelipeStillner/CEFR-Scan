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
    <section className="panel panel--input scan-pane">
      <h2 className="pane-heading">Your text</h2>
      <p className="hint pane-hint">
        Paste a paragraph in English. Then choose the level you are studying at — words above that level will be suggested after you run the scan.
      </p>
      <label className="field field--fill">
        <span className="label">Paragraph</span>
        <textarea
          className="textarea-grow"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          rows={8}
          placeholder="Paste or type your English text here…"
          required
        />
      </label>

      <label className="field">
        <span className="label">Target level</span>
        <select value={level} onChange={(e) => onLevelChange(e.target.value as EnglishLevel)} required>
          <option value="Beginner">Beginner (A1–A2)</option>
          <option value="Intermediary">Intermediate (B1–B2)</option>
          <option value="Advanced">Advanced (C1–C2)</option>
        </select>
      </label>

      <div className="flow-actions">
        {!!text.trim() && !isScanning && (
          <button type="button" className="button" onClick={onStartScan}>
            Run scan
          </button>
        )}
      </div>

      <p className="status" aria-live="polite">
        {isScanning ? "Scanning your text…" : scanStatus}
      </p>
    </section>
  );
}
