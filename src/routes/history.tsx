import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/sq/AppShell";
import { BandChip, Card, EmptyState, Meter, SectionTitle } from "@/components/sq/bits";
import { Button } from "@/components/ui/button";
import { DOMAIN_MAP } from "@/lib/sq/domains";
import { useSq } from "@/lib/sq/store";
import { FullScreenLoader } from "@/components/sq/FullScreenLoader";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Screening history — SkillQuest | DUT" },
      {
        name: "description",
        content:
          "Review every SkillQuest session, checkpoint and saved screening report over time.",
      },
      { property: "og:title", content: "SkillQuest screening history" },
      {
        property: "og:description",
        content: "Your sessions, checkpoints and saved reports in one timeline.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { currentUser, progress, ready } = useSq();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && !currentUser) navigate({ to: "/login" });
  }, [ready, currentUser, navigate]);

  if (!ready) return <FullScreenLoader />;
  if (!currentUser) return null;

  const runs = [...progress.levelRuns].reverse().slice(0, 25);
  const checkpoints = [...progress.checkpoints].reverse();

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-black">Screening history</h1>
      <p className="mt-1 text-muted-foreground">
        Your progress over time. Patterns matter more than any single session.
      </p>

      <SectionTitle title="Saved reports" />
      {progress.reports.length ? (
        <ul className="space-y-3">
          {progress.reports.map((r) => (
            <Card as="li" key={r.id} className="flex flex-wrap items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold">
                  Report · {new Date(r.createdAt).toLocaleDateString()}{" "}
                  <span className="text-muted-foreground">
                    ({new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">{r.summaryText}</p>
              </div>
              <BandChip band={r.overall} />
              <Button asChild variant="outline" size="sm">
                <Link to="/report">Open latest</Link>
              </Button>
            </Card>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No saved reports yet"
          body="Generate a report from the report page and it will be stored here so you can compare over time."
          action={
            <Button asChild>
              <Link to="/report">Go to my report</Link>
            </Button>
          }
        />
      )}

      <SectionTitle title="Checkpoint results" subtitle="Challenge rounds after every 10 levels." />
      {checkpoints.length ? (
        <ul className="space-y-3">
          {checkpoints.map((c) => (
            <Card as="li" key={c.id} className="grid gap-3 sm:grid-cols-[1fr_180px_180px] sm:items-center">
              <div>
                <p className="font-semibold">
                  {DOMAIN_MAP[c.domain].name} · Level {c.atLevel}
                </p>
                <p className="text-sm text-muted-foreground">{new Date(c.at).toLocaleString()}</p>
              </div>
              <Meter value={c.accuracy} label="Checkpoint" tone="cyan" />
              <Meter
                value={c.consistency}
                label="Consistency"
                tone={c.consistency >= 75 ? "success" : "warning"}
              />
            </Card>
          ))}
        </ul>
      ) : (
        <Card>
          <p className="text-sm text-muted-foreground">No checkpoints recorded yet.</p>
        </Card>
      )}

      <SectionTitle title="Recent levels" subtitle="Your last 25 completed levels." />
      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-sm">
          <caption className="sr-only">Recent completed levels</caption>
          <thead className="bg-muted/60 text-left">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Domain</th>
              <th scope="col" className="px-4 py-3 font-semibold">Level</th>
              <th scope="col" className="px-4 py-3 font-semibold">Accuracy</th>
              <th scope="col" className="px-4 py-3 font-semibold">Avg response</th>
              <th scope="col" className="px-4 py-3 font-semibold">When</th>
            </tr>
          </thead>
          <tbody>
            {runs.length ? (
              runs.map((r, i) => (
                <tr key={`${r.domain}-${r.at}-${i}`} className="border-t border-border">
                  <td className="px-4 py-3">{DOMAIN_MAP[r.domain].name}</td>
                  <td className="px-4 py-3">{r.level}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.accuracy >= 70
                          ? "text-success"
                          : r.accuracy >= 40
                            ? "text-warning"
                            : "text-destructive"
                      }
                    >
                      {r.accuracy}%
                    </span>
                  </td>
                  <td className="px-4 py-3">{(r.avgResponseMs / 1000).toFixed(1)}s</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.at).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No levels completed yet — <Link to="/play" className="text-primary underline">start playing</Link>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}
