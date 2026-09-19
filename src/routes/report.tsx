import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/sq/AppShell";
import { BandChip, Card, Disclaimer, Meter, SectionTitle } from "@/components/sq/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DOMAIN_MAP } from "@/lib/sq/domains";
import { BAND_META, overallBand, screeningCompletion, summariseAll } from "@/lib/sq/analysis";
import { useSq } from "@/lib/sq/store";
import { FullScreenLoader } from "@/components/sq/FullScreenLoader";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "My screening report — SkillQuest | DUT" },
      {
        name: "description",
        content:
          "A plain-language SkillQuest skill profile across six domains, with a clear route to DUT Disability Unit support. Screening only, never a diagnosis.",
      },
      { property: "og:title", content: "My SkillQuest screening report" },
      {
        property: "og:description",
        content: "Strengths, areas to monitor and support options — no scores, no diagnosis.",
      },
    ],
  }),
  component: ReportPage,
});

function ReportPage() {
  const { currentUser, progress, ready, generateReport, setConsent, requestReferral } = useSq();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [referralMessage, setReferralMessage] = useState("");
  const [contactPreference, setContactPreference] = useState("Email");
  const [referralSending, setReferralSending] = useState(false);
  const [referralResult, setReferralResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (ready && !currentUser) navigate({ to: "/login" });
  }, [ready, currentUser, navigate]);

  if (!ready) return <FullScreenLoader />;
  if (!currentUser) return null;

  const submitReferral = async () => {
    setReferralSending(true);
    setReferralResult(null);
    setConsent(true);
    generateReport();
    const error = await requestReferral({
      message: referralMessage.trim() || "I would like to discuss my screening results and explore support options.",
      contactPreference,
    });
    setReferralSending(false);
    if (error) {
      setReferralResult({ ok: false, text: error });
    } else {
      setReferralResult({
        ok: true,
        text: "Your referral has been sent to the Disability Unit. They will reach out to you soon.",
      });
      setReferralOpen(false);
      setReferralMessage("");
    }
  };

  const domains = summariseAll(progress);
  const overall = overallBand(domains);
  const completion = screeningCompletion(progress);
  const played = domains.filter((d) => d.samples >= 5);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black">Your screening report</h1>
          <p className="mt-1 text-muted-foreground">
            Generated from {progress.attempts.length} recorded interactions ·{" "}
            {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              generateReport();
              setSaved(true);
            }}
          >
            Save to history
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print / save PDF
          </Button>
        </div>
      </div>

      {saved && (
        <p role="status" className="mt-4 rounded-xl border border-success/30 bg-success/8 px-4 py-3 text-sm text-success">
          ✓ Report saved to your screening history.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">Overall screening indicator</h2>
            <BandChip band={overall} />
          </div>
          <p className="mt-3 text-muted-foreground">{BAND_META[overall].description}</p>
          <p className="mt-3">
            {played.length < 3
              ? "You haven't played enough domains yet for a full picture. Try a few levels in each world for a reliable profile."
              : overall === "low"
                ? "Across the domains you've played, your performance is steady. Nothing here suggests a barrier at this stage."
                : overall === "moderate"
                  ? "One area shows some inconsistency. It's worth playing a few more sessions before drawing any conclusion."
                  : "A repeated pattern shows up in more than one area. Talking to the Disability Unit could be genuinely useful — it costs nothing to ask."}
          </p>
          <div className="mt-5">
            <Meter value={completion} label="Screening completeness" tone="cyan" />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-xl font-bold">What this is not</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>· Not a diagnosis of dyslexia, dyscalculia, ADHD or anything else.</li>
            <li>· Not an IQ score — SkillQuest never calculates one.</li>
            <li>· Not a judgement of ability, effort or intelligence.</li>
            <li>· Not shared with anyone unless you allow it.</li>
          </ul>
        </Card>
      </div>

      <SectionTitle
        title="Skill profile"
        subtitle="Each area is described in plain language, based on patterns across many attempts."
      />
      <ul className="grid gap-4 md:grid-cols-2">
        {domains.map((d) => {
          const meta = DOMAIN_MAP[d.domain];
          return (
            <Card as="li" key={d.domain}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold">{meta.skillLabel}</h3>
                  <p className="text-sm text-muted-foreground">
                    {meta.name} · Level {d.levelReached}
                  </p>
                </div>
                {d.samples >= 5 ? (
                  <BandChip band={d.band} />
                ) : (
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                    Not enough data
                  </span>
                )}
              </div>
              <p className="mt-3 font-semibold">
                {meta.skillLabel} — <span className="text-primary">{d.label}</span>
              </p>
              <div className="mt-3 space-y-3">
                <Meter
                  value={d.score}
                  label="Skill signal"
                  tone={d.band === "low" ? "success" : d.band === "moderate" ? "warning" : "destructive"}
                />
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>Accuracy {d.accuracy}%</span>
                  <span>
                    Avg {d.avgResponseMs ? (d.avgResponseMs / 1000).toFixed(1) : "—"}s
                  </span>
                  <span>{d.samples} attempts</span>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/play/$domain" params={{ domain: d.domain }}>
                  Practise {meta.short}
                </Link>
              </Button>
            </Card>
          );
        })}
      </ul>

      <section id="support" className="mt-10 scroll-mt-24">
        <Card className="surface-night p-8">
          <h2 className="font-display text-2xl font-bold text-white">
            Talk to the DUT Disability Unit
          </h2>
          <p className="mt-2 max-w-2xl text-white/70">
            The Disability Unit offers confidential conversations, professional assessment and
            practical accommodations — extra writing time, alternative assessment formats, reading
            support and more. Submit a referral below and they'll receive your screening report
            and reach out to you.
          </p>
          <dl className="mt-5 grid gap-4 text-sm text-white/80 sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-white">Where</dt>
              <dd className="rounded-md border border-white/20 px-2 py-1 text-white/70">
                DUT Disability Unit, Steve Biko Campus, Durban
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Email</dt>
              <dd className="rounded-md border border-white/20 px-2 py-1 text-white/70">
                disabilityunit@dut.ac.za
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Booking</dt>
              <dd className="rounded-md border border-white/20 px-2 py-1 text-white/70">
                Visit the Disability Unit office or call +27 31 373 2000
              </dd>
            </div>
          </dl>

          {referralResult && (
            <div
              role="alert"
              className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
                referralResult.ok
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              <span aria-hidden>{referralResult.ok ? "✓ " : "⚠ "}</span>
              {referralResult.text}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {!referralOpen ? (
              <>
                <Button
                  size="lg"
                  onClick={() => {
                    setConsent(true);
                    setSaved(true);
                    generateReport();
                    setReferralOpen(true);
                  }}
                >
                  Share my report & request contact
                </Button>
                <span className="text-sm text-white/60">
                  {currentUser.consentShare
                    ? "Sharing is currently ON — you can switch it off in your profile."
                    : "Sharing is currently OFF — nothing leaves your account."}
                </span>
              </>
            ) : (
              <div className="w-full max-w-xl space-y-4">
                <div>
                  <Label htmlFor="contact-pref" className="text-white">
                    Preferred contact method
                  </Label>
                  <select
                    id="contact-pref"
                    className="mt-1.5 h-11 w-full rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white"
                    value={contactPreference}
                    onChange={(e) => setContactPreference(e.target.value)}
                  >
                    <option value="Email" className="text-black">Email</option>
                    <option value="Phone call" className="text-black">Phone call</option>
                    <option value="In-person appointment" className="text-black">In-person appointment</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="referral-msg" className="text-white">
                    Message to the Disability Unit (optional)
                  </Label>
                  <textarea
                    id="referral-msg"
                    rows={4}
                    className="mt-1.5 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
                    placeholder="Describe what you'd like help with, or leave blank to send your screening report only."
                    value={referralMessage}
                    onChange={(e) => setReferralMessage(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button size="lg" disabled={referralSending} onClick={submitReferral}>
                    {referralSending ? "Sending referral…" : "Send referral to Disability Unit"}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={() => setReferralOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-white/50">
                  By sending, you consent to sharing your screening report with the Disability Unit.
                  You can withdraw this at any time in your profile settings.
                </p>
              </div>
            )}
          </div>
        </Card>
      </section>

      <Disclaimer className="mt-6" />
    </AppShell>
  );
}
