import type { SubmissionEvaluationView } from '../../lib/api/evaluations';
import type { TeacherAdjustment } from '../../lib/api/evaluationReview';
import { CriterionReviewRow } from './CriterionReviewRow';

type QuestionResult = NonNullable<SubmissionEvaluationView['result']>['questionResults'][number];

interface QuestionReviewFieldsetProps {
  question: QuestionResult;
  changes: readonly TeacherAdjustment[];
  disabled: boolean;
  final: boolean;
  labels: ReadonlyMap<string, string>;
  onChange: (item: TeacherAdjustment) => void;
}

/** Agrupa, por pregunta, la revisión de cada criterio y módulo activo. */
export function QuestionReviewFieldset({
  question,
  changes,
  disabled,
  final,
  labels,
  onChange,
}: QuestionReviewFieldsetProps) {
  return (
    <fieldset className="stack" disabled={disabled}>
      <legend>Pregunta {question.position}: niveles finales</legend>
      {[...question.criteria, ...question.modules].map((criterion) => {
        const id = 'criterionId' in criterion ? criterion.criterionId : criterion.moduleId;
        const adjustment = changes.find(
          (item) => item.position === question.position && item.id === id,
        );
        const current = adjustment ?? {
          position: question.position,
          id,
          level: criterion.level,
          reason: criterion.reason,
        };
        return (
          <CriterionReviewRow
            key={id}
            label={labels.get(id) ?? id}
            aiLevel={criterion.level}
            current={current}
            adjusted={Boolean(adjustment)}
            final={final}
            onChange={onChange}
            onEdit={onChange}
          />
        );
      })}
    </fieldset>
  );
}
