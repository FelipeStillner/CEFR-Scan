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
        <ol className="phase-tracker" aria-label="Scan steps">
          <li className={phase >= 1 ? "active" : ""}>1. Input</li>
          <li className={phase >= 2 ? "active" : ""}>2. Edit words</li>
          <li className={phase >= 3 ? "active" : ""}>3. Quiz 1</li>
          <li className={phase >= 4 ? "active" : ""}>4. Review</li>
          <li className={phase >= 5 ? "active" : ""}>5. Quiz 2</li>
        </ol>
      </div>
      <div className="scan-header-actions">
        {phase > 1 && (
          <button type="button" className="button button-ghost" onClick={onReset}>
            Start over
          </button>
        )}
      </div>
    </header>
  );
}
