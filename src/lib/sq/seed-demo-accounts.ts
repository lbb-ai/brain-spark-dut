import { supabase } from "@/integrations/supabase/client";

const DEMO_PASSWORD = "SkillQuestDemo1!";

const DEMO_ACCOUNTS = [
  {
    label: "Student",
    email: "demo.student@dut4life.ac.za",
    name: "Demo Student",
    role: "student" as const,
    studentNumber: "DEMO0001",
    faculty: "Applied Sciences",
    yearOfStudy: "2",
  },
  {
    label: "Staff",
    email: "demo.staff@dut4life.ac.za",
    name: "Demo Staff",
    role: "staff" as const,
    studentNumber: null,
    faculty: "Disability Unit",
    yearOfStudy: null,
  },
  {
    label: "Admin",
    email: "demo.admin@dut4life.ac.za",
    name: "Demo Admin",
    role: "admin" as const,
    studentNumber: null,
    faculty: "Student Affairs",
    yearOfStudy: null,
  },
];

export interface SeedResult {
  label: string;
  email: string;
  status: "ok" | "exists" | "error";
  error?: string;
}

/**
 * Creates demo accounts using the client-side Supabase auth (anon key).
 * Does NOT require the service role key. If email confirmation is enabled,
 * accounts are created but can't be signed into until confirmed.
 */
export async function seedDemoAccountsClient(): Promise<{ results: SeedResult[]; needsConfirmation: boolean }> {
  const results: SeedResult[] = [];
  let needsConfirmation = false;

  for (const acc of DEMO_ACCOUNTS) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: acc.email,
        password: DEMO_PASSWORD,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            name: acc.name,
            student_number: acc.studentNumber,
            faculty: acc.faculty,
            year_of_study: acc.yearOfStudy,
            consent_share: true,
          },
        },
      });

      if (error) {
        // "User already registered" means the account exists — that's fine
        if (error.message.includes("already registered") || error.message.includes("already been registered")) {
          results.push({ label: acc.label, email: acc.email, status: "exists" });
          continue;
        }
        results.push({ label: acc.label, email: acc.email, status: "error", error: error.message });
        continue;
      }

      // If no session returned, email confirmation is required
      if (!data.session) {
        needsConfirmation = true;
        results.push({ label: acc.label, email: acc.email, status: "ok", error: "email confirmation required" });
        continue;
      }

      // Session returned — email confirmation is disabled.
      // Insert profile and role for this user.
      if (data.user) {
        await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            email: acc.email,
            name: acc.name,
            student_number: acc.studentNumber,
            faculty: acc.faculty,
            year_of_study: acc.yearOfStudy,
            consent_share: true,
          },
          { onConflict: "id" },
        );

        // Try to set the role — RLS may block non-student roles.
        // If it fails, the default student role will be used.
        await supabase
          .from("user_roles")
          .upsert({ user_id: data.user.id, role: acc.role }, { onConflict: "user_id" });
      }

      // Sign out so we can create the next account
      await supabase.auth.signOut();
      results.push({ label: acc.label, email: acc.email, status: "ok" });
    } catch (err) {
      results.push({
        label: acc.label,
        email: acc.email,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { results, needsConfirmation };
}
