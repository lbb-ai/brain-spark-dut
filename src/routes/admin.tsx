import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/sq/AppShell";
import { Card, SectionTitle, Stat } from "@/components/sq/bits";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DOMAINS } from "@/lib/sq/domains";
import { useSq } from "@/lib/sq/store";
import type { Role } from "@/lib/sq/types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — SkillQuest | DUT" },
      {
        name: "description",
        content:
          "Manage SkillQuest accounts, roles, game availability, access rules and the platform audit trail.",
      },
      { property: "og:title", content: "SkillQuest administration" },
      {
        property: "og:description",
        content: "User management, game configuration, access control and audit history.",
      },
    ],
  }),
  component: AdminPage,
});

const TABS = [
  ["users", "User management"],
  ["games", "Game configuration"],
  ["access", "Access control"],
  ["audit", "Audit history"],
] as const;

type Tab = (typeof TABS)[number][0];

function AdminPage() {
  const { currentUser, state, ready, setUserRole, removeUser, toggleGame, log } = useSq();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("users");

  useEffect(() => {
    if (ready && (!currentUser || currentUser.role !== "admin")) navigate({ to: "/login" });
  }, [ready, currentUser, navigate]);

  if (!currentUser || currentUser.role !== "admin") return null;

  const students = state.users.filter((u) => u.role === "student");
  const staff = state.users.filter((u) => u.role !== "student");

  return (
    <AppShell wide>
      <h1 className="font-display text-3xl font-black">Administration</h1>
      <p className="mt-1 text-muted-foreground">
        System configuration for the SkillQuest screening platform.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={students.length} />
        <Stat label="Staff & admin accounts" value={staff.length} />
        <Stat
          label="Active game domains"
          value={DOMAINS.filter((d) => state.gamesEnabled[d.id]).length}
        />
        <Stat label="Audit entries" value={state.audit.length} />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
              tab === id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "users" && (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-sm">
              <caption className="sr-only">All platform accounts</caption>
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Name
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Sharing consent
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Created
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <label className="sr-only" htmlFor={`role-${u.id}`}>
                        Role for {u.name}
                      </label>
                      <select
                        id={`role-${u.id}`}
                        className="h-10 rounded-md border border-input bg-card px-2 text-sm"
                        value={u.role}
                        onChange={(e) => {
                          setUserRole(u.id, e.target.value as Role);
                          log(`Changed role for ${u.name} to ${e.target.value}`);
                        }}
                      >
                        <option value="student">Student</option>
                        <option value="staff">Disability Unit staff</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === "student" ? (
                        <span className={u.consentShare ? "text-success" : "text-muted-foreground"}>
                          {u.consentShare ? "✓ Sharing on" : "Sharing off"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">n/a</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={u.id === currentUser.id}
                        onClick={() => {
                          removeUser(u.id);
                          log(`Deactivated account ${u.email}`);
                        }}
                      >
                        Deactivate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {tab === "games" && (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {DOMAINS.map((d) => (
              <Card as="li" key={d.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display font-bold">
                      <span aria-hidden className="mr-2">
                        {d.icon}
                      </span>
                      {d.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{d.blurb}</p>
                  </div>
                  <Switch
                    checked={state.gamesEnabled[d.id]}
                    aria-label={`Enable ${d.name}`}
                    onCheckedChange={() => {
                      toggleGame(d.id);
                      log(`Toggled availability of ${d.name}`);
                    }}
                  />
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-primary">
                  {state.gamesEnabled[d.id] ? "Available to students" : "Hidden from students"}
                </p>
              </Card>
            ))}
          </ul>
        )}

        {tab === "access" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionTitle title="Role permissions" />
              <ul className="space-y-3 text-sm">
                {[
                  ["Student", "Plays games, sees only their own data, controls sharing consent."],
                  [
                    "Disability Unit staff",
                    "Sees consented students only: skill profiles, checkpoint trends, case notes.",
                  ],
                  [
                    "Administrator",
                    "Manages accounts, roles and game availability. No access to individual screening reports.",
                  ],
                ].map(([r, p]) => (
                  <li key={r} className="rounded-xl border border-border p-3">
                    <p className="font-semibold">{r}</p>
                    <p className="text-muted-foreground">{p}</p>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <SectionTitle title="POPIA safeguards" />
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>· Screening data reaches staff only when the student consents.</li>
                <li>· Minimal exposure: staff see patterns, not raw answer content.</li>
                <li>· Every report, flag and follow-up is written to the audit trail.</li>
                <li>· Students may withdraw consent at any time from their profile.</li>
                <li>· Reports are labelled as screening indicators, never diagnoses.</li>
              </ul>
            </Card>
          </div>
        )}

        {tab === "audit" && (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[600px] text-sm">
              <caption className="sr-only">System audit history</caption>
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Actor
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Action
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    When
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.audit.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{a.actor}</td>
                    <td className="px-4 py-3">{a.action}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(a.at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
