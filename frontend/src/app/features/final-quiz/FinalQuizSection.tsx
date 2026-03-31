import { QuizPanel } from "@/app/components/QuizPanel";
import type { QuizQuestion, QuizState } from "@/app/types/workflow";

const QUIZ_SECTION_TITLE = "Mixed skills quiz";

type FinalQuizSectionProps = {
  text: string;
  isGeneratingQuizTwo: boolean;
  quizTwoStatus: string;
  quizTwoQuestions: QuizQuestion[];
  quizTwo: QuizState;
  onRetryGenerate: () => void;
  onChoose: (idx: number) => void;
  onSkip: () => void;
  onNext: () => void;
};

export function FinalQuizSection({
  text,
  isGeneratingQuizTwo,
  quizTwoStatus,
  quizTwoQuestions,
  quizTwo,
  onRetryGenerate,
  onChoose,
  onSkip,
  onNext,
}: FinalQuizSectionProps) {
  return (
    <>
      {isGeneratingQuizTwo && (
        <section className="panel scan-pane">
          <h2 className="pane-heading">{QUIZ_SECTION_TITLE}</h2>
          <p className="muted">Building questions from your text and word list…</p>
        </section>
      )}

      {!isGeneratingQuizTwo && quizTwoStatus && (
        <section className="panel scan-pane">
          <h2 className="pane-heading">{QUIZ_SECTION_TITLE}</h2>
          <p className="def-status def-error" role="alert">
            {quizTwoStatus}
          </p>
          <div className="flow-actions">
            <button type="button" className="button" onClick={onRetryGenerate}>
              Generate again
            </button>
          </div>
        </section>
      )}

      {!isGeneratingQuizTwo && !quizTwoStatus && quizTwoQuestions.length > 0 && (
        <QuizPanel
          title={QUIZ_SECTION_TITLE}
          showText={true}
          text={text}
          questions={quizTwoQuestions}
          quizState={quizTwo}
          onChoose={onChoose}
          onSkip={onSkip}
          onNext={onNext}
        />
      )}
    </>
  );
}
