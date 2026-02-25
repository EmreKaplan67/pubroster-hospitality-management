import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatDayHeader, formatWeekRange } from "./schedule-week";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const DEFAULT_SHIFT_COLOR = "#e5e7eb";

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [229, 231, 235];
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Dublin",
  });
}

function getDayFromDate(shiftDate: string, weekStart: string): (typeof DAYS)[number] | null {
  const start = new Date(weekStart + "T12:00:00").getTime();
  const date = new Date(shiftDate + "T12:00:00").getTime();
  const diffDays = Math.round((date - start) / (24 * 60 * 60 * 1000));
  if (diffDays >= 0 && diffDays < 7) return DAYS[diffDays];
  return null;
}

type Staff = { id: string; name: string };
type Shift = {
  id: string;
  staffId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  hours: string;
  breakMinutes: string;
  color?: string;
};

export function downloadRosterPdf(
  staff: Staff[],
  shifts: Shift[],
  weekStart: string
): void {
  const shiftMap = new Map<string, Shift>();
  for (const s of shifts) {
    const day = getDayFromDate(s.shiftDate, weekStart);
    if (day) shiftMap.set(`${s.staffId}-${day}`, s);
  }

  const headers = [
    "Staff",
    ...DAYS.map((_, i) => formatDayHeader(weekStart, i)),
  ];

  const body: string[][] = staff.map((s) => [
    s.name,
    ...DAYS.map((day) => {
      const shift = shiftMap.get(`${s.id}-${day}`);
      if (!shift) return "—";
      return `${formatTime(shift.startTime)}–${formatTime(shift.endTime)}`;
    }),
  ]);

  const fillColorMatrix: (string | null)[][] = staff.map((s) => [
    null,
    ...DAYS.map((day) => {
      const shift = shiftMap.get(`${s.id}-${day}`);
      if (!shift) return null;
      return shift.color ?? DEFAULT_SHIFT_COLOR;
    }),
  ]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm" });
  const weekLabel = formatWeekRange(weekStart);

  doc.setFontSize(14);
  doc.text(`Roster – ${weekLabel}`, 14, 12);

  autoTable(doc, {
    head: [headers],
    body,
    startY: 18,
    theme: "grid",
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 40 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index > 0) {
        const rowIndex = data.row.index;
        const colIndex = data.column.index;
        const hexColor = fillColorMatrix[rowIndex]?.[colIndex];
        if (hexColor) {
          data.cell.styles.fillColor = hexToRgb(hexColor);
        }
      }
    },
  });

  const filename = `roster-${weekStart}.pdf`;
  doc.save(filename);
}
