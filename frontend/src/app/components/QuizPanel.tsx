import type { QuizQuestion, QuizState } from "@/app/types/workflow";

type QuizPanelProps = {
  title: string;
  showText: boolean;
  text: string;
  questions: QuizQuestion[];
  quizState: QuizState;
  onChoose: (index: number) => void;
  onSkip: () => void;
  onNext: () => void;
};

export function QuizPanel({
  title,
  showText,
  text,
  questions,
  quizState,
  onChoose,
  onSkip,
  onNext,
}: QuizPanelProps) {
  const done = quizState.index >= questions.length;

  if (!questions.length) {
    return (
      <section className="panel scan-pane">
        <h2 className="pane-heading">{title}</h2>
        <p className="muted">No questions available.</p>
      </section>
    );
  }

  if (done) {
    return (
      <section className="panel scan-pane">
        <h2 className="pane-heading">{title}</h2>
        <p className="quiz-score">
          Score: {quizState.score}/{questions.length}
        </p>
        <p className="muted">Quiz complete.</p>
      </section>
    );
  }

  const q = questions[quizState.index];

  return (
    <div className="scan-split">
      {showText && (
        <section className="panel scan-pane">
          <h2 className="pane-heading">Text</h2>
          <p className="text-block preview" lang="en">
            {text}
          </p>
        </section>
      )}

      <section className="panel scan-pane">
        <h2 className="pane-heading">{title}</h2>
        <p className="quiz-score">
          Score: {quizState.score}/{questions.length}
        </p>
        <p className="quiz-progress">
          Question {quizState.index + 1}/{questions.length}
        </p>

        <p className="quiz-prompt">{q.prompt}</p>

        <div className="quiz-options" role="list">
          {q.options.map((opt, idx) => {
            const isSelected = quizState.selectedIndex === idx;
            const isCorrect = idx === q.answerIndex;
            const showResult = quizState.answered;
            let cls = "quiz-option";
            if (showResult && isCorrect) cls += " quiz-option-correct";
            if (showResult && isSelected && !isCorrect) cls += " quiz-option-wrong";

            return (
              <button
                key={opt}
                type="button"
                className={cls}
                disabled={quizState.answered}
                onClick={() => onChoose(idx)}
              >
                {opt}
              </button>
            );
          })}
        </div>

        <div className="quiz-actions">
          {!quizState.answered && (
            <button type="button" className="button button-ghost" onClick={onSkip}>
              Skip
            </button>
          )}
          {quizState.answered && (
            <button type="button" className="button" onClick={onNext}>
              {quizState.index === questions.length - 1 ? "Finish quiz" : "Next question"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
