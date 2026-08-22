import { Bone } from "@/components/ui/skeletons";
import { Card } from "@/components/ui";

export default function Loading() {
  return (
    <div className="flex flex-col gap-7" role="status" aria-label="Yükleniyor">
      <div className="flex flex-col gap-2">
        <Bone className="h-3 w-40" />
        <Bone className="h-9 w-56" />
        <Bone className="h-4 w-full max-w-[380px]" />
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map((i) => <Bone key={i} className="h-1.5 flex-1 rounded-full" />)}
      </div>

      <Card className="flex flex-col gap-5 p-8">
        <div className="flex gap-3.5">
          <Bone className="h-11 w-11 rounded-[14px]" />
          <div className="flex flex-1 flex-col gap-2">
            <Bone className="h-5 w-40" />
            <Bone className="h-3.5 w-full max-w-[280px]" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bone className="h-3.5 w-16" />
              <Bone className="h-12 w-full rounded-[12px]" />
            </div>
          ))}
        </div>
        <Bone className="h-12 w-full rounded-full" />
      </Card>
    </div>
  );
}
