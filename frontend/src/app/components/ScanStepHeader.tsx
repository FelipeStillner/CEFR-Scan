import type { Phase } from "@/app/types/workflow";
import { scanPhaseTitles } from "@/app/helpers/scanPhaseTitles";

type ScanStepHeaderProps = {
  phase: Phase;
  onReset: () => void;
};

export function ScanStepHeader({ phase, onReset }: ScanStepHeaderProps) {
  return (
    <header className="scan-header">
      <div className="scan-header-main">
        <h1 className="scan-title">CEFR Scan</h1>
        <p className="subtitle">{scanPhaseTitles[phase]}</p>
        <ol className="phase-tracker" aria-label="Steps">
          <li className={phase >= 1 ? "active" : ""}>1 · Text</li>
          <li className={phase >= 2 ? "active" : ""}>2 · Words</li>
          <li className={phase >= 3 ? "active" : ""}>3 · Quiz A</li>
          <li className={phase >= 4 ? "active" : ""}>4 · Review</li>
          <li className={phase >= 5 ? "active" : ""}>5 · Quiz B</li>
          <li className={phase >= 6 ? "active" : ""}>6 · Results</li>
        </ol>
      </div>
      <div className="scan-header-actions">
        {phase > 1 && (
          <button type="button" className="button button-ghost" onClick={onReset}>
            Start from the beginning
          </button>
        )}
      </div>
    </header>
  );
}
