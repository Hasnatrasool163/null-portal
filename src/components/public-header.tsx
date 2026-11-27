import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
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
      <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
        {verifyHref && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <a href={verifyHref}>Verify a report</a>
          </Button>
        )}
        <Button asChild size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </nav>
    </header>
  );
}
