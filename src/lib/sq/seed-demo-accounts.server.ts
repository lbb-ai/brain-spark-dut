import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

export const seedDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const results: { label: string; email: string; status: string; error?: string }[] = [];

  for (const acc of DEMO_ACCOUNTS) {
    try {
      // 1. Create auth user (idempotent — if exists, fetch it)
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: acc.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: {
          name: acc.name,
          student_number: acc.studentNumber,
          faculty: acc.faculty,
          year_of_study: acc.yearOfStudy,
          consent_share: true,
        },
      });

      let userId: string;

      if (createErr) {
        // User likely already exists — look them up
        if (createErr.message.includes("already") || createErr.message.includes("been registered")) {
          const { data: existing, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
          if (listErr || !existing) {
            results.push({ label: acc.label, email: acc.email, status: "error", error: listErr?.message ?? "Could not find existing user" });
            continue;
          }
          const found = existing.users.find((u) => u.email === acc.email);
          if (!found) {
            results.push({ label: acc.label, email: acc.email, status: "error", error: "User exists but could not be found" });
            continue;
          }
          userId = found.id;
        } else {
          results.push({ label: acc.label, email: acc.email, status: "error", error: createErr.message });
          continue;
        }
      } else {
        userId = created.user.id;
      }

      // 2. Upsert profile
      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,
            email: acc.email,
            name: acc.name,
            student_number: acc.studentNumber,
            faculty: acc.faculty,
            year_of_study: acc.yearOfStudy,
            consent_share: true,
          },
          { onConflict: "id" },
        );
      if (profileErr) {
        results.push({ label: acc.label, email: acc.email, status: "error", error: `Profile: ${profileErr.message}` });
        continue;
      }

      // 3. Upsert role
      const { error: roleErr } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: acc.role }, { onConflict: "user_id" });
      if (roleErr) {
        results.push({ label: acc.label, email: acc.email, status: "error", error: `Role: ${roleErr.message}` });
        continue;
      }

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

  return { results };
});
