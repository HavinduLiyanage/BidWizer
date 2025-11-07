import { useMemo } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogClose,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

export type UpsellFeature = "document" | "chat" | "brief";

interface UpsellModalProps {
  open: boolean;
  onClose: () => void;
  feature: UpsellFeature;
}

const FEATURE_COPY: Record<
  UpsellFeature,
  { title: string; description: string }
> = {
  document: {
    title: "Unlock full document",
    description: "Upgrade to continue.",
  },
  chat: {
    title: "Keep chatting",
    description: "Upgrade to continue.",
  },
  brief: {
    title: "Generate more briefs",
    description: "Upgrade to continue.",
  },
};

export function UpsellModal({ open, onClose, feature }: UpsellModalProps) {
  const router = useRouter();

  const copy = useMemo(() => FEATURE_COPY[feature], [feature]);

  const handleUpgrade = () => {
    track("upgrade_clicked", { feature });
    onClose();
    router.push("/pricing?upgrade=standard");
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        className="max-w-md space-y-5"
        data-testid="upsell-modal"
      >
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {copy.title}
          </h3>
          <p className="text-sm text-gray-600">{copy.description}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleUpgrade}>Upgrade</Button>
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>
              Maybe later
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
