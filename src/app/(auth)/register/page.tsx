import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/server/auth/current-user";

export const metadata = { title: "Sign up" };

export default async function Page() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <AuthForm mode="register" />
    </main>
  );
}
