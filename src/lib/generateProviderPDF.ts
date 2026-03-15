import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export interface PDFProviderData {
  npi: string;
  providerName: string;
  specialty: string;
  state: string;
  entityType: string | null;
  rank: number | null;
  totalProviders: number | null;
  topPercentage: string | null;
  bestPeerRatio: number | null;
  yearsVerified: number;
  flagYears: {
    year: number;
    percentile_rank: number;
    totalAllowedDollars: number;
    allowedPerBeneDollars: number | null;
    peerMedianPerBeneDollars: number | null;
    peerP75PerBeneDollars: number | null;
    peerP995PerBeneDollars: number | null;
    peerGroupSize: number | null;
    xVsPeerMedian: number | null;
    verifiedTop05: boolean;
    beneficiaries: number | null;
    services: number | null;
  }[];
  dataContext: {
    drugPct: number | null;
    totBenes: number | null;
    beneAvgRiskScore: number | null;
    totHcpcsCds: number | null;
    entityType: string | null;
  };
}

const MARGIN = 54;
const PAGE_W = 612;
const PAGE_H = 792;
const CONTENT_W = PAGE_W - MARGIN * 2;
const TOTAL_PAGES = 2;

const COLORS = {
  banner: [30, 41, 59] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  redLight: [254, 242, 242] as [number, number, number],
  gray: [100, 116, 139] as [number, number, number],
  grayLight: [241, 245, 249] as [number, number, number],
  black: [15, 23, 42] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  footerGray: [107, 114, 128] as [number, number, number],
};

interface ChartCapture {
  dataUrl: string;
  width: number;
  height: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function addFooter(doc: jsPDF, pageNum: number) {
  const y = PAGE_H - 30;
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.footerGray);
  doc.text('© 2026 OutlierGov. MIT License.', MARGIN, y);
  doc.text('outliergov.com', PAGE_W / 2, y, { align: 'center' });
  doc.text(`Page ${pageNum} of ${TOTAL_PAGES}`, PAGE_W - MARGIN, y, { align: 'right' });
}

async function captureChart(element: HTMLElement | null): Promise<ChartCapture | null> {
  if (!element) return null;
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });
    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    };
  } catch (e) {
    console.error('Chart capture failed:', e);
    return null;
  }
}

function getChartImgHeight(capture: ChartCapture, maxH = 280): number {
  const ratio = capture.height / capture.width;
  return Math.min(CONTENT_W * ratio, maxH);
}

export async function generateProviderPDF(
  data: PDFProviderData,
  barChartEl: HTMLElement | null,
  lineChartEl: HTMLElement | null
): Promise<void> {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });

  const [barCapture, lineCapture] = await Promise.all([
    captureChart(barChartEl),
    captureChart(lineChartEl),
  ]);

  let y = 0;

  // ===== PAGE 1 =====

  // Top banner
  doc.setFillColor(...COLORS.banner);
  doc.rect(0, 0, PAGE_W, 60, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLORS.white);
  doc.text('OutlierGov', MARGIN, 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Statistical analysis only – Not a finding of fraud or wrongdoing', PAGE_W - MARGIN, 20, { align: 'right' });
  doc.text('Data Source: CMS Medicare Part B | For internal screening use only', PAGE_W - MARGIN, 32, { align: 'right' });

  y = 78;

  // Provider name (bold 20pt)
  doc.setTextColor(...COLORS.black);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(data.providerName, MARGIN, y);

  if (data.entityType) {
    const nameW = doc.getTextWidth(data.providerName);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const badge = data.entityType === 'I' ? 'Individual' : 'Organization';
    const bw = doc.getTextWidth(badge) + 10;
    doc.setDrawColor(200, 200, 200);
    doc.roundedRect(MARGIN + nameW + 8, y - 10, bw, 14, 3, 3, 'S');
    doc.text(badge, MARGIN + nameW + 13, y - 1);
  }

  y += 22;

  // NPI / specialty / state line (10pt body)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray);
  doc.text(`NPI: ${data.npi}  •  ${data.specialty}  •  ${data.state}`, MARGIN, y);

  if (data.rank && data.totalProviders) {
    y += 14;
    doc.text(
      `Ranked #${data.rank} of ${data.totalProviders.toLocaleString()}${data.topPercentage ? ` (Top ${data.topPercentage}%)` : ''} by × above peer median`,
      MARGIN, y
    );
  }

  y += 18;

  // Peer ratio badge (bold 16pt)
  if (data.bestPeerRatio) {
    const badgeText = `${data.bestPeerRatio.toFixed(1)}× Peer Median`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    const tw = doc.getTextWidth(badgeText) + 20;
    doc.setFillColor(...COLORS.red);
    doc.roundedRect(MARGIN, y, tw, 26, 4, 4, 'F');
    doc.setTextColor(...COLORS.white);
    doc.text(badgeText, MARGIN + 10, y + 18);
    y += 38;
  }

  // Verified Outlier box — dynamic height
  const latestYear = data.flagYears[data.flagYears.length - 1];
  const outlierDesc = `This provider's Medicare allowed amount per beneficiary was approximately ${data.bestPeerRatio?.toFixed(1) || '?'}× the peer median within a specialty–state comparison group of ${latestYear?.peerGroupSize?.toLocaleString() || '?'} providers. This is statistical variance only—not evidence of wrongdoing.`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.red);
  const outlierTitle = `Verified Statistical Outlier — ${data.specialty}, ${data.state}`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const splitDesc = doc.splitTextToSize(outlierDesc, CONTENT_W - 20);
  const descHeight = splitDesc.length * 10;
  const boxHeight = 24 + descHeight + 10;

  doc.setFillColor(...COLORS.redLight);
  doc.setDrawColor(239, 68, 68);
  doc.roundedRect(MARGIN, y, CONTENT_W, boxHeight, 4, 4, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.red);
  doc.text(outlierTitle, MARGIN + 10, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.black);
  doc.text(splitDesc, MARGIN + 10, y + 32);

  y += boxHeight + 16;

  // Peer Group Snapshot
  if (latestYear && latestYear.peerGroupSize) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.black);
    doc.text(`Peer Group Snapshot (${latestYear.year})`, MARGIN, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text(`Distribution within ${data.specialty}, ${data.state} peer group`, MARGIN, y);
    y += 16;

    const gridItems = [
      { label: 'Peer Group Size', value: latestYear.peerGroupSize?.toLocaleString() || 'N/A' },
      { label: 'Peer Median', value: latestYear.peerMedianPerBeneDollars !== null ? formatCurrency(latestYear.peerMedianPerBeneDollars) : 'N/A' },
      { label: 'Peer 75th %ile', value: latestYear.peerP75PerBeneDollars !== null ? formatCurrency(latestYear.peerP75PerBeneDollars) : 'N/A' },
      { label: 'Peer 99.5th %ile', value: latestYear.peerP995PerBeneDollars !== null ? formatCurrency(latestYear.peerP995PerBeneDollars) : 'N/A' },
    ];

    const cellW = CONTENT_W / 4;
    doc.setFillColor(...COLORS.grayLight);
    doc.roundedRect(MARGIN, y, CONTENT_W, 42, 4, 4, 'F');

    gridItems.forEach((item, i) => {
      const x = MARGIN + i * cellW + 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gray);
      doc.text(item.label, x, y + 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...COLORS.black);
      doc.text(item.value, x, y + 32);
    });

    y += 54;

    // Provider value line (10pt body)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gray);
    doc.text('This provider:', MARGIN, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.black);
    const provVal = latestYear.allowedPerBeneDollars !== null ? formatCurrency(latestYear.allowedPerBeneDollars) : 'N/A';
    doc.text(provVal, MARGIN + 70, y);
    if (latestYear.xVsPeerMedian) {
      const medText = `${latestYear.xVsPeerMedian.toFixed(1)}× median`;
      const px = MARGIN + 70 + doc.getTextWidth(provVal) + 8;
      doc.setFillColor(...COLORS.red);
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(8);
      const mw = doc.getTextWidth(medText) + 10;
      doc.roundedRect(px, y - 9, mw, 13, 3, 3, 'F');
      doc.text(medText, px + 5, y);
    }
    y += 20;
  }

  // Key Metrics row
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 16;

  const maxAllowed = Math.max(...data.flagYears.map(f => f.totalAllowedDollars));
  const drugPctValue = data.dataContext.drugPct;

  // Row 1: Max Allowed Amount | Years as Outlier | Drug %
  const row1 = [
    { label: 'Max Allowed Amount', value: formatCurrency(maxAllowed) },
    { label: 'Years as Outlier', value: `${data.yearsVerified} of ${data.flagYears.length}` },
    { label: 'Drug %', value: drugPctValue != null ? `${Math.floor(drugPctValue * 1000) / 10}%` : 'N/A' },
  ];
  const row1W = CONTENT_W / 3;
  row1.forEach((m, i) => {
    const x = MARGIN + i * row1W;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text(m.label, x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.black);
    doc.text(m.value, x, y + 14);
  });

  // Row 2: Peer Group | Peer Group Size
  const row2 = [
    { label: 'Peer Group', value: `${data.specialty}, ${data.state}` },
    { label: 'Peer Group Size', value: latestYear?.peerGroupSize ? `${latestYear.peerGroupSize.toLocaleString()} providers` : 'N/A' },
  ];
  const row2W = CONTENT_W / 2;
  row2.forEach((m, i) => {
    const x = MARGIN + i * row2W;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray);
    doc.text(m.label, x, y + 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.black);
    doc.text(m.value, x, y + 42);
  });

  y += 56;

  // ===== DATA CONTEXT (on page 1) =====
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 16;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.black);
  doc.text('Data Context', MARGIN, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gray);
  doc.text('These observations are derived from the provider\'s actual billing data and may explain the outlier classification.', MARGIN, y);
  y += 16;

  const ctx = data.dataContext;
  const insights: { label: string; text: string }[] = [];

  if (ctx.drugPct !== null && ctx.drugPct > 0.8) {
    insights.push({
      label: 'Drug-Driven Billing',
      text: `${Math.floor(ctx.drugPct * 1000) / 10}% of this provider's billing is drug-related. High allowed amounts are driven by medication costs, not service volume.`,
    });
  }
  if (ctx.totBenes !== null && ctx.totBenes < 50) {
    insights.push({
      label: 'Small Patient Panel',
      text: `Small patient panel (${ctx.totBenes} beneficiaries). Per-beneficiary statistics are amplified when the denominator is small.`,
    });
  }
  if (ctx.beneAvgRiskScore !== null && ctx.beneAvgRiskScore > 2.0) {
    insights.push({
      label: 'High-Acuity Patients',
      text: `High-acuity patient population (risk score: ${ctx.beneAvgRiskScore.toFixed(2)}). Sicker patients correlate with higher utilization.`,
    });
  }
  if (ctx.totHcpcsCds !== null && ctx.totHcpcsCds < 15) {
    insights.push({
      label: 'Narrow Procedure Set',
      text: `Narrow procedure set (${ctx.totHcpcsCds} codes). Suggests a focused subspecialty practice rather than general care.`,
    });
  }
  if (ctx.entityType === 'O') {
    insights.push({
      label: 'Organizational Provider',
      text: 'Billing is aggregated across the organization, not a single practitioner.',
    });
  }

  if (insights.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gray);
    doc.text('No specific data context flags identified for this provider.', MARGIN, y);
    y += 16;
  } else {
    insights.forEach((ins) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const splitText = doc.splitTextToSize(ins.text, CONTENT_W - 20);
      const textH = splitText.length * 10;
      const insightBoxH = 18 + textH + 6;

      doc.setFillColor(...COLORS.grayLight);
      doc.roundedRect(MARGIN, y, CONTENT_W, insightBoxH, 4, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.black);
      doc.text(ins.label, MARGIN + 10, y + 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gray);
      doc.text(splitText, MARGIN + 10, y + 24);
      y += insightBoxH + 8;
    });
  }

  // Per-Year Statistical Breakdown table (on page 1, after Data Context)
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.black);
  doc.text('Per-Year Statistical Breakdown', MARGIN, y);
  y += 6;

  const tableBody = data.flagYears.map((fy) => [
    fy.year.toString(),
    fy.beneficiaries?.toLocaleString() ?? 'N/A',
    fy.services?.toLocaleString() ?? 'N/A',
    formatCurrency(fy.totalAllowedDollars),
    fy.allowedPerBeneDollars !== null ? formatCurrency(fy.allowedPerBeneDollars) : 'N/A',
    fy.peerMedianPerBeneDollars !== null ? formatCurrency(fy.peerMedianPerBeneDollars) : 'N/A',
    fy.xVsPeerMedian !== null ? `${fy.xVsPeerMedian.toFixed(1)}×` : 'N/A',
    fy.verifiedTop05 ? 'Top 0.5%' : `Top ${((1 - fy.percentile_rank) * 100).toFixed(2)}%`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Year', 'Benes', 'Services', 'Total Allowed', 'Allowed/Bene', 'Peer Median', 'vs Median', 'Percentile']],
    body: tableBody,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 4, font: 'helvetica' },
    headStyles: { fillColor: COLORS.banner, textColor: COLORS.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'center' },
      7: { halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body' && hookData.column.index === 7) {
        const text = hookData.cell.raw as string;
        if (text === 'Top 0.5%') {
          hookData.cell.styles.textColor = COLORS.red;
        }
      }
    },
  });

  addFooter(doc, 1);

  // ===== PAGE 2 (Charts only) =====
  doc.addPage();
  y = MARGIN;

  if (barCapture) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.black);
    doc.text('Allowed per Beneficiary Comparison', MARGIN, y);
    y += 14;
    const imgH = getChartImgHeight(barCapture);
    doc.addImage(barCapture.dataUrl, 'PNG', MARGIN, y, CONTENT_W, imgH);
    y += imgH + 18;
  }

  if (lineCapture) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.black);
    doc.text('Trend Over Time', MARGIN, y);
    y += 14;
    const imgH = getChartImgHeight(lineCapture);
    doc.addImage(lineCapture.dataUrl, 'PNG', MARGIN, y, CONTENT_W, imgH);
    y += imgH + 18;
  }

  addFooter(doc, 2);

  // Save
  const slugName = data.providerName
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/\s+/g, '_')
    .replace(/,+/g, '_')
    .replace(/_+/g, '_')
    .trim()
    .slice(0, 80);

  doc.save(`${data.npi}_${slugName}.pdf`);
}
