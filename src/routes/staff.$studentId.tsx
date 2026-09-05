import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/sq/AppShell";
import { BandChip, Card, Disclaimer, Meter, SectionTitle, Stat } from "@/components/sq/bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DOMAIN_MAP } from "@/lib/sq/domains";
import { BAND_META, overallBand, screeningCompletion, summariseAll } from "@/lib/sq/analysis";
import { useSq } from "@/lib/sq/store";

export const Route = createFileRoute("/staff/$studentId")({
  head: () => ({
    meta: [
      { title: "Student case — SkillQuest | DUT Disability Unit" },
      {
        name: "description",
        content:
          "Consent-based view of a student's skill signals, checkpoint trend and follow-up history for the DUT Disability Unit.",
      },
      { property: "og:title", content: "SkillQuest student case view" },
      {
        property: "og:description",
        content: "Skill signals, checkpoint trend and recorded follow-up actions.",
      },
    ],
  }),
  component: StaffCase,
});

const ACTIONS = [
  "Invited student for a chat",
  "Referred for professional assessment",
  "Arranged learning support",
  "Monitoring — no action yet",
  "Case closed",
];

function StaffCase() {
  const { studentId } = Route.useParams();
  const { currentUser, state, progressFor, ready, addNote, log } = useSq();
  const navigate = useNavigate();
  const [action, setAction] = useState(ACTIONS[0] as string);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (ready && (!currentUser || currentUser.role === "student")) navigate({ to: "/login" });
  }, [ready, currentUser, navigate]);

  const student = state.users.find((u) => u.id === studentId);
  const progress = progressFor(studentId);
  const domains = useMemo(() => summariseAll(progress), [progress]);
  const overall = overallBand(domains);
  const notes = state.notes.filter((n) => n.studentId === studentId);

  if (!currentUser || currentUser.role === "student") return null;

  if (!student) {
    return (
      <AppShell>
        <Card>
          <h1 className="font-display text-xl font-bold">Student not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This case is no longer available.{" "}
            <Link to="/staff" className="text-primary underline-offset-2 hover:underline">
              Back to caseload
            </Link>
          </p>
        </Card>
      </AppShell>
    );
  }

  if (!student.consentShare) {
    return (
      <AppShell>
        <Card className="border-warning/40 bg-warning/5">
          <h1 className="font-display text-xl font-bold">Results not shared</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {student.name} has not consented to share screening results with the Disability Unit.
            Their gameplay data stays private, in line with POPIA.
          </p>
          <Link
            to="/staff"
            className="mt-4 inline-block font-semibold text-primary underline-offset-2 hover:underline"
          >
            Back to caseload
          </Link>
        </Card>
      </AppShell>
    );
  }

  const checkpoints = [...progress.checkpoints].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);

  return (
    <AppShell wide>
      <Link to="/staff" className="text-sm text-primary underline-offset-2 hover:underline">
        ← Back to caseload
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black">{student.name}</h1>
          <p className="text-muted-foreground">
            {student.studentNumber} · {student.faculty} · {student.yearOfStudy}
          </p>
        </div>
        <BandChip band={overall} />
      </div>

      <Card className="mt-6">
        <p className="text-sm text-muted-foreground">{BAND_META[overall].description}</p>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Screening complete" value={`${screeningCompletion(progress)}%`} />
        <Stat label="Recorded attempts" value={progress.attempts.length} />
        <Stat label="Checkpoints" value={progress.checkpoints.length} />
        <Stat label="Total XP" value={progress.xp} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionTitle
            title="Skill signals"
            subtitle="Patterns across many attempts, never a single result."
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {domains.map((d) => (
              <Card as="li" key={d.domain}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold">{DOMAIN_MAP[d.domain].skillLabel}</h3>
                    <p className="text-xs text-muted-foreground">{DOMAIN_MAP[d.domain].name}</p>
                  </div>
                  {d.samples >= 5 ? (
                    <BandChip band={d.band} />
                  ) : (
                    <span className="text-xs text-muted-foreground">Not enough data</span>
                  )}
                </div>
                <div className="mt-3">
                  <Meter
                    value={d.score}
                    label={d.label}
                    tone={d.band === "low" ? "success" : d.band === "moderate" ? "warning" : "destructive"}
                  />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>
                    <dt>Accuracy</dt>
                    <dd className="font-semibold text-foreground">{d.accuracy}%</dd>
                  </div>
                  <div>
                    <dt>Avg response</dt>
                    <dd className="font-semibold text-foreground">
                      {(d.avgResponseMs / 1000).toFixed(1)}s
                    </dd>
                  </div>
                  <div>
                    <dt>Level</dt>
                    <dd className="font-semibold text-foreground">{d.levelReached}</dd>
                  </div>
                </dl>
              </Card>
            ))}
          </ul>

          <div className="mt-10">
            <SectionTitle title="Checkpoint trend" subtitle="Consistency between play and recap rounds." />
          </div>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[540px] text-sm">
              <caption className="sr-only">Checkpoint results</caption>
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Area</th>
                  <th scope="col" className="px-4 py-3 font-semibold">At level</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Checkpoint</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Gameplay</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Consistency</th>
                </tr>
              </thead>
              <tbody>
                {checkpoints.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3">{DOMAIN_MAP[c.domain].skillLabel}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.atLevel}</td>
                    <td className="px-4 py-3">{Math.round(c.accuracy)}%</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {Math.round(c.gameplayAccuracy)}%
                    </td>
                    <td className="px-4 py-3 font-semibold">{Math.round(c.consistency)}%</td>
                  </tr>
                ))}
                {!checkpoints.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No checkpoints reached yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>

        <div>
          <SectionTitle title="Record a follow-up" />
          <Card>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!note.trim()) return;
                addNote({
                  studentId,
                  author: currentUser.name,
                  action,
                  note: note.trim(),
                });
                log(`Recorded follow-up for ${student.name}: ${action}`);
                setNote("");
                setSaved(true);
              }}
            >
              <div>
                <label htmlFor="action" className="text-sm font-medium">
                  Action taken
                </label>
                <select
                  id="action"
                  className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  {ACTIONS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="note" className="text-sm font-medium">
                  Notes
                </label>
                <Textarea
                  id="note"
                  className="mt-1 min-h-28"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What was discussed or arranged?"
                />
              </div>
              <Button type="submit" className="h-11 w-full">
                Save follow-up
              </Button>
              {saved && (
                <p role="status" className="text-sm text-success">
                  Follow-up saved to the case history.
                </p>
              )}
            </form>
          </Card>

          <div className="mt-8">
            <SectionTitle title="Case history" />
          </div>
          <ul className="space-y-3">
            {notes.map((n) => (
              <Card as="li" key={n.id}>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {n.action}
                </p>
                <p className="mt-1 text-sm">{n.note}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {n.author} · {new Date(n.at).toLocaleString()}
                </p>
              </Card>
            ))}
            {!notes.length && (
              <Card as="li">
                <p className="text-sm text-muted-foreground">No follow-ups recorded yet.</p>
              </Card>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-10">
        <Disclaimer />
      </div>
    </AppShell>
  );
}
