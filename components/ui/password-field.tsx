'use client';

import * as React from 'react';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { UnderlineField } from '@/components/ui/underline-field';

export interface PasswordFieldProps {
  label?: string;
  value: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  name?: string;
  required?: boolean;
  autoComplete?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Cred2Tech password field — an UnderlineField with a built-in show/hide eye.
 */
export function PasswordField({
  label = 'Password',
  value,
  onChange,
  onBlur,
  error,
  placeholder = '••••••••',
  name,
  required,
  autoComplete,
  className,
  onKeyDown,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <UnderlineField
      label={label}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      error={error}
      placeholder={placeholder}
      name={name}
      required={required}
      autoComplete={autoComplete}
      className={className}
      rightSlot={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="text-[#4a5d73] dark:text-[#94a3b8] hover:text-indigo-600 transition-colors bg-transparent border-0 flex cursor-pointer"
        >
          {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      }
    />
  );
}

export default PasswordField;
