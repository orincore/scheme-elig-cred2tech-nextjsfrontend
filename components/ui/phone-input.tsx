'use client';

import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { countries } from '@/lib/countries';

interface PhoneInputProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (digits: string) => void;
  onBlur?: () => void;
  error?: boolean;
  placeholder?: string;
  maxLength?: number;
}

/**
 * Cred2Tech phone field — a country dial-code dropdown (with search over the
 * full country list) glued to a digits-only number input, in the same
 * underline + indigo-focus style as the rest of the form.
 */
export function PhoneInput({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  onBlur,
  error,
  placeholder = '98765 43210',
  maxLength = 10,
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => countries.find((c) => c.dialCode === countryCode) || countries.find((c) => c.dialCode === '+91'),
    [countryCode],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 0);
    else setQuery('');
  }, [isOpen]);

  return (
    <div
      className={`flex items-center pb-3 border-b transition-colors ${
        error
          ? 'border-red-500'
          : 'border-gray-200 dark:border-gray-700 focus-within:border-indigo-600 dark:focus-within:border-indigo-400'
      }`}
    >
      {/* Country code dropdown */}
      <div className="relative shrink-0" ref={ref}>
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className="flex items-center gap-1 pr-2 text-[#0a1628] dark:text-[#e6edf7] text-[15px] font-semibold outline-none"
        >
          <span className="text-[17px] leading-none">{selected?.emoji}</span>
          <span>{selected?.dialCode}</span>
          <ChevronDown
            className={`h-4 w-4 text-[#4a5d73] dark:text-[#94a3b8] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 top-[calc(100%+8px)] left-0 w-[300px] bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              <Search className="h-4 w-4 text-[#4a5d73] dark:text-[#94a3b8] shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code…"
                className="w-full bg-transparent border-0 outline-none text-[13px] text-[#0a1628] dark:text-[#e6edf7] placeholder-gray-400 dark:placeholder-gray-600"
              />
            </div>
            <div className="max-h-60 overflow-y-auto overflow-x-hidden">
              {filtered.length === 0 && (
                <div className="px-4 py-3 text-[13px] text-[#4a5d73] dark:text-[#94a3b8]">No matches</div>
              )}
              {filtered.map((c) => {
                const isSelected = c.dialCode === countryCode;
                return (
                  <div
                    key={c.code}
                    onClick={() => {
                      onCountryCodeChange(c.dialCode);
                      setIsOpen(false);
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 text-[14px] cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold'
                        : 'text-[#4a5d73] dark:text-[#e6edf7] hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="text-lg leading-none">{c.emoji}</span>
                    <span className="font-medium w-12 shrink-0">{c.dialCode}</span>
                    <span className="truncate text-[13px]">{c.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Number input */}
      <input
        type="tel"
        inputMode="numeric"
        value={phoneNumber}
        onChange={(e) => onPhoneNumberChange(e.target.value.replace(/\D/g, '').slice(0, maxLength))}
        onBlur={onBlur}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full bg-transparent border-0 outline-none text-[#0a1628] dark:text-[#e6edf7] text-[15px] font-semibold p-0 pl-1 focus:ring-0 placeholder-gray-400 dark:placeholder-gray-600"
      />
    </div>
  );
}

export default PhoneInput;
