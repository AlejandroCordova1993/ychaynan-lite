import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import rubric from '../../../rubric-v1.json';
import { Notice } from '../../components/layout/Notice';
import { PageHeader } from '../../components/layout/PageHeader';
import { getDraftAssessment, saveAssessmentDraft } from '../../lib/api/assessments';
import { getSupabaseClient } from '../../lib/supabase/client';
import { assessmentDraftSchema, type AssessmentDraftInput } from './assessmentSchemas';

const CORE_CRITERIA = rubric.coreCriteria.map(({ id, label }) => ({ id, label }));
const OPTIONAL_MODULES = rubric.optionalModules
  .filter(({ id }) => rubric.activeOptionalModules.includes(id))
  .map(({ id, label }) => ({ id, label }));

const DEFAULT_CRITERIA = ['core.pertinencia', 'core.comprension_explicita'];

function emptyQuestion(position: number): AssessmentDraftInput['questions'][number] {
  return {
    position,
    prompt: '',
    instructions: '',
    suggestedMinWords: null,
    suggestedMaxWords: null,
    activeCriteria: [...DEFAULT_CRITERIA],
    activeModules: [],
    curriculumLinks: {},
  };
}

const EMPTY_DRAFT: AssessmentDraftInput = {
  title: '',
  purpose: '',
  readingText: '',
  generalInstructions: '',
  opensAt: null,
  closesAt: null,
  pastePolicy: 'discourage',
  curriculumVersion: null,
  questions: [emptyQuestion(1)],
};

function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field__error">
      {message}
    </p>
  );
}

export function AssessmentEditorScreen() {
  const client = getSupabaseClient();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AssessmentDraftInput>({
    resolver: zodResolver(assessmentDraftSchema),
    defaultValues: EMPTY_DRAFT,
    mode: 'onSubmit',
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });

  useEffect(() => {
    getDraftAssessment(client)
      .then((draft) => {
        if (draft) reset(draft);
      })
      .catch((error: unknown) => {
        console.error(error);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
    // El cliente es un singleton estable y reset pertenece a React Hook Form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fields.forEach((_, index) => setValue(`questions.${index}.position`, index + 1));
  }, [fields, setValue]);

  const onSubmit = async (input: AssessmentDraftInput) => {
    setSaveError(false);
    setSaved(false);
    try {
      const assessmentId = await saveAssessmentDraft(client, input);
      setValue('id', assessmentId);
      setSaved(true);
    } catch (error) {
      console.error(error);
      setSaveError(true);
    }
  };

  return (
    <div className="assessment-editor stack--loose stack">
      <PageHeader
        eyebrow="Diagnóstico · preparación"
        title="Crear evaluación"
        lead="Carga una lectura corta y formula hasta cuatro preguntas. El borrador permanece privado hasta que decidas abrirlo."
      />

      {loading && (
        <p role="status" className="loading">
          Recuperando borrador…
        </p>
      )}
      {loadError && (
        <Notice tone="warning">
          No pudimos recuperar un borrador anterior. Puedes empezar uno nuevo y volver a guardar.
        </Notice>
      )}
      {saveError && (
        <Notice tone="error">
          No pudimos guardar el borrador. Tus cambios siguen en esta pantalla.
        </Notice>
      )}
      {saved && (
        <Notice tone="success">Borrador guardado. Aún no está visible para estudiantes.</Notice>
      )}
      {Object.keys(errors).length > 0 && (
        <Notice tone="error">Revisa los campos señalados antes de guardar.</Notice>
      )}

      <form className="assessment-form stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        <section className="assessment-section" aria-labelledby="datos-evaluacion">
          <div className="assessment-section__heading">
            <p className="mono-label">01 · Contexto</p>
            <div>
              <h2 id="datos-evaluacion">Lectura y propósito</h2>
              <p>Estos datos enmarcan la respuesta y la evaluación diagnóstica.</p>
            </div>
          </div>

          <div className="assessment-section__body form">
            <div className="field">
              <label htmlFor="assessment-title">Título</label>
              <input
                id="assessment-title"
                className="input"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'assessment-title-error' : undefined}
                {...register('title')}
              />
              <FieldError id="assessment-title-error" message={errors.title?.message} />
            </div>

            <div className="field">
              <label htmlFor="assessment-purpose">Propósito diagnóstico</label>
              <textarea
                id="assessment-purpose"
                className="input assessment-textarea assessment-textarea--short"
                aria-invalid={Boolean(errors.purpose)}
                aria-describedby={errors.purpose ? 'assessment-purpose-error' : undefined}
                {...register('purpose')}
              />
              <FieldError id="assessment-purpose-error" message={errors.purpose?.message} />
            </div>

            <div className="field">
              <label htmlFor="assessment-reading">Lectura</label>
              <textarea
                id="assessment-reading"
                className="input assessment-textarea assessment-textarea--reading"
                aria-invalid={Boolean(errors.readingText)}
                aria-describedby={errors.readingText ? 'assessment-reading-error' : undefined}
                {...register('readingText')}
              />
              <p className="field__hint">Conservamos el texto tal como lo escribas o pegues.</p>
              <FieldError id="assessment-reading-error" message={errors.readingText?.message} />
            </div>

            <div className="field">
              <label htmlFor="assessment-instructions">Instrucciones generales</label>
              <textarea
                id="assessment-instructions"
                className="input assessment-textarea assessment-textarea--short"
                {...register('generalInstructions')}
              />
            </div>
          </div>
        </section>

        <section className="assessment-section" aria-labelledby="configuracion-evaluacion">
          <div className="assessment-section__heading">
            <p className="mono-label">02 · Aplicación</p>
            <div>
              <h2 id="configuracion-evaluacion">Condiciones</h2>
              <p>Puedes dejar las fechas vacías y decidir la apertura más adelante.</p>
            </div>
          </div>

          <div className="assessment-section__body assessment-fields-grid">
            <div className="field">
              <label htmlFor="assessment-opens">Inicio previsto</label>
              <Controller
                control={control}
                name="opensAt"
                render={({ field }) => (
                  <input
                    id="assessment-opens"
                    type="datetime-local"
                    className="input"
                    value={toDateTimeLocal(field.value)}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(fromDateTimeLocal(event.target.value))}
                  />
                )}
              />
            </div>

            <div className="field">
              <label htmlFor="assessment-closes">Cierre previsto</label>
              <Controller
                control={control}
                name="closesAt"
                render={({ field }) => (
                  <input
                    id="assessment-closes"
                    type="datetime-local"
                    className="input"
                    aria-invalid={Boolean(errors.closesAt)}
                    value={toDateTimeLocal(field.value)}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(fromDateTimeLocal(event.target.value))}
                  />
                )}
              />
              <FieldError id="assessment-closes-error" message={errors.closesAt?.message} />
            </div>

            <div className="field">
              <label htmlFor="assessment-curriculum">Referencia curricular</label>
              <input
                id="assessment-curriculum"
                className="input"
                placeholder="Currículo priorizado BGU"
                {...register('curriculumVersion', {
                  setValueAs: (value: unknown) =>
                    typeof value === 'string' && value.trim() ? value.trim() : null,
                })}
              />
            </div>

            <div className="field">
              <label htmlFor="assessment-paste">Uso de pegar texto</label>
              <select id="assessment-paste" className="select" {...register('pastePolicy')}>
                <option value="discourage">Desaconsejar</option>
                <option value="allow">Permitir</option>
              </select>
            </div>
          </div>
        </section>

        <section className="assessment-section" aria-labelledby="preguntas-evaluacion">
          <div className="assessment-section__heading">
            <p className="mono-label">03 · Respuesta</p>
            <div>
              <h2 id="preguntas-evaluacion">Preguntas</h2>
              <p>Selecciona los criterios que después orientarán tu análisis docente.</p>
            </div>
          </div>

          <div className="assessment-section__body stack">
            {fields.map((field, index) => {
              const questionErrors = errors.questions?.[index];
              const questionNumber = index + 1;
              return (
                <fieldset
                  key={field.id}
                  className="question-editor stack"
                  aria-label={`Pregunta ${questionNumber}`}
                >
                  <legend className="question-editor__legend">
                    <span>Pregunta {questionNumber}</span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        className="button button--quiet question-editor__remove"
                        aria-label={`Eliminar pregunta ${questionNumber}`}
                        onClick={() => remove(index)}
                      >
                        Eliminar
                      </button>
                    )}
                  </legend>

                  <input
                    type="hidden"
                    {...register(`questions.${index}.position`, { valueAsNumber: true })}
                  />

                  <div className="field">
                    <label htmlFor={`question-${index}-prompt`}>Pregunta {questionNumber}</label>
                    <textarea
                      id={`question-${index}-prompt`}
                      className="input assessment-textarea assessment-textarea--question"
                      aria-invalid={Boolean(questionErrors?.prompt)}
                      aria-describedby={
                        questionErrors?.prompt ? `question-${index}-prompt-error` : undefined
                      }
                      {...register(`questions.${index}.prompt`)}
                    />
                    <FieldError
                      id={`question-${index}-prompt-error`}
                      message={questionErrors?.prompt?.message}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor={`question-${index}-instructions`}>
                      Indicaciones específicas
                    </label>
                    <textarea
                      id={`question-${index}-instructions`}
                      className="input assessment-textarea assessment-textarea--short"
                      {...register(`questions.${index}.instructions`)}
                    />
                  </div>

                  <div className="assessment-fields-grid assessment-fields-grid--words">
                    <div className="field">
                      <label htmlFor={`question-${index}-minimum`}>Mínimo sugerido</label>
                      <Controller
                        control={control}
                        name={`questions.${index}.suggestedMinWords`}
                        render={({ field: numberField }) => (
                          <input
                            id={`question-${index}-minimum`}
                            type="number"
                            min="0"
                            className="input"
                            value={numberField.value ?? ''}
                            onBlur={numberField.onBlur}
                            onChange={(event) =>
                              numberField.onChange(
                                event.target.value === '' ? null : Number(event.target.value),
                              )
                            }
                          />
                        )}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`question-${index}-maximum`}>Máximo sugerido</label>
                      <Controller
                        control={control}
                        name={`questions.${index}.suggestedMaxWords`}
                        render={({ field: numberField }) => (
                          <input
                            id={`question-${index}-maximum`}
                            type="number"
                            min="1"
                            className="input"
                            aria-invalid={Boolean(questionErrors?.suggestedMaxWords)}
                            value={numberField.value ?? ''}
                            onBlur={numberField.onBlur}
                            onChange={(event) =>
                              numberField.onChange(
                                event.target.value === '' ? null : Number(event.target.value),
                              )
                            }
                          />
                        )}
                      />
                    </div>
                  </div>

                  <details className="criteria-panel">
                    <summary>Criterios de análisis</summary>
                    <fieldset className="criteria-panel__group">
                      <legend>Criterios principales</legend>
                      <div className="criteria-grid">
                        {CORE_CRITERIA.map((criterion) => (
                          <label key={criterion.id} className="check-row">
                            <input
                              type="checkbox"
                              className="checkbox"
                              value={criterion.id}
                              {...register(`questions.${index}.activeCriteria`)}
                            />
                            <span>{criterion.label}</span>
                          </label>
                        ))}
                      </div>
                      <FieldError
                        id={`question-${index}-criteria-error`}
                        message={questionErrors?.activeCriteria?.message}
                      />
                    </fieldset>

                    <fieldset className="criteria-panel__group">
                      <legend>Módulos opcionales</legend>
                      <div className="criteria-grid">
                        {OPTIONAL_MODULES.map((module) => (
                          <label key={module.id} className="check-row">
                            <input
                              type="checkbox"
                              className="checkbox"
                              value={module.id}
                              {...register(`questions.${index}.activeModules`)}
                            />
                            <span>{module.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </details>
                </fieldset>
              );
            })}

            <button
              type="button"
              className="button button--secondary assessment-add-question"
              disabled={fields.length >= 4}
              onClick={() => append(emptyQuestion(fields.length + 1))}
            >
              Añadir pregunta
            </button>
          </div>
        </section>

        <div className="assessment-actions">
          <p>
            {fields.length} de 4 {fields.length === 1 ? 'pregunta' : 'preguntas'}
          </p>
          <button
            type="submit"
            className="button button--primary"
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? 'Guardando…' : 'Guardar borrador'}
          </button>
        </div>
      </form>
    </div>
  );
}
