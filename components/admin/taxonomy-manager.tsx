"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { createExam, createSubject, createTopic } from "@/lib/actions/admin";
import type { TaxonomyExam } from "@/components/admin/question-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function TaxonomyManager({ taxonomy }: { taxonomy: TaxonomyExam[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [examName, setExamName] = useState("");
  const [subjectExamId, setSubjectExamId] = useState(taxonomy[0]?.id ?? "");
  const [subjectName, setSubjectName] = useState("");
  const [topicSubjectId, setTopicSubjectId] = useState("");
  const [topicName, setTopicName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const allSubjects = taxonomy.flatMap((e) =>
    e.subjects.map((s) => ({ id: s.id, name: `${e.name} › ${s.name}` }))
  );

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, reset: () => void) => {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        reset();
        router.refresh();
      } else {
        setMsg(res.error ?? "Failed");
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium"
      >
        Manage taxonomy (exams, subjects, topics)
        <ChevronDown
          className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="grid gap-6 border-t border-border p-5 sm:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Add exam</p>
            <Input
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="e.g. GATE"
            />
            <Button
              size="sm"
              disabled={pending || !examName.trim()}
              onClick={() =>
                run(
                  () => createExam(examName),
                  () => setExamName("")
                )
              }
            >
              Add exam
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Add subject</p>
            <Select
              value={subjectExamId}
              onChange={(e) => setSubjectExamId(e.target.value)}
            >
              {taxonomy.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
            <Input
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. Physics"
            />
            <Button
              size="sm"
              disabled={pending || !subjectName.trim()}
              onClick={() =>
                run(
                  () => createSubject(subjectExamId, subjectName),
                  () => setSubjectName("")
                )
              }
            >
              Add subject
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Add topic</p>
            <Select
              value={topicSubjectId}
              onChange={(e) => setTopicSubjectId(e.target.value)}
            >
              <option value="">Select subject…</option>
              {allSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Input
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="e.g. Kinematics"
            />
            <Button
              size="sm"
              disabled={pending || !topicSubjectId || !topicName.trim()}
              onClick={() =>
                run(
                  () => createTopic(topicSubjectId, topicName),
                  () => setTopicName("")
                )
              }
            >
              Add topic
            </Button>
          </div>

          {msg && (
            <p className="text-sm text-destructive sm:col-span-3">{msg}</p>
          )}
        </div>
      )}
    </div>
  );
}
