import type { Entry } from '../core/types';
import { buildPdfModel, pdfSafe } from './pdfModel';

/** Génère un PDF lisible du journal. La bibliothèque n'est chargée qu'à la demande. */
export async function buildPdf(entries: Entry[], name?: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 18;
  const maxW = W - M * 2;
  const bottom = 280;
  let y = M;

  const ensure = (h: number) => {
    if (y + h > bottom) {
      doc.addPage();
      y = M;
    }
  };

  const write = (text: string, size: number, style: 'normal' | 'bold' | 'italic', color: [number, number, number], lineH: number, gapAfter = 0) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(pdfSafe(text), maxW) as string[];
    for (const line of lines) {
      ensure(lineH);
      doc.text(line, M, y);
      y += lineH;
    }
    y += gapAfter;
  };

  for (const b of buildPdfModel(entries, { name, generatedAt: new Date() })) {
    switch (b.t) {
      case 'title':
        write(b.text, 22, 'bold', [40, 38, 90], 10, 1);
        break;
      case 'subtitle':
        write(b.text, 11, 'normal', [110, 110, 130], 6);
        break;
      case 'day':
        ensure(24);
        doc.setDrawColor(200, 198, 230);
        doc.line(M, y, W - M, y);
        y += 6;
        write(b.text.charAt(0).toUpperCase() + b.text.slice(1), 14, 'bold', [60, 56, 140], 7, 1);
        break;
      case 'meta':
        write(b.text, 9.5, 'italic', [100, 100, 120], 5, 3);
        break;
      case 'q':
        write(b.text, 10.5, 'bold', [50, 50, 70], 5.5, 0.5);
        break;
      case 'a':
        write(b.text, 10.5, 'normal', [30, 30, 40], 5.2, 3.5);
        break;
      case 'gap':
        y += 6;
        break;
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(150, 150, 165);
    doc.text(`Lueur — page ${i} sur ${pages}`, W / 2, 291, { align: 'center' });
  }
  return doc.output('blob');
}
