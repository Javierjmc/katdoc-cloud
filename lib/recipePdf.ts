// lib/recipePdf.ts
// ============================================================
// Genera el PDF de una Recipe (prescripción) en el cliente con
// pdf-lib: membrete KATDOC, paciente, peso (S29), medicamentos y notas.
// ============================================================

import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import type { Prescription, PrescriptionMedication } from '@/types';

export interface RecipePdfOptions {
  paciente?: string;
  tutor?: string;
  peso?: number | null;
}

const BRAND = rgb(0.9098, 0.4471, 0.2902);   // #E8724A
const DARK  = rgb(0.12, 0.12, 0.12);
const GRAY  = rgb(0.45, 0.45, 0.45);

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Devuelve el PDF como Blob. */
export async function buildRecipePdf(
  recipe: Pick<Prescription, 'titulo' | 'fecha' | 'medicamentos' | 'notas'>,
  opts: RecipePdfOptions = {}
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595; // A4 vertical
  const PAGE_H = 842;
  const MARGIN = 55;
  const MAX_W = PAGE_W - MARGIN * 2;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const draw = (
    text: string,
    f: PDFFont = regular,
    size = 11,
    color = DARK,
    gap = 16,
    lineGap = 3
  ) => {
    ensureSpace(gap);
    for (const line of wrap(text, f, size, MAX_W)) {
      page.drawText(line, { x: MARGIN, y, size, font: f, color });
      y -= size + lineGap;
    }
    y -= gap - (size + lineGap);
  };

  // ── Membrete ──
  draw('KATDOC', bold, 20, BRAND, 10);
  draw('Bienestar animal, otra manera de amar', regular, 9, GRAY, 18);
  page.drawLine({
    start: { x: MARGIN, y: y + 6 },
    end: { x: PAGE_W - MARGIN, y: y + 6 },
    thickness: 1.2,
    color: BRAND,
  });
  y -= 20;

  // ── Título ──
  draw(recipe.titulo ?? 'Recipe', bold, 16, DARK, 10);

  // ── Datos del paciente ──
  const fecha = recipe.fecha
    ? new Date(`${recipe.fecha}T12:00:00`).toLocaleDateString('es-VE')
    : '';
  if (opts.paciente) draw(`Paciente: ${opts.paciente}`, regular, 11, DARK, 4);
  if (opts.tutor) draw(`Propietario: ${opts.tutor}`, regular, 11, DARK, 4);
  if (opts.peso != null) draw(`Peso: ${opts.peso} kg`, regular, 11, DARK, 4);
  if (fecha) draw(`Fecha: ${fecha}`, regular, 11, DARK, 18);

  // ── Medicamentos ──
  const meds = (recipe.medicamentos ?? []).filter(m => m.nombre.trim() !== '');
  for (let i = 0; i < meds.length; i++) {
    const m: PrescriptionMedication = meds[i];
    ensureSpace(70);
    draw(`${i + 1}. ${m.nombre}`, bold, 12, DARK, 6);
    const extras: string[] = [];
    if (m.presentacion) extras.push(`Presentación: ${m.presentacion}`);
    if (m.dosis) extras.push(`Dosis: ${m.dosis}`);
    if (m.frecuencia) extras.push(`Frecuencia: ${m.frecuencia}`);
    if (m.duracion) extras.push(`Duración: ${m.duracion}`);
    if (m.via) extras.push(`Vía: ${m.via}`);
    for (const extra of extras) {
      draw(extra, regular, 10.5, GRAY, 3);
    }
    if (m.indicaciones) {
      draw(`Indicaciones: ${m.indicaciones}`, regular, 10.5, DARK, 14);
    } else {
      y -= 8;
    }
  }

  if (recipe.notas) {
    ensureSpace(30);
    draw('Notas:', bold, 11, DARK, 4);
    draw(recipe.notas, regular, 11, DARK, 18);
  }

  // ── Pie ──
  ensureSpace(30);
  y = MARGIN + 8;
  page.drawText('Documento generado por KATDOC', {
    x: MARGIN,
    y,
    size: 8,
    font: regular,
    color: GRAY,
  });

  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}

/** Convierte un Blob/PDF a base64 (para adjuntarlo en un email). */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
