import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/sq/AppShell";
import { BadgePill, Card, Meter, SectionTitle } from "@/components/sq/bits";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSq, levelFromXp } from "@/lib/sq/store";
import { screeningCompletion } from "@/lib/sq/analysis";
import { FullScreenLoader } from "@/components/sq/FullScreenLoader";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My profile — SkillQuest | DUT" },
      {
        name: "description",
        content:
          "Manage your SkillQuest student profile, badges, XP and POPIA data-sharing consent.",
      },
      { property: "og:title", content: "My SkillQuest profile" },
      {
        property: "og:description",
        content: "Your details, achievements and control over what the Disability Unit can see.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { currentUser, progress, ready, setConsent } = useSq();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !currentUser) navigate({ to: "/login" });
  }, [ready, currentUser, navigate]);

  if (!ready) return <FullScreenLoader />;
  if (!currentUser) return null;

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-black">My profile</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="grid size-16 place-items-center rounded-2xl font-display text-2xl font-bold text-white"
              style={{ backgroundImage: "var(--gradient-violet)" }}
            >
              {currentUser.name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <h2 className="font-display text-2xl font-bold">{currentUser.name}</h2>
              <p className="text-sm text-muted-foreground">{currentUser.email}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Student number", currentUser.studentNumber ?? "—"],
              ["Faculty", currentUser.faculty ?? "—"],
              ["Year of study", currentUser.yearOfStudy ?? "—"],
              ["Joined", new Date(currentUser.createdAt).toLocaleDateString()],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-muted/40 p-3">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          <SectionTitle title="Privacy & consent" />
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="consent-switch" className="text-base font-semibold">
                  Share my screening report with the DUT Disability Unit
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  When on, authorised Disability Unit staff can see your skill profile and history so
                  they can offer support. When off, nothing leaves your account. You can change this
                  whenever you like.
                </p>
              </div>
              <Switch
                id="consent-switch"
                checked={currentUser.consentShare}
                onCheckedChange={(v) => setConsent(v)}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              SkillQuest records accuracy, response time, attempts, hints, levels and checkpoint
              results. It never records what you type outside a game answer, and it never produces a
              diagnosis or IQ score. Handled in line with POPIA.
            </p>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-lg font-bold">Quest stats</h2>
            <div className="mt-4 space-y-4">
              <Meter value={screeningCompletion(progress)} label="Screening completeness" tone="cyan" />
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  ["Level", levelFromXp(progress.xp)],
                  ["XP", progress.xp],
                  ["Streak", `${progress.streak} days`],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
                    <p className="font-display text-xl font-bold">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-bold">Badges</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {progress.badges.length ? (
                progress.badges.map((b) => <BadgePill key={b} label={b} />)
              ) : (
                <p className="text-sm text-muted-foreground">No badges yet — play a level to start.</p>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="font-display text-lg font-bold">Quick links</h2>
            <div className="mt-3 grid gap-2">
              <Button asChild variant="outline">
                <Link to="/settings">Accessibility settings</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/history">Screening history</Link>
              </Button>
              <Button asChild>
                <Link to="/report">My screening report</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
