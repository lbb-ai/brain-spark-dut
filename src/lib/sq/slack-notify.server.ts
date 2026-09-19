import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DOMAIN_MAP } from "@/lib/sq/domains";
import { BAND_META } from "@/lib/sq/analysis";
import type { DomainSummary } from "@/lib/sq/types";

/**
 * Posts a referral notification to the Disability Unit's Slack channel
 * via an incoming webhook. Called alongside the email notification
 * whenever a student submits a new referral request.
 */
export const sendSlackReferralNotification = createServerFn({ method: "POST" })
  .validator((data: { referralId: string }) => {
    if (!data?.referralId) throw new Error("Missing referralId");
    return data;
  })
  .handler(async ({ data }) => {
    const webhookUrl = process.env["SLACK_WEBHOOK_URL"];
    if (!webhookUrl) {
      console.warn("[slack-notify] SLACK_WEBHOOK_URL not set — skipping Slack notification");
      return { slackStatus: "skipped" as const, reason: "Webhook URL not configured" };
    }

    // ── Look up referral + profile + latest report ──────────────────────
    const { data: referral, error: refErr } = await supabaseAdmin
      .from("referrals")
      .select("*")
      .eq("id", data.referralId)
      .maybeSingle();

    if (refErr || !referral) {
      return { slackStatus: "failed" as const, error: "Referral not found" };
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
      return { slackStatus: "failed" as const, error: "Student profile not found" };
    }

    // ── Build Slack message blocks ──────────────────────────────────────
    const overall = (latestReport?.overall as string) ?? "unknown";
    const bandMeta = BAND_META[overall as keyof typeof BAND_META];
    const overallEmoji =
      overall === "low" ? ":large_green_circle:" : overall === "moderate" ? ":large_orange_circle:" : overall === "higher" ? ":red_circle:" : ":white_circle:"    ;
    const overallLabel = bandMeta?.label ?? "Not yet assessed";

    const domains = (latestReport?.domains ?? []) as unknown as DomainSummary[];
    const domainFields = domains.slice(0, 6).map((d) => {
      const meta = DOMAIN_MAP[d.domain];
      const band = BAND_META[d.band];
      const emoji = d.band === "low" ? ":white_check_mark:" : d.band === "moderate" ? ":warning:" : ":rotating_light:";
      return {
        type: "mrkdwn",
        text: `${emoji} *${meta.skillLabel}*\n${band.label} · L${d.levelReached} · ${d.accuracy}% accuracy`,
      };
    });

    const blocks: Record<string, unknown>[] = [
      {
        type: "header",
        text: { type: "plain_text", text: "🔔 New Referral Request" },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Student:*\n${profile.name}` },
          { type: "mrkdwn", text: `*Email:*\n${profile.email ?? "—"}` },
          { type: "mrkdwn", text: `*Student No:*\n${profile.student_number ?? "—"}` },
          { type: "mrkdwn", text: `*Faculty:*\n${profile.faculty ?? "—"}` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${overallEmoji} *Overall indicator: ${overallLabel}*`,
        },
      },
    ];

    if (domainFields.length) {
      blocks.push({
        type: "section",
        fields: domainFields,
      });
    }

    if (referral.message) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*Student's message:*\n> ${referral.message}` },
      });
    }

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Preferred contact:* ${referral.contact_preference ?? "Email"}`,
      },
    });

    blocks.push({ type: "divider" });

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Referral ID: ${referral.id} · Submitted ${new Date(referral.created_at).toLocaleString("en-ZA")}`,
        },
      ],
    });

    // ── Send to Slack ───────────────────────────────────────────────────
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("[slack-notify] Slack webhook returned", res.status, body);
        return { slackStatus: "failed" as const, error: `Slack returned ${res.status}` };
      }

      return { slackStatus: "sent" as const };
    } catch (err) {
      console.error("[slack-notify] Unexpected error:", err);
      return { slackStatus: "failed" as const, error: "Slack service unavailable" };
    }
  });
