import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/sq/AppShell";
import { BandChip, Card, Disclaimer, Meter, SectionTitle } from "@/components/sq/bits";
import { Button } from "@/components/ui/button";
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
          "A plain-language SkillQuest skill profile across six domains, with a clear route to [UNIVERSITY NAME] Disability Unit support. Screening only, never a diagnosis.",
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
  const { currentUser, progress, ready, generateReport, setConsent } = useSq();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (ready && !currentUser) navigate({ to: "/login" });
  }, [ready, currentUser, navigate]);

  if (!ready) return <FullScreenLoader />;
  if (!currentUser) return null;

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
            Talk to the [UNIVERSITY NAME] Disability Unit
          </h2>
          <p className="mt-2 max-w-2xl text-white/70">
            The Disability Unit offers confidential conversations, professional assessment and
            practical accommodations — extra writing time, alternative assessment formats, reading
            support and more. Bringing this report along gives them a useful starting point.
          </p>
          <dl className="mt-5 grid gap-4 text-sm text-white/80 sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-white">Where</dt>
              <dd className="rounded-md border border-dashed border-white/30 px-2 py-1 text-white/60">
                [Disability Unit location — to be added]
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Email</dt>
              <dd className="rounded-md border border-dashed border-white/30 px-2 py-1 text-white/60">
                [Disability Unit email — to be added]
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Booking</dt>
              <dd className="rounded-md border border-dashed border-white/30 px-2 py-1 text-white/60">
                [Booking link / process — to be added]
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-white/40">
            Placeholder contact details — replace with the real Disability Unit's information before
            launch.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={() => {
                setConsent(true);
                setSaved(true);
                generateReport();
              }}
            >
              Share my report & request contact
            </Button>
            <span className="text-sm text-white/60">
              {currentUser.consentShare
                ? "Sharing is currently ON — you can switch it off in your profile."
                : "Sharing is currently OFF — nothing leaves your account."}
            </span>
          </div>
        </Card>
      </section>

      <Disclaimer className="mt-6" />
    </AppShell>
  );
}
