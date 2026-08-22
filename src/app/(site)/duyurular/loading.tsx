import { Container } from "@/components/ui";
import { Bone, HeaderSkeleton, CardGridSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="bg-page" role="status" aria-label="Yükleniyor">
      <HeaderSkeleton />
      <Container className="px-5 py-10 sm:px-8 lg:px-12">
        {/* filtre şeridi */}
        <div className="mb-8 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} className="h-9 rounded-full" style={{ width: 80 + (i % 3) * 26 }} />
          ))}
        </div>
        <CardGridSkeleton count={6} />
      </Container>
    </div>
  );
}
