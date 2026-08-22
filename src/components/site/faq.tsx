"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { IconArrowDown } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

export function Accordion({ items }: { items: { q: string; a: React.ReactNode }[] }) {
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className={cn("overflow-hidden rounded-[18px] border bg-surface transition-colors duration-200", isOpen ? "border-accent-line" : "border-line")}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-display text-[16.5px] font-semibold tracking-[-.01em] text-ink">{item.q}</span>
              <Icon
                icon={IconArrowDown}
                size={18}
                className={cn("shrink-0 text-muted transition-transform duration-300", isOpen && "rotate-180 text-accent-ink")}
              />
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <div className="px-5 pb-5 text-[14.5px] leading-[1.7] text-ink2">{item.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
