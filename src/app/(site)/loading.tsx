import { Container } from "@/components/ui";
import { Bone } from "@/components/ui/skeletons";

/** Anasayfa iskeleti — hero + kart önizleme düzenini taklit eder */
export default function Loading() {
  return (
    <div className="bg-page" role="status" aria-label="Yükleniyor">
      <Container>
        <div className="grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
          <div className="flex flex-col gap-7">
            <Bone className="h-[60px] w-full max-w-[420px] lg:h-[76px]" />
            <Bone className="h-[60px] w-4/5 max-w-[360px] lg:h-[76px]" />
            <Bone className="h-5 w-full max-w-[440px]" />
            <div className="flex gap-3">
              <Bone className="h-12 w-52 rounded-full" />
              <Bone className="h-12 w-40 rounded-full" />
            </div>
            <div className="flex gap-12 border-t border-line2 pt-7">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Bone className="h-8 w-20" />
                  <Bone className="h-3.5 w-16" />
                </div>
              ))}
            </div>
          </div>
          <Bone className="w-full rounded-[24px]" style={{ aspectRatio: "1.586 / 1" }} />
        </div>
      </Container>
    </div>
  );
}
