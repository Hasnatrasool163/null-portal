import "server-only";
import { BRAND } from "@/lib/brand";
import { jsPDF } from "jspdf";
import type {
  CandidateResultView,
  ExamGradingResponse,
} from "@/shared/schemas/grading";
import type { ExamAnalyticsResponse } from "@/shared/schemas/secondary";

// Brand palette (matches the ExamShield emblem & warm-paper academic theme)
const NAVY: [number, number, number] = [19, 38, 66];
const GOLD: [number, number, number] = [232, 157, 36];
const INK: [number, number, number] = [27, 36, 48];
const MUTED: [number, number, number] = [90, 98, 112];
const BORDER: [number, number, number] = [214, 207, 191];
const ZEBRA: [number, number, number] = [250, 247, 242];
const HEADER_BG: [number, number, number] = [238, 242, 246];
const WARN_TXT: [number, number, number] = [138, 90, 0];

const MARGIN = 40;
const PAGE_BOTTOM_PAD = 46;

const TYPE_SHORT: Record<string, string> = {
  MCQ_SINGLE: "Single MCQ",
  MCQ_MULTI: "Multi MCQ",
  WRITTEN: "Written",
};

/** ASCII-safe sanitization so built-in Helvetica never renders missing-glyph boxes. */
function safeText(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2192/g, "->")
    .replace(/\u2022|\u00B7/g, "|")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, " ");
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export function slugifyFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug || "exam";
}

function scoreBand(pct: number): string {
  if (pct >= 85) return "Distinction";
  if (pct >= 70) return "Merit";
  if (pct >= 50) return "Pass";
  return "Below Pass";
}

function drawHeaderBand(
  doc: jsPDF,
  title: string,
  subtitle: string,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  // Deep navy top bar
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 68, "F");
  // Subtle gold accent strip
  doc.setFillColor(...GOLD);
  doc.rect(0, 68, pageW, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(220, 228, 238);
  doc.text("NULL-PORTAL  |  SECURE EXAMINATION MANAGEMENT", MARGIN, 24);

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(safeText(title), MARGIN, 46);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 212, 226);
  doc.text(safeText(subtitle), MARGIN, 60);

  doc.setTextColor(...INK);
  return 90;
}

function drawKpiRow(
  doc: jsPDF,
  y: number,
  cards: { label: string; value: string }[],
  maxWidth?: number,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const availW = maxWidth ?? pageW - MARGIN * 2;
  const gap = 8;
  const cardW = (availW - gap * (cards.length - 1)) / cards.length;
  const cardH = 46;

  for (let i = 0; i < cards.length; i++) {
    const x = MARGIN + i * (cardW + gap);
    doc.setFillColor(...ZEBRA);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.75);
    doc.roundedRect(x, y, cardW, cardH, 4, 4, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(safeText(cards[i].label).toUpperCase(), x + 10, y + 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...NAVY);
    doc.text(safeText(cards[i].value), x + 10, y + 35);
  }
  doc.setTextColor(...INK);
  return y + cardH + 18;
}

function drawSectionHeading(doc: jsPDF, y: number, title: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 110) {
    doc.addPage();
    y = 46;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...NAVY);
  doc.text(safeText(title), MARGIN, y);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 5, pageW - MARGIN, y + 5);
  doc.setTextColor(...INK);
  return y + 16;
}

type ColDef = {
  header: string;
  width: number;
  align?: "left" | "right" | "center";
};

function drawTable(
  doc: jsPDF,
  startY: number,
  cols: ColDef[],
  rows: { cells: string[]; warn?: boolean }[],
): number {
  const pageH = doc.internal.pageSize.getHeight();
  const totalW = cols.reduce((s, c) => s + c.width, 0);
  const padX = 6;
  const lineH = 11;
  let y = startY;

  const drawHeader = () => {
    doc.setFillColor(...HEADER_BG);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.6);
    doc.rect(MARGIN, y, totalW, 20, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    let cx = MARGIN;
    for (const col of cols) {
      const tx =
        col.align === "right"
          ? cx + col.width - padX
          : col.align === "center"
            ? cx + col.width / 2
            : cx + padX;
      doc.text(safeText(col.header), tx, y + 13, { align: col.align ?? "left" });
      cx += col.width;
    }
    doc.setTextColor(...INK);
    y += 20;
  };

  drawHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const row = rows[rIdx];
    const wrapped = cols.map((col, ci) =>
      doc.splitTextToSize(safeText(row.cells[ci] ?? ""), col.width - padX * 2),
    );
    const maxLines = Math.max(1, ...wrapped.map((w) => w.length));
    const rowH = Math.max(20, maxLines * lineH + 8);

    if (y + rowH > pageH - PAGE_BOTTOM_PAD) {
      doc.addPage();
      y = 44;
      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
    }

    if (rIdx % 2 === 1) {
      doc.setFillColor(...ZEBRA);
      doc.rect(MARGIN, y, totalW, rowH, "F");
    }
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.4);
    doc.rect(MARGIN, y, totalW, rowH, "S");

    let cx = MARGIN;
    for (let ci = 0; ci < cols.length; ci++) {
      const col = cols[ci];
      const lines = wrapped[ci];
      doc.setTextColor(...(row.warn && ci === 2 ? WARN_TXT : INK));
      const tx =
        col.align === "right"
          ? cx + col.width - padX
          : col.align === "center"
            ? cx + col.width / 2
            : cx + padX;
      doc.text(lines, tx, y + 12.5, { align: col.align ?? "left" });
      cx += col.width;
    }
    doc.setTextColor(...INK);
    y += rowH;
  }

  return y + 16;
}

function drawFooters(doc: jsPDF, leftText: string) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, pageH - 34, pageW - MARGIN, pageH - 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(safeText(leftText), MARGIN, pageH - 20);
    doc.text(`Page ${i} of ${pages}`, pageW - MARGIN, pageH - 20, {
      align: "right",
    });
  }
}

export type ExtensionAuditRow = {
  candidateName: string;
  minutes: number;
  reason: string;
  grantedByName: string;
  createdAt: string;
};

/** Renders the Examiner Examination Summary PDF (A4, structured tables, real attempts only). */
export function renderExamSummaryPdf(params: {
  grading: ExamGradingResponse;
  analytics: ExamAnalyticsResponse;
  extensions: ExtensionAuditRow[];
}): { buffer: Uint8Array; filename: string } {
  const { grading, analytics, extensions } = params;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const contentW = doc.internal.pageSize.getWidth() - MARGIN * 2; // 515 pt

  let y = drawHeaderBand(
    doc,
    analytics.examTitle,
    `Examination Summary Report  |  Generated ${fmtDate(new Date().toISOString())}  |  Real attempts only (sandbox excluded)`,
  );

  const avgPct =
    analytics.averageScore !== null && analytics.totalMarks > 0
      ? `${Math.round((analytics.averageScore / analytics.totalMarks) * 1000) / 10}%`
      : "-";

  y = drawKpiRow(doc, y, [
    { label: "Submitted", value: String(analytics.submittedAttempts) },
    { label: "Total Marks", value: String(analytics.totalMarks) },
    {
      label: "Average",
      value:
        analytics.averageScore !== null
          ? `${analytics.averageScore} (${avgPct})`
          : "-",
    },
    {
      label: "High / Low",
      value:
        analytics.highestScore !== null
          ? `${analytics.highestScore} / ${analytics.lowestScore ?? "-"}`
          : "-",
    },
  ]);

  // 1. Candidate Scores Table
  y = drawSectionHeading(
    doc,
    y,
    `Candidate Results (${grading.attempts.length})`,
  );
  if (grading.attempts.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No real candidate attempts recorded yet.", MARGIN, y);
    y += 20;
  } else {
    y = drawTable(
      doc,
      y,
      [
        { header: "Candidate", width: 120 },
        { header: "Email", width: 145 },
        { header: "Status", width: 95 },
        { header: "Score", width: 65, align: "right" },
        { header: "%", width: 45, align: "right" },
        { header: "Late", width: 45, align: "center" },
      ],
      grading.attempts.map((a) => {
        const pct =
          a.totalScore !== null && a.totalMarks > 0
            ? `${Math.round((a.totalScore / a.totalMarks) * 100)}%`
            : "-";
        return {
          cells: [
            a.candidateName,
            a.candidateEmail,
            a.status === "IN_PROGRESS"
              ? "In progress"
              : a.gradingStatus === "NEEDS_REVIEW"
                ? `Needs review (${a.pendingWrittenCount})`
                : a.gradingStatus === "AUTO_GRADED"
                  ? "Auto-graded"
                  : "Graded",
            a.totalScore !== null ? `${a.totalScore} / ${a.totalMarks}` : "-",
            pct,
            a.lateSyncCount > 0 ? String(a.lateSyncCount) : "-",
          ],
          warn: a.gradingStatus === "NEEDS_REVIEW",
        };
      }),
    );
  }

  // 2. Per-Question Analytics Table
  y = drawSectionHeading(
    doc,
    y,
    `Per-Question Analytics (${analytics.questions.length} questions)`,
  );
  y = drawTable(
    doc,
    y,
    [
      { header: "#", width: 24, align: "center" },
      { header: "Question & Topic", width: 206 },
      { header: "Difficulty", width: 90 },
      { header: "Full %", width: 48, align: "right" },
      { header: "Skip %", width: 47, align: "right" },
      { header: "Top Wrong Distractor", width: 100 },
    ],
    analytics.questions.map((q) => ({
      cells: [
        String(q.position + 1),
        `${q.body}\n[${q.topicName} | ${TYPE_SHORT[q.type] ?? q.type} | ${q.marks} pts]`,
        q.difficultyMismatch && q.observedDifficulty
          ? `${q.declaredDifficulty} -> ${q.observedDifficulty} (!)`
          : q.declaredDifficulty,
        `${q.percentCorrect}%`,
        `${q.skipRate}%`,
        q.type === "WRITTEN" ? "Written" : (q.mostCommonWrong ?? "None"),
      ],
      warn: q.difficultyMismatch,
    })),
  );

  // 3. Audited Time Extensions Table (if any)
  if (extensions.length > 0) {
    y = drawSectionHeading(
      doc,
      y,
      `Audited Time Extensions (${extensions.length})`,
    );
    drawTable(
      doc,
      y,
      [
        { header: "Candidate", width: 115 },
        { header: "Added", width: 55, align: "right" },
        { header: "Reason", width: contentW - 335 },
        { header: "Granted By", width: 85 },
        { header: "When (UTC)", width: 80 },
      ],
      extensions.map((e) => ({
        cells: [
          e.candidateName,
          `+${e.minutes} min`,
          e.reason,
          e.grantedByName,
          fmtDate(e.createdAt).slice(0, 16),
        ],
      })),
    );
  }

  drawFooters(
    doc,
    `${BRAND.name} Examination Summary  |  ${analytics.examTitle}`,
  );

  return {
    buffer: new Uint8Array(doc.output("arraybuffer")),
    filename: `exam-summary-${slugifyFilename(analytics.examTitle)}.pdf`,
  };
}

/** Renders the Candidate Verifiable Result PDF (A4, QR verification box, score KPIs, question table). */
export function renderCandidateResultPdf(params: {
  result: CandidateResultView;
  code: string;
  verifyUrl: string;
  qrDataUrl: string;
}): { buffer: Uint8Array; filename: string } {
  const { result, code, verifyUrl, qrDataUrl } = params;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  let y = drawHeaderBand(
    doc,
    "Official Examination Result",
    `${result.examTitle}  |  Issued ${fmtDate(new Date().toISOString())}`,
  );

  // Candidate details (left) + QR Verification Box (right)
  const qrBoxW = 112;
  const qrBoxX = pageW - MARGIN - qrBoxW;
  const leftW = pageW - MARGIN * 2 - qrBoxW - 14;

  doc.setFillColor(...ZEBRA);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.75);
  doc.roundedRect(qrBoxX, y, qrBoxW, 118, 4, 4, "FD");
  doc.addImage(qrDataUrl, "PNG", qrBoxX + 14, y + 8, 84, 84);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...NAVY);
  doc.text("SCAN TO VERIFY", qrBoxX + qrBoxW / 2, y + 101, { align: "center" });
  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...INK);
  doc.text(code, qrBoxX + qrBoxW / 2, y + 112, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text(safeText(result.candidateName), MARGIN, y + 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Exam: ${safeText(result.examTitle)}`, MARGIN, y + 32);
  doc.text(`Submitted: ${fmtDate(result.submittedAt)}`, MARGIN, y + 46);
  doc.text(
    `Published: ${fmtDate(result.resultsPublishedAt)}`,
    MARGIN,
    y + 60,
  );

  drawKpiRow(
    doc,
    y + 72,
    [
      { label: "Score", value: `${result.totalScore} / ${result.totalMarks}` },
      { label: "Percentage", value: `${result.percentage}%` },
      { label: "Band", value: scoreBand(result.percentage) },
    ],
    leftW,
  );

  y += 136;

  y = drawSectionHeading(
    doc,
    y,
    `Question Breakdown (${result.questions.length} questions)`,
  );
  drawTable(
    doc,
    y,
    [
      { header: "#", width: 24, align: "center" },
      { header: "Question", width: 246 },
      { header: "Type", width: 65 },
      { header: "Score", width: 60, align: "right" },
      { header: "Examiner Feedback", width: 120 },
    ],
    result.questions.map((q) => ({
      cells: [
        String(q.position + 1),
        q.body,
        TYPE_SHORT[q.type] ?? q.type,
        `${q.score ?? 0} / ${q.marks}`,
        q.feedback ?? "-",
      ],
    })),
  );

  drawFooters(doc, `Verify online: ${verifyUrl}`);

  return {
    buffer: new Uint8Array(doc.output("arraybuffer")),
    filename: `result-${slugifyFilename(result.examTitle)}-${code}.pdf`,
  };
}
