import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/sq/AppShell";
import { Card, SectionTitle } from "@/components/sq/bits";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSq } from "@/lib/sq/store";
import type { AccessibilitySettings } from "@/lib/sq/types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Accessibility settings — SkillQuest | DUT" },
      {
        name: "description",
        content:
          "Adjust contrast, text size, motion, reading font and game sound so SkillQuest works the way you need it to.",
      },
      { property: "og:title", content: "SkillQuest accessibility settings" },
      {
        property: "og:description",
        content: "Contrast, text size, reduced motion, reading font and sound controls.",
      },
    ],
  }),
  component: SettingsPage,
});

const OPTIONS: { key: keyof AccessibilitySettings; title: string; body: string }[] = [
  {
    key: "highContrast",
    title: "Higher contrast",
    body: "Strengthens borders and secondary text for easier reading in bright rooms.",
  },
  {
    key: "largeText",
    title: "Larger text",
    body: "Increases the base text size across the whole app.",
  },
  {
    key: "reduceMotion",
    title: "Reduce motion",
    body: "Removes animations and transitions during gameplay and page changes.",
  },
  {
    key: "dyslexiaFont",
    title: "Reading-friendly spacing",
    body: "Switches to a wider-spaced typeface that some readers find easier.",
  },
  {
    key: "sound",
    title: "Game sounds",
    body: "Short feedback tones when you answer. Visual feedback is always shown too.",
  },
];

function SettingsPage() {
  const { state, updateSettings } = useSq();

  return (
    <AppShell>
      <h1 className="font-display text-3xl font-black">Accessibility &amp; settings</h1>
      <p className="mt-1 max-w-2xl text-muted-foreground">
        SkillQuest should never be the barrier. Change anything here at any time — your choices are
        remembered on this device.
      </p>

      <div className="mt-8">
        <SectionTitle title="Display & interaction" />
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {OPTIONS.map((o) => (
          <Card as="li" key={o.key}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor={o.key} className="text-base font-semibold">
                  {o.title}
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">{o.body}</p>
              </div>
              <Switch
                id={o.key}
                checked={state.settings[o.key]}
                onCheckedChange={(v) => updateSettings({ [o.key]: v })}
              />
            </div>
          </Card>
        ))}
      </ul>

      <div className="mt-10">
        <SectionTitle title="Built in, always on" subtitle="No setting required." />
      </div>
      <Card>
        <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          {[
            "Full keyboard navigation with a visible focus ring on every control",
            "Skip-to-content link on each page",
            "Large tap targets on all game controls",
            "Colour is never the only signal — icons and words go with it",
            "Instructions written in short, plain sentences",
            "Levels can always be replayed; nothing is locked behind speed alone",
            "Errors explained in words, never just a red outline",
            "Encouraging feedback — never shaming language",
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden className="text-success">
                ✓
              </span>
              {t}
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-10">
        <SectionTitle title="Your data" />
      </div>
      <Card>
        <p className="text-sm text-muted-foreground">
          SkillQuest stores gameplay metrics (accuracy, response time, attempts, hints, levels and
          checkpoint results) to describe skill patterns. It is handled in line with POPIA, shared
          with the Disability Unit only with your consent, and never used to diagnose a condition or
          produce an IQ score.
        </p>
      </Card>
    </AppShell>
  );
}
