import * as React from "react";
import { Card, Container } from "@/components/ui";
import { cn } from "@/lib/utils";

/** Temel iskelet bloğu */
export function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("ct-skeleton rounded-[10px]", className)} style={style} aria-hidden />;
}

/** Kart ızgarası iskeleti (blog, etkinlik, takım listeleri) */
export function CardGridSkeleton({ count = 6, columns = 3 }: { count?: number; columns?: 2 | 3 | 4 }) {
  const cols = columns === 2 ? "md:grid-cols-2" : columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={cn("grid gap-5", cols)} role="status" aria-label="Yükleniyor">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="flex flex-col gap-4 p-6">
          <Bone className="h-6 w-24 rounded-full" />
          <Bone className="h-6 w-full" />
          <Bone className="h-4 w-4/5" />
          <div className="mt-2 flex flex-col gap-2 border-t border-line2 pt-4">
            <Bone className="h-3.5 w-32" />
            <Bone className="h-3.5 w-40" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Görselli kart ızgarası (blog) */
export function MediaGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Yükleniyor">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="flex flex-col overflow-hidden">
          <Bone className="aspect-[16/9] w-full rounded-none" />
          <div className="flex flex-col gap-3 p-6">
            <Bone className="h-3 w-20" />
            <Bone className="h-5 w-full" />
            <Bone className="h-4 w-3/4" />
            <Bone className="mt-2 h-3.5 w-24" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Satır listesi iskeleti (siparişler, ödemeler, bildirimler) */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Yükleniyor">
      <Card className="divide-y divide-line2 overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="flex flex-col gap-2">
            <Bone className="h-4 w-40" />
            <Bone className="h-3 w-28" />
          </div>
          <Bone className="h-6 w-20 rounded-full" />
        </div>
      ))}
      </Card>
    </div>
  );
}

/** Sayfa başlığı iskeleti */
export function HeaderSkeleton() {
  return (
    <div className="border-b border-line2 bg-page">
      <Container className="flex flex-col gap-4 px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <Bone className="h-3 w-24" />
        <Bone className="h-12 w-2/3 max-w-[520px]" />
        <Bone className="h-5 w-full max-w-[600px]" />
      </Container>
    </div>
  );
}

/** Panel sayfası iskeleti */
export function PanelSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <Container className="!max-w-[1080px] px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
      <div className="flex flex-col gap-7" role="status" aria-label="Yükleniyor">
        <div className="flex flex-col gap-2">
          <Bone className="h-8 w-52" />
          <Bone className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: cards }).map((_, i) => (
            <Card key={i} className="flex flex-col gap-3 p-5">
              <Bone className="h-10 w-10 rounded-[13px]" />
              <Bone className="h-8 w-16" />
              <Bone className="h-3.5 w-24" />
            </Card>
          ))}
        </div>
        <ListSkeleton rows={3} />
      </div>
    </Container>
  );
}

/** Form/kart detay iskeleti */
export function DetailSkeleton() {
  return (
    <Container className="px-5 py-10 sm:px-8 lg:px-12">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr]" role="status" aria-label="Yükleniyor">
        <div className="flex flex-col gap-5">
          <Bone className="h-10 w-3/4" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-5/6" />
          <Card className="mt-2 grid gap-5 p-6 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Bone className="h-9 w-9 rounded-[11px]" />
                <div className="flex flex-1 flex-col gap-2">
                  <Bone className="h-3 w-16" />
                  <Bone className="h-4 w-28" />
                </div>
              </div>
            ))}
          </Card>
        </div>
        <Card className="flex h-fit flex-col gap-4 p-7">
          <Bone className="h-6 w-40" />
          <Bone className="h-4 w-full" />
          <Bone className="h-11 w-full rounded-full" />
        </Card>
      </div>
    </Container>
  );
}
