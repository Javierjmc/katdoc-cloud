'use client';
// components/BrandMark.tsx
// Tile claro con el logo de la clinica. Sobre el sidebar oscuro el logo
// va en una tarjeta blanca para que se lea igual que en un papel.

import Image from 'next/image';
import { BRAND } from '@/lib/brand';

interface BrandMarkProps {
  /** Lado del tile en px. */
  size?: number;
  /** 'mark' = mosaico corto; 'logo' = logo completo. */
  variant?: 'mark' | 'logo';
  className?: string;
}

export default function BrandMark({ size = 40, variant = 'mark', className = '' }: BrandMarkProps) {
  const src = variant === 'mark' ? BRAND.mark : BRAND.logo;

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-xl bg-white shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={BRAND.name}
        width={size}
        height={size}
        unoptimized
        className="h-full w-full object-contain"
        style={{ padding: Math.max(2, Math.round(size * 0.07)) }}
      />
    </div>
  );
}
