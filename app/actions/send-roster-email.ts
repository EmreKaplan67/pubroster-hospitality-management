"use server";

import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { generateRosterPdfBuffer } from "@/lib/generate-roster-pdf";
import { formatWeekRange } from "@/lib/schedule-week";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

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

type StaffWithEmail = { id: string; name: string; email: string };
type Shift = {
  id?: string;
  staffId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  hours: string;
  breakMinutes?: string;
  color?: string;
};

function buildPersonalShiftsHtml(
  staffName: string,
  weekStart: string,
  shifts: Shift[]
): string {
  const weekLabel = formatWeekRange(weekStart);
  const staffShifts = shifts
    .filter((s) => s.staffId)
    .map((s) => {
      const day = getDayFromDate(s.shiftDate, weekStart);
      if (!day) return null;
      return `<tr><td>${day}</td><td>${formatTime(s.startTime)} – ${formatTime(s.endTime)}</td><td>${s.hours}h</td></tr>`;
    })
    .filter(Boolean)
    .join("");

  if (!staffShifts) {
    return `
      <p>Hi ${staffName},</p>
      <p>Your roster for <strong>${weekLabel}</strong> has been published. You have no shifts scheduled this week.</p>
      <p>The full roster is attached as a PDF.</p>
    `;
  }

  return `
    <p>Hi ${staffName},</p>
    <p>Your roster for <strong>${weekLabel}</strong> has been published. Here are your shifts this week:</p>
    <table style="border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background: #f1f5f9;">
          <th style="border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left;">Day</th>
          <th style="border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left;">Time</th>
          <th style="border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left;">Hours</th>
        </tr>
      </thead>
      <tbody>
        ${staffShifts}
      </tbody>
    </table>
    <p>The full roster for all staff is attached as a PDF.</p>
  `;
}

type SendResult = { success: true } | { success: false; error: string };

export async function sendRosterEmailsAction(
  weekStart: string,
  recipients: StaffWithEmail[],
  staff: { id: string; name: string }[],
  shifts: Shift[]
): Promise<SendResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Email is not configured. Add RESEND_API_KEY to your environment." };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const fromName = process.env.RESEND_FROM_NAME || "PubRoster";

  const pdfBuffer = generateRosterPdfBuffer(
    staff,
    shifts.map((s) => ({
      id: s.id ?? "",
      staffId: s.staffId,
      shiftDate: s.shiftDate,
      startTime: s.startTime,
      endTime: s.endTime,
      hours: s.hours,
      breakMinutes: s.breakMinutes ?? "0",
      color: s.color,
    })),
    weekStart
  );

  const weekLabel = formatWeekRange(weekStart);

  const resend = new Resend(apiKey);

  const errors: string[] = [];
  let firstErrorType: "quota" | "daily_quota" | "rate_limit" | null = null;
  for (const recipient of recipients) {
    const personalShifts = shifts.filter((s) => s.staffId === recipient.id);
    const html = buildPersonalShiftsHtml(recipient.name, weekStart, personalShifts);

    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: recipient.email,
      subject: `Your roster – ${weekLabel}`,
      html,
      attachments: [
        {
          filename: `roster-${weekStart}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      const msg = (error as { message?: string; name?: string }).message ?? String(error);
      const name = (error as { name?: string }).name ?? "";
      errors.push(`${recipient.name} (${recipient.email}): ${msg}`);
      // Capture first error type for user-friendly message
      if (!firstErrorType && (msg || name)) {
        const lower = `${msg} ${name}`.toLowerCase();
        if (lower.includes("daily_quota") || lower.includes("daily quota")) {
          firstErrorType = "daily_quota";
        } else if (lower.includes("monthly_quota") || lower.includes("monthly quota") || lower.includes("quota")) {
          firstErrorType = "quota";
        } else if (lower.includes("rate_limit") || lower.includes("rate limit") || lower.includes("too many")) {
          firstErrorType = "rate_limit";
        }
      }
    }
  }

  if (errors.length > 0) {
    let userMessage: string;
    if (firstErrorType === "quota" || firstErrorType === "daily_quota") {
      userMessage =
        "Your email sending limit has been reached. The Beta (free) version has limited capacity. Try again tomorrow, or use Download PDF to share the roster manually.";
    } else if (firstErrorType === "rate_limit") {
      userMessage =
        "Too many requests. Please wait a moment and try again.";
    } else {
      userMessage = `Could not send emails: ${errors.join("; ")}`;
    }
    return {
      success: false,
      error: userMessage,
    };
  }

  return { success: true };
}
