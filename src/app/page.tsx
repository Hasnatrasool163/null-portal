import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/current-user";

// TODO: replace with the real landing page for the announced theme.
export default async function Home() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">
        Your product name
      </h1>
      <p className="text-muted-foreground text-lg">
        One sentence that says who it is for and what problem it solves.
      </p>
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/register">Get started</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </main>
  );
}
