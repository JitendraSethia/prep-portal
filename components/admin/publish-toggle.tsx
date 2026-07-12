"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePaperPublished } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function PublishToggle({
  paperId,
  isPublished,
}: {
  paperId: string;
  isPublished: boolean;
}) {
  const router = useRouter();
  const [published, setPublished] = useState(isPublished);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={published ? "outline" : "default"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const next = !published;
          const res = await togglePaperPublished(paperId, next);
          if (res.ok) {
            setPublished(next);
            router.refresh();
          }
        })
      }
    >
      {pending ? "…" : published ? "Unpublish" : "Publish"}
    </Button>
  );
}
