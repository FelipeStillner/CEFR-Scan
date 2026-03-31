import { QuizPanel } from "@/app/components/QuizPanel";
import type { QuizQuestion, QuizState } from "@/app/types/workflow";

const QUIZ_SECTION_TITLE = "Vocabulary quiz";

type GeneratedQuizSectionProps = {
  text: string;
  isGeneratingQuizOne: boolean;
  quizOneStatus: string;
  quizOneQuestions: QuizQuestion[];
  quizOne: QuizState;
  onRetryGenerate: () => void;
  onChoose: (idx: number) => void;
  onSkip: () => void;
  onNext: () => void;
};

export function GeneratedQuizSection({
  text,
  isGeneratingQuizOne,
  quizOneStatus,
  quizOneQuestions,
  quizOne,
  onRetryGenerate,
  onChoose,
  onSkip,
  onNext,
}: GeneratedQuizSectionProps) {
  return (
    <>
      {isGeneratingQuizOne && (
        <section className="panel scan-pane">
          <h2 className="pane-heading">{QUIZ_SECTION_TITLE}</h2>
          <p className="muted">Building questions from your text and word list…</p>
        </section>
      )}

      {!isGeneratingQuizOne && quizOneStatus && (
        <section className="panel scan-pane">
          <h2 className="pane-heading">{QUIZ_SECTION_TITLE}</h2>
          <p className="def-status def-error" role="alert">
            {quizOneStatus}
          </p>
          <div className="flow-actions">
            <button type="button" className="button" onClick={onRetryGenerate}>
              Generate again
            </button>
          </div>
        </section>
      )}

      {!isGeneratingQuizOne && !quizOneStatus && quizOneQuestions.length > 0 && (
        <QuizPanel
          title={QUIZ_SECTION_TITLE}
          showText={true}
          text={text}
          questions={quizOneQuestions}
          quizState={quizOne}
          onChoose={onChoose}
          onSkip={onSkip}
          onNext={onNext}
        />
      )}
    </>
  );
}
