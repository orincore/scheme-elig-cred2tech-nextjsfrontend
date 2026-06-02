'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

type Size = 'small' | 'medium' | 'large' | 'xlarge';

const SIZES: Record<Size, { height: number; maxWidth: number }> = {
  small: { height: 24, maxWidth: 100 },
  medium: { height: 30, maxWidth: 120 },
  large: { height: 40, maxWidth: 160 },
  xlarge: { height: 56, maxWidth: 200 },
};

/**
 * Cred2Tech wordmark. Swaps between the black and white logo based on the
 * active theme, or force a variant with `forceVariant` (e.g. on the indigo
 * login panel, which always wants the white logo).
 */
export function BrandLogo({
  size = 'medium',
  className = '',
  forceVariant,
}: {
  size?: Size;
  className?: string;
  forceVariant?: 'black' | 'white';
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { height, maxWidth } = SIZES[size] || SIZES.medium;
  const variant =
    forceVariant ?? (mounted && resolvedTheme === 'dark' ? 'white' : 'black');

  return (
    <div
      className={className}
      style={{ height, width: 'auto', maxWidth, overflow: 'hidden', display: 'flex', alignItems: 'center' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={variant === 'white' ? '/logos/white-logo.png' : '/logos/black-logo.png'}
        alt="Cred2Tech"
        style={{ height: '100%', width: '100%', objectFit: 'contain', maxWidth: '100%', maxHeight: '100%', display: 'block' }}
      />
    </div>
  );
}

export default BrandLogo;
