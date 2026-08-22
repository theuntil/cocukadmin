import { ArticleGridSkeleton } from "@/components/ui/skeletons";
import { Container } from "@/components/ui";

export default function Loading() {
  return (
    <Container className="px-5 py-12 sm:py-16">
      <ArticleGridSkeleton />
    </Container>
  );
}
