import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/sq/AppShell";
import { BandChip, Card, SectionTitle, Stat, Disclaimer } from "@/components/sq/bits";
import { Input } from "@/components/ui/input";
import { DOMAINS, DOMAIN_MAP, type DomainId } from "@/lib/sq/domains";
import { overallBand, screeningCompletion, summariseAll } from "@/lib/sq/analysis";
import { useSq } from "@/lib/sq/store";
import type { Band } from "@/lib/sq/types";
import { Lock } from "lucide-react";
import { FullScreenLoader } from "@/components/sq/FullScreenLoader";


export const Route = createFileRoute("/staff/")({
  head: () => ({
    meta: [
      { title: "Disability Unit caseload — SkillQuest | DUT" },
      {
        name: "description",
        content:
          "Review consented student screening profiles, checkpoint trends and follow-up actions for the DUT Disability Unit.",
      },
      { property: "og:title", content: "SkillQuest Disability Unit caseload" },
      {
        property: "og:description",
        content: "Consent-based screening profiles and follow-up tracking for [UNIVERSITY NAME] staff.",
      },
    ],
  }),
  component: StaffCaseload,
});

function StaffCaseload() {
  const { currentUser, state, progressFor, ready } = useSq();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [band, setBand] = useState<Band | "all">("all");
  const [domain, setDomain] = useState<DomainId | "all">("all");

  useEffect(() => {
    if (ready && (!currentUser || currentUser.role === "student")) navigate({ to: "/login" });
  }, [ready, currentUser, navigate]);

  const rows = useMemo(() => {
    return state.users
      .filter((u) => u.role === "student" && u.consentShare)
      .map((u) => {
        const p = progressFor(u.id);
        const domains = summariseAll(p);
        return {
          user: u,
          domains,
          overall: overallBand(domains),
          completion: screeningCompletion(p),
          checkpoints: p.checkpoints.length,
          attempts: p.attempts.length,
        };
      });
  }, [state.users, progressFor]);

  const filtered = rows
    .filter((r) => {
      const t = q.trim().toLowerCase();
      const match =
        !t ||
        r.user.name.toLowerCase().includes(t) ||
        r.user.email.toLowerCase().includes(t) ||
        (r.user.studentNumber ?? "").includes(t);
      const bandOk = band === "all" || r.overall === band;
      const domOk =
        domain === "all" ||
        r.domains.some((d) => d.domain === domain && d.band !== "low" && d.samples >= 5);
      return match && bandOk && domOk;
    })
    .sort((a, b) => {
      const rank: Record<Band, number> = { higher: 0, moderate: 1, low: 2 };
      return rank[a.overall] - rank[b.overall];
    });

  const hidden = state.users.filter((u) => u.role === "student" && !u.consentShare).length;
  const flagged = rows.filter((r) => r.overall !== "low").length;

  if (!ready) return <FullScreenLoader />;
  if (!currentUser || currentUser.role === "student") return null;

  return (
    <AppShell wide>
      <h1 className="font-display text-3xl font-black">Disability Unit caseload</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">
        Screening indicators from gameplay patterns. These are conversation starters for support —
        not diagnoses.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students sharing" value={rows.length} hint="Consent given" />
        <Stat label="Needing follow-up" value={flagged} tone="text-warning" />
        <Stat
          label="Checkpoints logged"
          value={rows.reduce((n, r) => n + r.checkpoints, 0)}
        />
        <Stat label="Private (not shared)" value={hidden} hint="Not visible to staff" />
      </div>

      {hidden > 0 && (
      <Card className="mt-6 border-warning/40 bg-warning/5">
        <p className="text-sm">
          <Lock className="mr-2 inline h-4 w-4 align-[-2px]" aria-hidden />
          {hidden} student{hidden === 1 ? "" : "s"} have chosen not to share their screening results.
          Their data is not accessible here, in line with POPIA.
        </p>
      </Card>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="search" className="text-sm font-medium">
            Search
          </label>
          <Input
            id="search"
            className="mt-1 h-11"
            placeholder="Name, email or student number"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="band" className="text-sm font-medium">
            Overall indicator
          </label>
          <select
            id="band"
            className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={band}
            onChange={(e) => setBand(e.target.value as Band | "all")}
          >
            <option value="all">All students</option>
            <option value="higher">Higher concern</option>
            <option value="moderate">Moderate concern</option>
            <option value="low">Low concern</option>
          </select>
        </div>
        <div>
          <label htmlFor="domain" className="text-sm font-medium">
            Skill area of interest
          </label>
          <select
            id="domain"
            className="mt-1 h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
            value={domain}
            onChange={(e) => setDomain(e.target.value as DomainId | "all")}
          >
            <option value="all">Any area</option>
            {DOMAINS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.skillLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <caption className="sr-only">Students who consented to share screening results</caption>
          <thead className="bg-muted/60 text-left">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">
                Student
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Faculty
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Overall indicator
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Areas to watch
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Screening complete
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const watch = r.domains.filter((d) => d.samples >= 5 && d.band !== "low");
              return (
                <tr key={r.user.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.user.studentNumber ?? r.user.email}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.user.faculty ?? "—"}
                    <span className="block text-xs">{r.user.yearOfStudy}</span>
                  </td>
                  <td className="px-4 py-3">
                    <BandChip band={r.overall} />
                  </td>
                  <td className="px-4 py-3">
                    {watch.length ? (
                      <span className="flex flex-wrap gap-1">
                        {watch.map((d) => (
                          <span
                            key={d.domain}
                            className="rounded-full border border-border px-2 py-0.5 text-xs"
                          >
                            {DOMAIN_MAP[d.domain].skillLabel}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">None flagged</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.completion}%</td>
                  <td className="px-4 py-3">
                    <Link
                      to="/staff/$studentId"
                      params={{ studentId: r.user.id }}
                      className="font-semibold text-primary underline-offset-2 hover:underline"
                    >
                      Open case
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No students match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="mt-10">
        <SectionTitle title="Recent follow-up actions" />
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {state.notes.slice(0, 6).map((n) => {
          const student = state.users.find((u) => u.id === n.studentId);
          return (
            <Card as="li" key={n.id}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{student?.name ?? "Student"}</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">
                {n.action}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{n.note}</p>
              <p className="mt-2 text-xs text-muted-foreground">— {n.author}</p>
            </Card>
          );
        })}
        {!state.notes.length && (
          <Card as="li">
            <p className="text-sm text-muted-foreground">No follow-up actions recorded yet.</p>
          </Card>
        )}
      </ul>

      <div className="mt-8">
        <Disclaimer />
      </div>
    </AppShell>
  );
}
