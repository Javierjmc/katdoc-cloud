'use client';
// components/ui/ImageLightbox.tsx
// Modal para ampliar una imagen a pantalla. Cierra con backdrop, ✕ o Esc.
// Evita el scroll del fondo mientras está abierto.

import { useEffect } from 'react';

interface ImageLightboxProps {
  src?: string | null;
  alt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!src) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Imagen ampliada"
    >
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl flex items-center justify-center transition-colors"
      >
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ''}
        onClick={e => e.stopPropagation()}
        className="max-w-[92vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
      />
    </div>
  );
}
