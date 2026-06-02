'use client';

import * as React from 'react';

/** Shared Cred2Tech form classes — exported so bespoke fields can match exactly. */
export const fieldLabelClass = 'block text-[12px] text-[#4a5d73] dark:text-[#94a3b8] mb-1.5';

export const fieldWrapperClass = (hasError?: boolean, disabled?: boolean) =>
  `flex items-center pb-3 border-b transition-colors ${
    hasError
      ? 'border-red-500'
      : 'border-gray-200 dark:border-gray-700 focus-within:border-indigo-600 dark:focus-within:border-indigo-400'
  } ${disabled ? 'opacity-60' : ''}`;

export const fieldInputClass =
  'w-full bg-transparent border-0 outline-none text-[#0a1628] dark:text-[#e6edf7] text-[15px] font-semibold p-0 focus:ring-0 placeholder-gray-400 dark:placeholder-gray-600';

export interface UnderlineFieldProps {
  label?: string;
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  /** Element rendered at the right edge of the field (e.g. a toggle or spinner). */
  rightSlot?: React.ReactNode;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Cred2Tech underline text field — label + borderless input on a bottom border
 * that turns indigo on focus and red on error, with an optional right adornment.
 * The single building block behind every text input in the auth/onboarding flow.
 */
export function UnderlineField({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  type = 'text',
  name,
  required,
  disabled,
  readOnly,
  maxLength,
  inputMode,
  autoComplete,
  rightSlot,
  className = '',
  onKeyDown,
}: UnderlineFieldProps) {
  return (
    <div className={className}>
      {label && (
        <label className={fieldLabelClass}>
          {label}
          {required ? ' *' : ''}
        </label>
      )}
      <div className={fieldWrapperClass(!!error, disabled)}>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          className={`${fieldInputClass}${rightSlot ? ' pr-2' : ''}${readOnly ? ' cursor-default' : ''}`}
        />
        {rightSlot}
      </div>
      {error && <span className="text-[11px] text-red-500 mt-1.5 block">{error}</span>}
    </div>
  );
}

export default UnderlineField;
