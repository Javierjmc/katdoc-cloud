// lib/examPdf.ts
// ============================================================
// S51: genera el reporte de un examen de laboratorio en el
// FORMATO KATDOC (referencia: docs/Pomerania Chocolate macho.pdf).
// ============================================================

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type PDFImage,
} from 'pdf-lib';
import type { LaboratoryExam } from '@/types';

export interface ExamPdfOptions {
  paciente?: string;
  especie?: string;
  raza?: string;
  edad?: string;
}

const TEAL = rgb(0.31, 0.70, 0.75);
const DARK = rgb(0.12, 0.12, 0.12);
const GRAY = rgb(0.45, 0.45, 0.45);
const RED = rgb(0.80, 0.15, 0.15);
const AMBER = rgb(0.65, 0.50, 0.02);

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 50;

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
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

async function embedLogo(doc: PDFDocument): Promise<PDFImage | null> {
  try {
    const res = await fetch('/logo-katdoc.jpg');
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    return await doc.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function buildExamPdf(
  exam: Pick<LaboratoryExam, 'nombre_examen' | 'fecha_examen' | 'analitos' | 'descripcion' | 'medico_solicitante' | 'rif' | 'interpretacion' | 'observaciones' | 'notas'>,
  opts: ExamPdfOptions = {}
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(doc);

  let page: PDFPage = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN + 30) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const line = (
    text: string,
    font: PDFFont = regular,
    size = 10,
    color = DARK,
    gap = 14,
    indent = 0
  ) => {
    const maxW = PAGE_W - MARGIN * 2 - indent;
    for (const l of wrap(text, font, size, maxW)) {
      ensureSpace(size + 4);
      page.drawText(l, { x: MARGIN + indent, y, size, font, color });
      y -= size + 3;
    }
    y -= gap - (size + 3);
  };

  // ── Membrete ──
  if (logo) {
    const lw = 54;
    const lh = (logo.height / logo.width) * lw;
    page.drawImage(logo, { x: MARGIN, y: y - lh, width: lw, height: lh });
  }
  const fecha = exam.fecha_examen
    ? new Date(`${exam.fecha_examen}T12:00:00`).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  if (fecha) {
    const ft = fecha.toUpperCase();
    const fw = regular.widthOfTextAtSize(ft, 10);
    page.drawText(ft, { x: PAGE_W - MARGIN - fw, y: y - 14, size: 10, font: regular, color: GRAY });
  }
  y -= 62;

  line('ANÁLISIS', bold, 15, DARK, 12);
  if (exam.descripcion) line(`DESCRIPCIÓN: ${exam.descripcion}`, regular, 10, GRAY, 2);
  if (exam.medico_solicitante) line(`MÉDICO SOLICITANTE: ${exam.medico_solicitante}`, regular, 10, GRAY, 2);
  if (exam.rif) line(`RIF: ${exam.rif}`, regular, 10, GRAY, 2);
  y -= 8;

  // ── Datos del paciente ──
  const datos: [string, string | undefined][] = [
    ['PACIENTE', opts.paciente],
    ['EDAD', opts.edad],
    ['RAZA', opts.raza],
    ['ESPECIE', opts.especie],
  ].filter(([, v]) => v) as [string, string][];
  if (datos.length) {
    const colW = (PAGE_W - MARGIN * 2) / 2;
    let col = 0;
    let rowY = y;
    for (const [label, value] of datos) {
      const x = MARGIN + col * colW;
      const labelText = `${label}: `;
      page.drawText(labelText, { x, y: rowY, size: 9, font: bold, color: TEAL });
      const lw = bold.widthOfTextAtSize(labelText, 9);
      page.drawText(String(value), { x: x + lw, y: rowY, size: 10, font: regular, color: DARK });
      col += 1;
      if (col === 2) { col = 0; rowY -= 16; }
    }
    y = rowY - (col === 0 ? 4 : 20);
    y -= 6;
  }

  // ── Analitos agrupados por sección ──
  const grupos: { nombre: string; items: typeof exam.analitos }[] = [];
  for (const a of exam.analitos) {
    const g = a.grupo ?? '';
    let bucket = grupos.find(x => x.nombre === g);
    if (!bucket) { bucket = { nombre: g, items: [] }; grupos.push(bucket); }
    bucket.items.push(a);
  }

  const COL_NOMBRE = MARGIN;
  const COL_VALOR = MARGIN + 250;
  const COL_FLAG = MARGIN + 340;
  const COL_REF = MARGIN + 390;

  for (const g of grupos) {
    ensureSpace(60);
    if (g.nombre) {
      line(g.nombre.toUpperCase(), bold, 11, TEAL, 6);
    }
    // Cabecera de tabla
    ensureSpace(20);
    page.drawText('ANALITO', { x: COL_NOMBRE, y, size: 8, font: bold, color: GRAY });
    page.drawText('RESULTADO', { x: COL_VALOR, y, size: 8, font: bold, color: GRAY });
    page.drawText('V/N', { x: COL_FLAG, y, size: 8, font: bold, color: GRAY });
    page.drawText('REFERENCIA', { x: COL_REF, y, size: 8, font: bold, color: GRAY });
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.7, color: TEAL });
    y -= 12;

    for (const a of g.items) {
      ensureSpace(16);
      const nombreLines = wrap(a.nombre, regular, 9, COL_VALOR - COL_NOMBRE - 8);
      page.drawText(nombreLines[0] ?? '', { x: COL_NOMBRE, y, size: 9, font: regular, color: DARK });
      const valor = `${a.valor}${a.unidad ? ` ${a.unidad}` : ''}`;
      page.drawText(valor, { x: COL_VALOR, y, size: 9, font: bold, color: DARK });
      const flagColor = a.flag === 'ALTO' ? RED : a.flag === 'BAJO' ? AMBER : GRAY;
      page.drawText(a.flag === 'ALTO' ? 'ALTO' : a.flag === 'BAJO' ? 'BAJO' : 'N', {
        x: COL_FLAG, y, size: 8.5, font: bold, color: flagColor,
      });
      page.drawText(a.rango ?? '', { x: COL_REF, y, size: 8.5, font: regular, color: GRAY });
      y -= 14;
    }
    y -= 8;
  }

  if (exam.interpretacion) {
    line('INTERPRETACIÓN', bold, 11, TEAL, 6);
    line(exam.interpretacion, regular, 10, DARK, 12);
  }
  if (exam.observaciones) {
    line('OBSERVACIONES', bold, 11, TEAL, 6);
    line(exam.observaciones, regular, 10, DARK, 12);
  }
  if (exam.notas) {
    line('NOTAS', bold, 11, TEAL, 6);
    line(exam.notas, regular, 10, DARK, 12);
  }

  const bytes = await doc.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
