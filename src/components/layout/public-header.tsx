import Link from "next/link";
import { ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import { BRAND } from "@/lib/brand";

/** Header for public pages (landing, verify). Logged-out visitors only need two things. */
export function PublicHeader({ verifyHref }: { verifyHref?: string }) {
  return (
    <header className="flex h-16 items-center justify-between gap-3">
      <Link
        href="/"
        className="flex items-center gap-2.5"
        aria-label={`${BRAND.name} home`}
      >
        <BrandLogo className="h-8 w-8" />
        <span className="text-[15px] font-semibold tracking-tight">
          {BRAND.name}
        </span>
      </Link>
      <nav className="flex items-center gap-2" aria-label="Primary">
        {verifyHref && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="bg-card border-primary/30 text-primary hover:border-primary/60"
          >
            <a href={verifyHref} aria-label="Verify a report">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Verify a report</span>
              <span className="sm:hidden">Verify</span>
            </a>
          </Button>
        )}
        <Button asChild size="sm">
          <Link href="/login">
            <UserRound className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Link>
        </Button>
      </nav>
    </header>
  );
}
