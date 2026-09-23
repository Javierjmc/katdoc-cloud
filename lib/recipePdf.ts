// lib/recipePdf.ts
// ============================================================
// S50: genera la Recipe en el FORMATO OFICIAL KATDOC.
// Hoja A4 HORIZONTAL con dos formularios (izquierda "Rp.", derecha "Ind."):
// logo + FECHA, caja de datos del paciente, watermark del logo, contenido y
// pie con QR. Títulos y líneas en naranja de marca (#E8724A).
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

const ACCENT = rgb(232 / 255, 114 / 255, 74 / 255); // #E8724A
const DARK  = rgb(0.12, 0.12, 0.12);
const GRAY  = rgb(0.45, 0.45, 0.45);

const PAGE_W = 842; // A4 horizontal
const PAGE_H = 595;
const FIRMA_W = 95;

type Fonts = { regular: PDFFont; bold: PDFFont; logo: PDFImage | null; qr: PDFImage | null; firma: PDFImage | null };
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
  page.drawText(labelText, { x, y, size: 8, font: f.bold, color: ACCENT });
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
  page.drawRectangle({ x, y: bottom, width: w, height: top - bottom, borderColor: ACCENT, borderWidth: 1.2 });

  const pad = 12;
  const innerX = x + pad;
  const innerW = w - pad * 2;

  // ── Marca de agua: logo KATDOC con baja opacidad, al centro ──
  if (f.logo) {
    const wmW = w * 0.5;
    const wmH = (f.logo.height / f.logo.width) * wmW;
    page.drawImage(f.logo, {
      x: x + (w - wmW) / 2,
      y: (top + bottom) / 2 - wmH / 2,
      width: wmW,
      height: wmH,
      opacity: 0.07,
    });
  }

  let y = top - pad;

  // ── Membrete: logo + fecha ──
  if (f.logo) {
    const lw = 70;
    const lh = (f.logo.height / f.logo.width) * lw;
    page.drawImage(f.logo, { x: innerX, y: y - lh, width: lw, height: lh });
  }
  const fechaText = `FECHA: ${data.fecha || '___/___/___'}`;
  const fw = f.regular.widthOfTextAtSize(fechaText, 9);
  page.drawText(fechaText, { x: innerX + innerW - fw, y: y - 12, size: 9, font: f.regular, color: ACCENT });

  y -= 64;

  // ── Caja de datos del paciente ──
  const boxH = 78;
  page.drawRectangle({ x: innerX, y: y - boxH, width: innerW, height: boxH, borderColor: ACCENT, borderWidth: 1 });
  drawLabelValue(page, f, 'NOMBRE DEL PACIENTE', data.paciente, innerX + 6, y - 16);
  drawLabelValue(page, f, 'RAZA', data.raza, innerX + 6, y - 34);
  drawLabelValue(page, f, 'EDAD', data.edad, innerX + innerW / 2, y - 34);
  drawLabelValue(page, f, 'PESO', data.peso, innerX + 6, y - 52);
  drawLabelValue(page, f, 'PROPIETARIO', data.propietario, innerX + 6, y - 70);
  y -= boxH + 16;

  // ── Título (Rp. / Ind.) ──
  page.drawText(title, { x: innerX, y: y - 18, size: 22, font: f.bold, color: ACCENT });
  y -= 36;

  // ── Contenido ──
  const firmaH = f.firma ? (f.firma.height / f.firma.width) * FIRMA_W : 0;
  const footerTop = bottom + pad + 52 + (firmaH ? firmaH + 8 : 0);
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

  // ── Firma y sello del médico veterinario ──
  if (f.firma) {
    const fx = innerX + innerW - FIRMA_W;
    const fy = bottom + pad + 52;
    page.drawImage(f.firma, { x: fx, y: fy, width: FIRMA_W, height: firmaH });
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

/** Devuelve el PDF de la Recipe como Blob (formato oficial KATDOC, horizontal). */
export async function buildRecipePdf(
  recipe: Pick<Prescription, 'titulo' | 'fecha' | 'medicamentos' | 'notas'>,
  opts: RecipePdfOptions = {}
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const [logo, qr, firma] = await Promise.all([
    embedAsset(doc, '/logo-katdoc.jpg'),
    embedAsset(doc, '/qr-katdoc.jpg'),
    embedAsset(doc, '/sello-firma.jpg'),
  ]);
  const fonts: Fonts = { regular, bold, logo, qr, firma };

  const page = doc.addPage([PAGE_W, PAGE_H]);
  const MARGIN = 16;
  const GAP = 16;
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

  // Rp.: solo el medicamento y su presentación.
  const rpItems: Item[] = meds.map((m, i) => ({
    title: `${i + 1}. ${m.nombre}`,
    lines: m.presentacion ? [`Presentación: ${m.presentacion}`] : [],
  }));

  // Ind.: indicaciones (dosis, frecuencia, duración, vía, indicaciones).
  const indItems: Item[] = [];
  meds.forEach((m, i) => {
    const lines: string[] = [];
    if (m.dosis) lines.push(`Dosis: ${m.dosis}`);
    if (m.frecuencia) lines.push(`Frecuencia: ${m.frecuencia}`);
    if (m.duracion) lines.push(`Duración: ${m.duracion}`);
    if (m.via) lines.push(`Vía: ${m.via}`);
    if (m.indicaciones) lines.push(`Indicaciones: ${m.indicaciones}`);
    if (lines.length) indItems.push({ title: `${i + 1}. ${m.nombre}`, lines });
  });
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
