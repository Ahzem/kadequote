import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Quotation } from '@/types/quotation';
import { BusinessProfile } from '@/types/business';
import { formatCurrency } from '@/lib/calculations/quotation';

export function generateQuotationPDF(quotation: Quotation, business: BusinessProfile): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let cursorY = margin;

  // Colors as strict 3-tuples for jsPDF / autoTable
  const primaryColor: [number, number, number] = [16, 110, 85]; // Emerald #106e55
  const darkTextColor: [number, number, number] = [30, 41, 59]; // Slate 800 #1e293b
  const mutedTextColor: [number, number, number] = [100, 116, 139]; // Slate 500 #64748b
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate 50
  const borderLight: [number, number, number] = [226, 232, 240]; // Slate 200

  // Optional Logo
  if (business.logoBase64 && business.logoBase64.startsWith('data:image')) {
    try {
      doc.addImage(business.logoBase64, 'JPEG', margin, cursorY, 28, 28);
      // Offset business details to the right of logo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(business.name, margin + 32, cursorY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
      if (business.ownerName) doc.text(`Proprietor: ${business.ownerName}`, margin + 32, cursorY + 11);
      if (business.phone) doc.text(`Tel: ${business.phone}`, margin + 32, cursorY + 16);
      if (business.email) doc.text(`Email: ${business.email}`, margin + 32, cursorY + 21);
      if (business.address) doc.text(business.address, margin + 32, cursorY + 26);
    } catch {
      // Fallback if image corrupted
      renderBusinessText();
    }
  } else {
    renderBusinessText();
  }

  function renderBusinessText() {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(business.name, margin, cursorY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    let offset = cursorY + 10;
    if (business.ownerName) {
      doc.text(`Proprietor: ${business.ownerName}`, margin, offset);
      offset += 4.5;
    }
    if (business.phone) {
      doc.text(`Phone: ${business.phone}`, margin, offset);
      offset += 4.5;
    }
    if (business.email) {
      doc.text(`Email: ${business.email}`, margin, offset);
      offset += 4.5;
    }
    if (business.address) {
      doc.text(business.address, margin, offset);
    }
  }

  // Right Side: Quotation Header Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('QUOTATION', pageWidth - margin, cursorY + 6, { align: 'right' });

  // Badge for Quotation Number
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.roundedRect(pageWidth - margin - 65, cursorY + 9, 65, 8, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(quotation.quotationNumber, pageWidth - margin - 32.5, cursorY + 14.5, { align: 'center' });

  // Dates
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text(`Date: ${quotation.issueDate}`, pageWidth - margin, cursorY + 22, { align: 'right' });
  doc.text(`Valid Until: ${quotation.validUntilDate}`, pageWidth - margin, cursorY + 27, { align: 'right' });

  cursorY += 34;

  // Divider Line
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 6;

  // Bill To & Job Overview Box
  const boxWidth = (pageWidth - margin * 2 - 8) / 2;
  const boxHeight = 28;

  // Customer Card
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(margin, cursorY, boxWidth, boxHeight, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('CLIENT / BILL TO', margin + 4, cursorY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(quotation.customer.name || 'Valued Customer', margin + 4, cursorY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  let custOff = cursorY + 15;
  if (quotation.customer.phone) {
    doc.text(`Phone: ${quotation.customer.phone}`, margin + 4, custOff);
    custOff += 4;
  }
  if (quotation.customer.email) {
    doc.text(`Email: ${quotation.customer.email}`, margin + 4, custOff);
    custOff += 4;
  }
  if (quotation.customer.address) {
    const addressLines = doc.splitTextToSize(quotation.customer.address, boxWidth - 8);
    doc.text(addressLines.slice(0, 2), margin + 4, custOff);
  }

  // Job Details Card
  const jobX = margin + boxWidth + 8;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.roundedRect(jobX, cursorY, boxWidth, boxHeight, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('JOB / PROJECT TITLE', jobX + 4, cursorY + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  const jobTitleLines = doc.splitTextToSize(quotation.jobTitle || 'Quotation Estimate', boxWidth - 8);
  doc.text(jobTitleLines.slice(0, 2), jobX + 4, cursorY + 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text(`Currency: ${quotation.currency}`, jobX + 4, cursorY + 19);
  doc.text(`Status: ${quotation.status.toUpperCase()}`, jobX + 4, cursorY + 23);

  cursorY += boxHeight + 8;

  // Table Data
  const tableRows = quotation.items.map((item, index) => [
    String(index + 1),
    item.description,
    item.category.toUpperCase(),
    `${item.quantity} ${item.unit}`,
    formatCurrency(item.unitPrice, quotation.currency),
    formatCurrency(item.lineTotal, quotation.currency),
  ]);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    head: [['#', 'Description', 'Category', 'Qty / Unit', 'Unit Price', 'Line Total']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [16, 110, 85],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 24, fontStyle: 'italic', textColor: [100, 116, 139] },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: darkTextColor,
      lineColor: [241, 245, 249],
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || cursorY + 40;
  cursorY = finalY + 6;

  // Check if we have enough room for summary and signatures (requires at least 70mm)
  if (cursorY + 75 > pageHeight - margin) {
    doc.addPage();
    cursorY = margin + 10;
  }

  // Summary Table (Right Side)
  const summaryWidth = 80;
  const summaryX = pageWidth - margin - summaryWidth;

  const renderSummaryRow = (label: string, value: string, isBold: boolean = false, isHighlight: boolean = false) => {
    if (isHighlight) {
      doc.setFillColor(16, 110, 85);
      doc.roundedRect(summaryX - 4, cursorY - 3.5, summaryWidth + 4, 7.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(label, summaryX, cursorY + 1.5);
      doc.text(value, pageWidth - margin, cursorY + 1.5, { align: 'right' });
      cursorY += 8.5;
    } else {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(isBold ? darkTextColor[0] : mutedTextColor[0], isBold ? darkTextColor[1] : mutedTextColor[1], isBold ? darkTextColor[2] : mutedTextColor[2]);
      doc.text(label, summaryX, cursorY);
      doc.text(value, pageWidth - margin, cursorY, { align: 'right' });
      cursorY += 5;
    }
  };

  const savedCursorY = cursorY;
  renderSummaryRow('Subtotal:', formatCurrency(quotation.subtotal, quotation.currency));

  if (quotation.discountAmount > 0) {
    const discLabel = quotation.discountType === 'percentage'
      ? `Discount (${quotation.discount}%):`
      : 'Discount:';
    renderSummaryRow(discLabel, `-${formatCurrency(quotation.discountAmount, quotation.currency)}`);
  }

  if (quotation.additionalCharges > 0) {
    const chargeLabel = quotation.additionalChargesDescription
      ? `Charges (${quotation.additionalChargesDescription}):`
      : 'Additional Charges:';
    renderSummaryRow(chargeLabel, formatCurrency(quotation.additionalCharges, quotation.currency));
  }

  if (quotation.taxEnabled && quotation.taxAmount > 0) {
    renderSummaryRow(`Tax (${quotation.taxRate}%):`, formatCurrency(quotation.taxAmount, quotation.currency));
  }

  renderSummaryRow('Total Estimate:', formatCurrency(quotation.total, quotation.currency), true, true);

  // Left Side: Notes & Terms
  const leftWidth = summaryX - margin - 10;
  let notesY = savedCursorY;

  if (quotation.notes && quotation.notes.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text('Notes / Special Instructions:', margin, notesY);
    notesY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    const splitNotes = doc.splitTextToSize(quotation.notes, leftWidth);
    doc.text(splitNotes.slice(0, 4), margin, notesY);
    notesY += Math.min(splitNotes.length * 3.5, 14) + 4;
  }

  if (quotation.terms && quotation.terms.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text('Terms & Conditions:', margin, notesY);
    notesY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    const splitTerms = doc.splitTextToSize(quotation.terms, leftWidth);
    doc.text(splitTerms.slice(0, 4), margin, notesY);
    notesY += Math.min(splitTerms.length * 3.5, 14) + 4;
  }

  cursorY = Math.max(cursorY, notesY) + 8;

  // Disclaimer badge
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, cursorY, pageWidth - margin * 2, 7, 'F');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text(
    'Notice: This document is a price quotation only and does not constitute a tax invoice or formal receipt.',
    pageWidth / 2,
    cursorY + 4.5,
    { align: 'center' }
  );
  cursorY += 13;

  // Signatures
  const sigWidth = 70;
  // Left: Authorized Signature
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(margin, cursorY + 12, margin + sigWidth, cursorY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text('Authorized Signature & Company Stamp', margin, cursorY + 16);

  // Right: Client Acceptance Signature
  const clientSigX = pageWidth - margin - sigWidth;
  doc.line(clientSigX, cursorY + 12, clientSigX + sigWidth, cursorY + 12);
  doc.text('Client Acceptance Signature & Date', clientSigX, cursorY + 16);

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
    doc.text(
      'KadeQuote • Local-First AI Quotation Maker (Private & Offline-Ready)',
      margin,
      pageHeight - 8
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return doc;
}

export function downloadQuotationPDF(quotation: Quotation, business: BusinessProfile) {
  const doc = generateQuotationPDF(quotation, business);
  const cleanNumber = quotation.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${cleanNumber}_${quotation.customer.name ? quotation.customer.name.replace(/\s+/g, '_') : 'Quotation'}.pdf`;
  doc.save(filename);
}
