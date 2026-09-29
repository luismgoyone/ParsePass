import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ReviewView } from "@/components/review/review-view";

export const metadata: Metadata = { title: "Review & Edit · ParsePass" };

export default function ReviewPage() {
  return (
    <ReviewView
      next={
        <Link
          href="/export"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-mono text-[13px] text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Continue to export
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      }
    />
  );
}
