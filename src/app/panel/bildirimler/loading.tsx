import { NotificationSkeleton } from "@/components/ui/skeletons";
import { PanelBody } from "@/components/panel/shell";

export default function Loading() {
  return (
    <PanelBody>
      <NotificationSkeleton />
    </PanelBody>
  );
}
