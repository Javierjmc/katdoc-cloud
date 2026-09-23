// lib/recipePdf.ts
// ============================================================
// S50: genera la Recipe en el FORMATO OFICIAL KATDOC.
// Una hoja A4 con dos formularios (izquierda "Rp.", derecha "Ind."):
// logo + FECHA, caja de datos del paciente, contenido y pie con QR.
// ============================================================

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type PDFImage,
} from 'pdf-lib';
import type { Prescription } from '@/types';

export interface RecipePdfOptions {
  paciente?: string;
  /** S50: nombre del propietario (tutor). */
  propietario?: string;
  raza?: string;
  edad?: string;
  peso?: number | null;
  /** Legacy: alias de propietario. */
  tutor?: string;
}

const TEAL  = rgb(0.31, 0.70, 0.75);
const DARK  = rgb(0.12, 0.12, 0.12);
const GRAY  = rgb(0.45, 0.45, 0.45);

const PAGE_W = 595; // A4 vertical
const PAGE_H = 842;

type Fonts = { regular: PDFFont; bold: PDFFont; logo: PDFImage | null; qr: PDFImage | null };
type FormData = { fecha: string; paciente: string; propietario: string; raza: string; edad: string; peso: string };
type Item = { title?: string; lines: string[] };

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
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

async function embedAsset(doc: PDFDocument, url: string): Promise<PDFImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    const type = res.headers.get('content-type') ?? '';
    if (type.includes('png')) return await doc.embedPng(bytes);
    return await doc.embedJpg(bytes);
  } catch {
    return null;
  }
}

function drawLabelValue(
  page: PDFPage,
  f: Fonts,
  label: string,
  value: string,
  x: number,
  y: number
): void {
  const labelText = `${label}: `;
  page.drawText(labelText, { x, y, size: 8, font: f.bold, color: TEAL });
  const lw = f.bold.widthOfTextAtSize(labelText, 8);
  page.drawText(value, { x: x + lw, y, size: 9.5, font: f.regular, color: DARK });
}

function drawForm(
  page: PDFPage,
  x: number,
  w: number,
  top: number,
  bottom: number,
  title: string,
  items: Item[],
  data: FormData,
  f: Fonts
): void {
  page.drawRectangle({ x, y: bottom, width: w, height: top - bottom, borderColor: TEAL, borderWidth: 1.2 });

  const pad = 10;
  const innerX = x + pad;
  const innerW = w - pad * 2;
  let y = top - pad;

  // ── Membrete: logo + fecha ──
  if (f.logo) {
    const lw = 50;
    const lh = (f.logo.height / f.logo.width) * lw;
    page.drawImage(f.logo, { x: innerX, y: y - lh, width: lw, height: lh });
  }
  const fechaText = `FECHA: ${data.fecha || '___/___/___'}`;
  const fw = f.regular.widthOfTextAtSize(fechaText, 9);
  page.drawText(fechaText, { x: innerX + innerW - fw, y: y - 12, size: 9, font: f.regular, color: GRAY });

  y -= 56;

  // ── Caja de datos del paciente ──
  const boxH = 82;
  page.drawRectangle({ x: innerX, y: y - boxH, width: innerW, height: boxH, borderColor: TEAL, borderWidth: 1 });
  drawLabelValue(page, f, 'NOMBRE DEL PACIENTE', data.paciente, innerX + 6, y - 16);
  drawLabelValue(page, f, 'RAZA', data.raza, innerX + 6, y - 34);
  drawLabelValue(page, f, 'EDAD', data.edad, innerX + innerW / 2, y - 34);
  drawLabelValue(page, f, 'PESO', data.peso, innerX + 6, y - 52);
  drawLabelValue(page, f, 'PROPIETARIO', data.propietario, innerX + 6, y - 70);
  y -= boxH + 16;

  // ── Título (Rp. / Ind.) ──
  page.drawText(title, { x: innerX, y: y - 18, size: 22, font: f.bold, color: TEAL });
  y -= 34;

  // ── Contenido ──
  const footerTop = bottom + pad + 52;
  for (const item of items) {
    if (y < footerTop + 14) break;
    if (item.title) {
      for (const line of wrap(item.title, f.bold, 10, innerW)) {
        if (y < footerTop + 14) break;
        page.drawText(line, { x: innerX, y, size: 10, font: f.bold, color: DARK });
        y -= 13;
      }
    }
    for (const raw of item.lines) {
      for (const line of wrap(raw, f.regular, 9, innerW)) {
        if (y < footerTop + 14) break;
        page.drawText(line, { x: innerX + (item.title ? 8 : 0), y, size: 9, font: f.regular, color: GRAY });
        y -= 12;
      }
    }
    y -= 5;
  }

  // ── Pie: QR + contacto ──
  const footerY = bottom + pad;
  if (f.qr) {
    page.drawImage(f.qr, { x: innerX, y: footerY, width: 44, height: 44 });
  }
  const tx = innerX + 52;
  page.drawText('Altavista Sur, Carrera Gurí', { x: tx, y: footerY + 30, size: 7.5, font: f.regular, color: GRAY });
  page.drawText('Teléfono: 0424-922.95.39', { x: tx, y: footerY + 19, size: 7.5, font: f.regular, color: GRAY });
  page.drawText('@katdoc.mv', { x: tx, y: footerY + 8, size: 7.5, font: f.regular, color: GRAY });
}

/** Devuelve el PDF de la Recipe como Blob (formato oficial KATDOC). */
export async function buildRecipePdf(
  recipe: Pick<Prescription, 'titulo' | 'fecha' | 'medicamentos' | 'notas'>,
  opts: RecipePdfOptions = {}
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const [logo, qr] = await Promise.all([
    embedAsset(doc, '/logo-katdoc.jpg'),
    embedAsset(doc, '/qr-katdoc.jpg'),
  ]);
  const fonts: Fonts = { regular, bold, logo, qr };

  const page = doc.addPage([PAGE_W, PAGE_H]);
  const MARGIN = 20;
  const GAP = 14;
  const COL_W = (PAGE_W - MARGIN * 2 - GAP) / 2;
  const TOP = PAGE_H - MARGIN;
  const BOTTOM = MARGIN;

  const fecha = recipe.fecha
    ? new Date(`${recipe.fecha}T12:00:00`).toLocaleDateString('es-VE')
    : '';

  const data: FormData = {
    fecha,
    paciente: opts.paciente ?? '',
    propietario: opts.propietario ?? opts.tutor ?? '',
    raza: opts.raza ?? '',
    edad: opts.edad ?? '',
    peso: opts.peso != null ? `${opts.peso} kg` : '',
  };

  const meds = (recipe.medicamentos ?? []).filter(m => m.nombre.trim() !== '');

  const rpItems: Item[] = meds.map((m, i) => {
    const lines: string[] = [];
    if (m.presentacion) lines.push(`Presentación: ${m.presentacion}`);
    if (m.dosis) lines.push(`Dosis: ${m.dosis}`);
    if (m.frecuencia) lines.push(`Frecuencia: ${m.frecuencia}`);
    if (m.duracion) lines.push(`Duración: ${m.duracion}`);
    if (m.via) lines.push(`Vía: ${m.via}`);
    return { title: `${i + 1}. ${m.nombre}`, lines };
  });

  const indItems: Item[] = meds
    .filter(m => m.indicaciones)
    .map(m => ({ title: `• ${m.nombre}`, lines: [m.indicaciones as string] }));
  if (recipe.notas) indItems.push({ title: 'Notas', lines: [recipe.notas] });
  if (indItems.length === 0) indItems.push({ lines: ['—'] });

  drawForm(page, MARGIN, COL_W, TOP, BOTTOM, 'Rp.', rpItems, data, fonts);
  drawForm(page, MARGIN + COL_W + GAP, COL_W, TOP, BOTTOM, 'Ind.', indItems, data, fonts);

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
