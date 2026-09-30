import type { Metadata } from "next";

import { ReviewView } from "@/components/review/review-view";

export const metadata: Metadata = { title: "Review & Edit · ParsePass" };

export default function ReviewPage() {
  return (
    <ReviewView
      next={
        <span className="rounded-md border border-border bg-card px-4 py-2 font-mono text-[13px] text-subtle-foreground">
          Export: coming next
        </span>
      }
    />
  );
}
