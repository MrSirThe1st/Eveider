'use client';

import { colors, radius, spacing, typography, borderSubtle } from '@eveider/config-ui';
import type { CSSProperties, ReactNode } from 'react';
import { Button } from './button.js';
import { Card } from './card.js';

export type WizardStep = {
  id: string;
  title: string;
  description?: string;
};

export type WizardOrientation = 'horizontal' | 'vertical';

export type WizardProps = {
  steps: WizardStep[];
  /** Zero-based index of the active step. */
  currentStepIndex: number;
  children: ReactNode;
  /** Go to previous step. Hidden on first step. */
  onBack?: () => void;
  /** Validate + advance. Hidden on last step. */
  onNext?: () => void | Promise<void>;
  /** Final submit on last step. */
  onSubmit?: () => void | Promise<void>;
  backLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
  loading?: boolean;
  /** Disable Next / Submit (e.g. while validating). */
  nextDisabled?: boolean;
  /** Allow clicking earlier completed steps in the stepper. */
  onStepSelect?: (index: number) => void;
  /** Horizontal chips (default) or vertical sidebar stepper. */
  orientation?: WizardOrientation;
  className?: string;
  style?: CSSProperties;
};

function clampIndex(index: number, length: number) {
  return Math.max(0, Math.min(index, length - 1));
}

function StepCheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Full-page multi-step wizard chrome: stepper, step title, content, Back/Next/Submit.
 * Parent owns state, validation, and persistence across steps.
 */
export function Wizard({
  steps,
  currentStepIndex,
  children,
  onBack,
  onNext,
  onSubmit,
  backLabel = 'Retour',
  nextLabel = 'Continuer',
  submitLabel = 'Confirmer',
  loading = false,
  nextDisabled = false,
  onStepSelect,
  orientation = 'horizontal',
  className,
  style,
}: WizardProps) {
  const index = clampIndex(currentStepIndex, steps.length);
  const step = steps[index]!;
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const progress = ((index + 1) / steps.length) * 100;
  const isVertical = orientation === 'vertical';

  const footer = (
    <footer
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing[3],
        flexWrap: 'wrap',
        marginTop: spacing[8],
        paddingTop: spacing[5],
        borderTop: borderSubtle(),
      }}
    >
      <div>
        {!isFirst && onBack ? (
          <Button variant="secondary" onClick={onBack} disabled={loading}>
            {backLabel}
          </Button>
        ) : (
          <span />
        )}
      </div>
      <div style={{ display: 'flex', gap: spacing[2] }}>
        {isLast ? (
          <Button
            variant="primary"
            loading={loading}
            disabled={nextDisabled || loading}
            onClick={() => void onSubmit?.()}
          >
            {submitLabel}
          </Button>
        ) : (
          <Button
            variant="primary"
            loading={loading}
            disabled={nextDisabled || loading}
            onClick={() => void onNext?.()}
          >
            {nextLabel}
          </Button>
        )}
      </div>
    </footer>
  );

  const stepHeader = (
    <header style={{ marginBottom: spacing[6] }}>
      <p
        style={{
          margin: 0,
          fontSize: typography.caption.fontSize,
          fontWeight: typography.weights.semibold,
          color: colors.textMuted,
        }}
      >
        Étape {index + 1} sur {steps.length}
      </p>
      <h2
        style={{
          margin: `${spacing[1]}px 0 0`,
          fontSize: typography.sectionTitle.fontSize,
          fontWeight: typography.sectionTitle.fontWeight,
          lineHeight: typography.sectionTitle.lineHeight,
          color: colors.secondary,
        }}
      >
        {step.title}
      </h2>
      {step.description ? (
        <p
          style={{
            margin: `${spacing[2]}px 0 0`,
            fontSize: typography.bodySm.fontSize,
            fontWeight: typography.bodySm.fontWeight,
            lineHeight: typography.bodySm.lineHeight,
            color: colors.textMuted,
            maxWidth: 560,
          }}
        >
          {step.description}
        </p>
      ) : null}
    </header>
  );

  if (isVertical) {
    return (
      <div
        className={['nb-wizard', 'nb-wizard--vertical', className].filter(Boolean).join(' ')}
        style={{ width: '100%', ...style }}
      >
        <Card padding="none" style={{ overflow: 'hidden' }}>
          <div className="nb-wizard__layout">
            <aside className="nb-wizard__rail" aria-label="Progression">
              <WizardStepper
                steps={steps}
                currentStepIndex={index}
                onStepSelect={onStepSelect}
                orientation="vertical"
              />
            </aside>

            <div className="nb-wizard__panel">
              {stepHeader}
              <div>{children}</div>
              {footer}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={['nb-wizard', className].filter(Boolean).join(' ')}
      style={{ width: '100%', ...style }}
    >
      <WizardStepper
        steps={steps}
        currentStepIndex={index}
        onStepSelect={onStepSelect}
        orientation="horizontal"
      />

      <div
        aria-hidden
        style={{
          height: 4,
          borderRadius: radius.badge,
          background: colors.surfaceMuted,
          marginBottom: spacing[6],
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: colors.primary,
            transition: 'width 0.2s ease',
          }}
        />
      </div>

      <Card padding="lg">
        {stepHeader}
        <div>{children}</div>
        {footer}
      </Card>
    </div>
  );
}

export type WizardStepperProps = {
  steps: WizardStep[];
  currentStepIndex: number;
  onStepSelect?: (index: number) => void;
  orientation?: WizardOrientation;
};

export function WizardStepper({
  steps,
  currentStepIndex,
  onStepSelect,
  orientation = 'horizontal',
}: WizardStepperProps) {
  const index = clampIndex(currentStepIndex, steps.length);

  if (orientation === 'vertical') {
    return (
      <nav aria-label="Progression du wizard">
        <ol
          style={{
            display: 'flex',
            flexDirection: 'column',
            margin: 0,
            padding: 0,
            listStyle: 'none',
            gap: 0,
          }}
        >
          {steps.map((step, stepIndex) => {
            const isCurrent = stepIndex === index;
            const isComplete = stepIndex < index;
            const canSelect = Boolean(onStepSelect) && isComplete;
            const isLast = stepIndex === steps.length - 1;

            return (
              <li key={step.id} style={{ display: 'flex', gap: spacing[3], minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: 28,
                    flexShrink: 0,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: '0.75rem',
                      fontWeight: typography.weights.semibold,
                      fontFamily: typography.fontFamily,
                      ...(isComplete
                        ? {
                            background: colors.successMuted,
                            color: colors.successFg,
                            border: `1.5px solid ${colors.success}`,
                          }
                        : isCurrent
                          ? {
                              background: colors.secondary,
                              color: colors.background,
                              border: `1.5px solid ${colors.secondary}`,
                            }
                          : {
                              background: 'transparent',
                              color: colors.textMuted,
                              border: `1.5px solid ${colors.border}`,
                            }),
                    }}
                  >
                    {isComplete ? <StepCheckIcon /> : stepIndex + 1}
                  </span>
                  {!isLast ? (
                    <span
                      aria-hidden
                      style={{
                        width: 1,
                        flex: 1,
                        minHeight: 20,
                        marginTop: 4,
                        marginBottom: 4,
                        background: isComplete ? colors.success : colors.borderSubtle,
                      }}
                    />
                  ) : null}
                </div>

                <button
                  type="button"
                  disabled={!canSelect}
                  onClick={() => onStepSelect?.(stepIndex)}
                  aria-current={isCurrent ? 'step' : undefined}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'left',
                    padding: `6px 0 ${isLast ? 0 : spacing[5]}px`,
                    border: 'none',
                    background: 'transparent',
                    cursor: canSelect ? 'pointer' : 'default',
                    fontFamily: typography.fontFamily,
                    color: isCurrent
                      ? colors.secondary
                      : isComplete
                        ? colors.successFg
                        : colors.textMuted,
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: typography.bodySm.fontSize,
                      fontWeight: isCurrent
                        ? typography.weights.semibold
                        : typography.weights.medium,
                      lineHeight: 1.3,
                    }}
                  >
                    {step.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Progression du wizard" style={{ marginBottom: spacing[4] }}>
      <ol
        style={{
          display: 'flex',
          gap: spacing[2],
          margin: 0,
          padding: 0,
          listStyle: 'none',
          flexWrap: 'wrap',
        }}
      >
        {steps.map((step, stepIndex) => {
          const isCurrent = stepIndex === index;
          const isComplete = stepIndex < index;
          const canSelect = Boolean(onStepSelect) && isComplete;

          return (
            <li key={step.id} style={{ flex: '1 1 120px', minWidth: 0 }}>
              <button
                type="button"
                disabled={!canSelect}
                onClick={() => onStepSelect?.(stepIndex)}
                aria-current={isCurrent ? 'step' : undefined}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: `${spacing[2] + 2}px ${spacing[3]}px`,
                  borderRadius: radius.md,
                  border: borderSubtle(),
                  background: isCurrent
                    ? colors.secondary
                    : isComplete
                      ? colors.successMuted
                      : colors.surfaceMuted,
                  color: isCurrent
                    ? colors.background
                    : isComplete
                      ? colors.successFg
                      : colors.textMuted,
                  cursor: canSelect ? 'pointer' : 'default',
                  fontFamily: typography.fontFamily,
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontSize: typography.caption.fontSize,
                    fontWeight: typography.weights.semibold,
                    opacity: 0.8,
                  }}
                >
                  {stepIndex + 1}/{steps.length}
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: 2,
                    fontSize: typography.bodySm.fontSize,
                    fontWeight: typography.weights.semibold,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {step.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
