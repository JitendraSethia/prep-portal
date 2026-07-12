"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Generic delete control. `action` is a server action pre-bound to an id,
 * e.g. `deleteQuestion.bind(null, id)`.
 */
export function ConfirmDelete({
  action,
  label = "Delete",
  redirectTo,
}: {
  action: () => Promise<{ ok: boolean; error?: string }>;
  label?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="size-4" /> {label}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await action();
            if (res.ok) {
              if (redirectTo) router.push(redirectTo);
              router.refresh();
            } else {
              alert(res.error ?? "Delete failed");
              setConfirming(false);
            }
          })
        }
      >
        {pending ? "Deleting…" : "Confirm"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </Button>
    </span>
  );
}
