import Link from "next/link";
import type { Phase } from "@/app/types/workflow";
import { scanRoutes } from "@/app/helpers/scanRoutes";

type ScanStepNavProps = {
  phase: Phase;
  showNext?: boolean;
  canGoNext?: boolean;
};

export function ScanStepNav({ phase, showNext = true, canGoNext = true }: ScanStepNavProps) {
  const backHref =
    phase === 2
      ? scanRoutes.home
      : phase === 3
        ? scanRoutes.vocabulary
        : phase === 4
          ? scanRoutes.quiz
          : phase === 5
            ? scanRoutes.review
            : null;

  const nextHref =
    phase === 2
      ? scanRoutes.quiz
      : phase === 3
        ? scanRoutes.review
        : phase === 4
          ? scanRoutes.finalQuiz
          : null;

  return (
    <footer className="flow-nav panel">
      <div className="flow-nav-buttons">
        {backHref && (
          <Link href={backHref} className="button button-ghost">
            Previous
          </Link>
        )}

        {showNext && nextHref && (canGoNext ? (
          <Link href={nextHref} className="button">
            Continue
          </Link>
        ) : (
          <span className="button scan-step-next-disabled" aria-disabled>
            Continue
          </span>
        ))}
      </div>
    </footer>
  );
}
