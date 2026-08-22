"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconCheck } from "@/components/ui/icons";
import { markNotificationsRead } from "@/lib/actions/app";

export function MarkAllRead() {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" loading={pending}
      onClick={() => start(() => { void markNotificationsRead(); })}>
      <Icon icon={IconCheck} size={15} /> Tümünü okundu işaretle
    </Button>
  );
}
