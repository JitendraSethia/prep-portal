"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPaper } from "@/lib/actions/admin";
import type { PaperInput } from "@/lib/validators/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function PaperForm({
  exams,
}: {
  exams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [type, setType] = useState<PaperInput["type"]>("PREVIOUS_YEAR");
  const [durationMins, setDurationMins] = useState("60");
  const [year, setYear] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await createPaper({
        title,
        description: description || null,
        examId,
        type,
        durationMins: Number(durationMins) || 60,
        year: year ? Number(year) : null,
        isPublished,
      });
      if (res.ok) {
        router.push(`/admin/papers/${res.data.id}`);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. NEET UG 2022 — Full Paper"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Description (optional)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Exam</Label>
          <Select value={examId} onChange={(e) => setExamId(e.target.value)}>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as PaperInput["type"])}
          >
            <option value="PREVIOUS_YEAR">Previous year</option>
            <option value="MOCK">Mock test</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            value={durationMins}
            onChange={(e) => setDurationMins(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Year (optional)</Label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2023"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="size-4"
        />
        Publish immediately (visible to students)
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={submit} disabled={pending || !title.trim()}>
        {pending ? "Creating…" : "Create paper"}
      </Button>
    </div>
  );
}
