import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "./button";

/** Consistent "go back" affordance: a real button (focusable, hover + press feedback), not bare text. */
export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="w-fit pl-2.5">
      <Link href={href}>
        <ArrowLeft className="h-4 w-4 group-hover/btn:-translate-x-0.5" aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
}
