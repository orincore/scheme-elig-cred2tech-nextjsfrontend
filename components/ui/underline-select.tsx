'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type Option = string | { value: string; label: string };

interface UnderlineSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Cred2Tech underline-style dropdown — a borderless select that uses the same
 * bottom-border + indigo focus treatment as the registration form fields.
 * Ported from the Cred2Tech WebApp CustomDropdown.
 */
export function UnderlineSelect({
  value,
  onChange,
  options,
  placeholder,
  hasError,
  disabled,
  className = '',
}: UnderlineSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedLabel = (() => {
    const match = options.find((o) => (typeof o === 'object' ? o.value : o) === value);
    if (!match) return '';
    return typeof match === 'object' ? match.label : match;
  })();

  return (
    <div className={`relative w-full ${className}`} ref={ref}>
      <div
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((o) => !o);
          }
        }}
        className={`flex items-center justify-between w-full pb-3 border-b bg-transparent outline-none text-[#0a1628] dark:text-[#e6edf7] text-[15px] font-semibold cursor-pointer transition-colors ${
          hasError
            ? 'border-red-500'
            : 'border-gray-200 dark:border-gray-700 focus-within:border-indigo-600 dark:focus-within:border-indigo-400'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <span className={!value ? 'text-black dark:text-[#94a3b8]/60' : ''}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          className={`h-[18px] w-[18px] text-[#4a5d73] dark:text-[#94a3b8] transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full min-w-[120px] top-[calc(100%+4px)] left-0 bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-800 rounded-lg shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
          {options.map((opt, idx) => {
            const optValue = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            const isSelected = value === optValue;
            return (
              <div
                key={`${optValue}-${idx}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(optValue);
                  setIsOpen(false);
                }}
                className={`px-4 py-2.5 text-[14px] cursor-pointer transition-colors truncate ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-[#4a5d73] dark:text-[#e6edf7] hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {optLabel}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default UnderlineSelect;
