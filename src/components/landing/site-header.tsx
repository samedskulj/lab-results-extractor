"use client";

import { ArrowRight, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Brand } from "./brand";
import { APP_URL, CONTACT_URL, NAV } from "./links";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6">
        <Brand />
        <nav aria-label="Page" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-accent hover:text-foreground">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <a href={CONTACT_URL}>Talk to us</a>
          </Button>
          <Button asChild>
            <a href={APP_URL}>
              Open dashboard <ArrowRight aria-hidden />
            </a>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <Brand />
                </SheetTitle>
                <SheetDescription className="sr-only">Page sections</SheetDescription>
              </SheetHeader>
              <nav aria-label="Page" className="flex flex-col gap-1 px-4">
                {[...NAV, { href: CONTACT_URL, label: "Talk to us" }].map((n) => (
                  <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 font-medium hover:bg-accent">
                    {n.label}
                  </a>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
