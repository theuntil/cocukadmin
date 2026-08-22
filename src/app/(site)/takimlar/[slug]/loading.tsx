import { DetailSkeleton, HeaderSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="bg-page">
      <HeaderSkeleton />
      <DetailSkeleton />
    </div>
  );
}
