"use client";
import { useState } from "react";
import * as D from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { ConsoleBrand } from "@/components/layout/console-brand";
import { SidebarBody } from "@/components/layout/sidebar/sidebar-body";
import type { SessionUser } from "@/shared/schemas/auth";

/** Mobile top bar with a slide-in navigation drawer (below lg). */
export function MobileNav({
  user,
  onLogout,
}: {
  user: SessionUser;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="bg-background/95 sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 lg:hidden">
      <ConsoleBrand role={user.role} />
      <div className="flex items-center gap-1">
        <D.Root open={open} onOpenChange={setOpen}>
          <D.Trigger
            className="hover:bg-muted focus-visible:ring-ring flex h-10 w-10 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </D.Trigger>
          <D.Portal>
            <D.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" />
            <D.Content className="bg-sidebar data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r duration-200 focus:outline-none">
              <D.Title className="sr-only">Navigation</D.Title>
              <D.Description className="sr-only">
                Main navigation and account
              </D.Description>
              <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
                <ConsoleBrand role={user.role} />
                <D.Close
                  className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </D.Close>
              </div>
              <SidebarBody
                user={user}
                collapsed={false}
                onNavigate={() => setOpen(false)}
                onLogout={onLogout}
              />
            </D.Content>
          </D.Portal>
        </D.Root>
      </div>
    </header>
  );
}
