import { PanelListSkeleton } from "@/components/ui/skeletons";
import { PanelBody } from "@/components/panel/shell";

export default function Loading() {
  return (
    <PanelBody>
      <PanelListSkeleton count={2} />
    </PanelBody>
  );
}
