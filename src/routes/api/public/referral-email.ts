import { createAPIFileRoute } from "@tanstack/react-start/api";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DOMAIN_MAP } from "@/lib/sq/domains";
import { BAND_META } from "@/lib/sq/analysis";
import type { DomainSummary } from "@/lib/sq/types";

const DISABILITY_UNIT_EMAIL =
  process.env["DISABILITY_UNIT_EMAIL"] ?? "disability-unit@university.ac.za";
const FROM_EMAIL = process.env["RESEND_FROM_EMAIL"] ?? "SkillQuest <noreply@university.ac.za>";

export const APIRoute = createAPIFileRoute("/api/public/referral-email")({
  POST: async ({ request }) => {
    let body: { referralId?: string };
    try {
      body = (await request.json()) as { referralId?: string };
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { referralId } = body;
    if (!referralId) return json({ error: "Missing referralId" }, 400);

    // ── Look up referral + profile + latest report ──────────────────────
    const { data: referral, error: refErr } = await supabaseAdmin
      .from("referrals")
      .select("*")
      .eq("id", referralId)
      .maybeSingle();

    if (refErr || !referral) {
      return json({ error: "Referral not found", emailStatus: "failed" }, 404);
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", referral.student_id)
      .maybeSingle();

    const { data: latestReport } = await supabaseAdmin
      .from("reports")
      .select("*")
      .eq("user_id", referral.student_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!profile) {
      await updateEmailStatus(referralId, "failed");
      return json({ error: "Student profile not found", emailStatus: "failed" }, 404);
    }

    // ── Compose email ───────────────────────────────────────────────────
    const domains = (latestReport?.domains ?? []) as unknown as DomainSummary[];
    const overall = (latestReport?.overall as string) ?? "unknown";
    const subject = `New SkillQuest screening referral — ${profile.name}`;

    const html = buildEmailHtml({
      studentName: profile.name,
      studentEmail: profile.email,
      studentNumber: profile.student_number,
      faculty: profile.faculty,
      yearOfStudy: profile.year_of_study,
      overallBand: overall,
      summaryText: latestReport?.summary_text,
      totalAttempts: latestReport?.total_attempts,
      domains,
      message: referral.message,
      contactPreference: referral.contact_preference,
      reportDate: latestReport?.created_at,
    });

    // ── Send via Resend ─────────────────────────────────────────────────
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env["RESEND_API_KEY"]);

      const { error: sendErr } = await resend.emails.send({
        from: FROM_EMAIL,
        to: DISABILITY_UNIT_EMAIL,
        subject,
        html,
      });

      if (sendErr) {
        console.error("[referral-email] Resend error:", sendErr);
        await updateEmailStatus(referralId, "failed");
        return json({ error: "Email send failed", emailStatus: "failed" }, 502);
      }

      await updateEmailStatus(referralId, "sent");
      return json({ emailStatus: "sent" }, 200);
    } catch (err) {
      console.error("[referral-email] Unexpected error:", err);
      await updateEmailStatus(referralId, "failed");
      return json({ error: "Email service unavailable", emailStatus: "failed" }, 503);
    }
  },
});

// ── Helpers ─────────────────────────────────────────────────────────────

async function updateEmailStatus(referralId: string, status: string) {
  await supabaseAdmin
    .from("referrals")
    .update({ email_status: status, updated_at: new Date().toISOString() })
    .eq("id", referralId);
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function buildEmailHtml(input: {
  studentName: string;
  studentEmail: string;
  studentNumber: string | null;
  faculty: string | null;
  yearOfStudy: string | null;
  overallBand: string;
  summaryText: string | null;
  totalAttempts: number | null;
  domains: DomainSummary[];
  message: string | null;
  contactPreference: string | null;
  reportDate: string | null;
}): string {
  const bandLabel =
    input.overallBand === "low"
      ? "Low concern"
      : input.overallBand === "moderate"
        ? "Moderate concern"
        : input.overallBand === "higher"
          ? "Higher concern"
          : "Not yet assessed";

  const bandColor =
    input.overallBand === "low"
      ? "#16a34a"
      : input.overallBand === "moderate"
        ? "#d97706"
        : input.overallBand === "higher"
          ? "#dc2626"
          : "#6b7280";

  const domainRows = input.domains.length
    ? input.domains
        .map((d) => {
          const meta = DOMAIN_MAP[d.domain];
          const band = BAND_META[d.band];
          return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">${meta.skillLabel}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;">${meta.name}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${d.levelReached}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">${d.accuracy}%</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:${band.tone.includes("success") ? "#16a34a" : band.tone.includes("warning") ? "#d97706" : "#dc2626"};">${band.label}</td>
        </tr>`;
        })
        .join("")
    : `<tr><td colspan="5" style="padding:16px;text-align:center;color:#6b7280;">No screening report data available yet.</td></tr>`;

  const reportDateStr = input.reportDate
    ? new Date(input.reportDate).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not yet generated";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0f172a;padding:28px 32px;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">SkillQuest Screening Referral</h1>
            <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">A student has requested support from the Disability Unit</p>
          </td>
        </tr>

        <!-- Student details -->
        <tr>
          <td style="padding:28px 32px;">
            <h2 style="margin:0 0 16px;font-size:16px;color:#0f172a;">Student details</h2>
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;width:130px;">Name</td><td style="padding:4px 0;font-size:14px;font-weight:600;">${input.studentName}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Email</td><td style="padding:4px 0;font-size:14px;">${input.studentEmail}</td></tr>
              ${input.studentNumber ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Student number</td><td style="padding:4px 0;font-size:14px;">${input.studentNumber}</td></tr>` : ""}
              ${input.faculty ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Faculty</td><td style="padding:4px 0;font-size:14px;">${input.faculty}</td></tr>` : ""}
              ${input.yearOfStudy ? `<tr><td style="padding:4px 0;color:#6b7280;font-size:13px;">Year of study</td><td style="padding:4px 0;font-size:14px;">${input.yearOfStudy}</td></tr>` : ""}
            </table>
          </td>
        </tr>

        <!-- Overall indicator -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;">
              <tr>
                <td style="padding:16px 20px;">
                  <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Overall screening indicator</span>
                  <p style="margin:6px 0 0;font-size:18px;font-weight:700;color:${bandColor};">${bandLabel}</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#374151;">${input.summaryText ?? "No summary available."}</p>
                  <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Report generated: ${reportDateStr} · ${input.totalAttempts ?? 0} recorded interactions</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Domain breakdown -->
        <tr>
          <td style="padding:0 32px 24px;">
            <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Skill profile by domain</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Skill area</th>
                  <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Game</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">Level</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">Accuracy</th>
                  <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:600;">Indicator</th>
                </tr>
              </thead>
              <tbody>${domainRows}</tbody>
            </table>
          </td>
        </tr>

        <!-- Student message -->
        ${input.message ? `
        <tr>
          <td style="padding:0 32px 24px;">
            <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Student's message</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
              <tr><td style="padding:16px 20px;font-size:14px;color:#374151;line-height:1.6;">${escapeHtml(input.message)}</td></tr>
            </table>
          </td>
        </tr>` : ""}

        <!-- Contact preference -->
        ${input.contactPreference ? `
        <tr>
          <td style="padding:0 32px 24px;">
            <p style="margin:0;font-size:13px;color:#6b7280;">Preferred contact method: <strong style="color:#0f172a;">${escapeHtml(input.contactPreference)}</strong></p>
          </td>
        </tr>` : ""}

        <!-- Disclaimer -->
        <tr>
          <td style="padding:0 32px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;">
              <tr><td style="padding:14px 20px;font-size:12px;color:#92400e;line-height:1.5;">
                <strong>Important:</strong> SkillQuest is a screening tool, not a diagnostic instrument. These results describe gameplay patterns and should inform — not replace — a professional assessment. The student has consented to share this information with the Disability Unit.
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">This referral was generated automatically by SkillQuest. Reply directly to the student to arrange a consultation.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
