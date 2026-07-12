"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { UploadCloud } from "lucide-react";
import { importQuestions } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Row = Record<string, unknown>;

export function ImportForm({
  exams,
}: {
  exams: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [mode, setMode] = useState<"csv" | "json">("csv");
  const [text, setText] = useState("");
  const [result, setResult] = useState<{
    created: number;
    errors: string[];
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const parseRows = (): Row[] | null => {
    setParseError(null);
    if (!text.trim()) {
      setParseError("Paste some data or upload a file first.");
      return null;
    }
    if (mode === "json") {
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) {
          setParseError("JSON must be an array of question objects.");
          return null;
        }
        return data as Row[];
      } catch {
        setParseError("Invalid JSON.");
        return null;
      }
    }
    const parsed = Papa.parse<Row>(text, {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length) {
      setParseError(parsed.errors[0].message);
      return null;
    }
    return parsed.data;
  };

  const submit = () => {
    const rows = parseRows();
    if (!rows) return;
    setResult(null);
    startTransition(async () => {
      const res = await importQuestions(examId, rows);
      if (res.ok) {
        setResult(res.data);
        router.refresh();
      } else {
        setParseError(res.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Target exam</Label>
          <Select value={examId} onChange={(e) => setExamId(e.target.value)}>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Format</Label>
          <Select
            value={mode}
            onChange={(e) => setMode(e.target.value as "csv" | "json")}
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
          <UploadCloud className="size-4" />
          Upload file
          <input
            type="file"
            accept={mode === "csv" ? ".csv,text/csv" : ".json,application/json"}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
            }}
          />
        </label>
        <span className="text-xs text-muted-foreground">
          …or paste below
        </span>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        className="font-mono text-xs"
        placeholder={
          mode === "csv"
            ? "subject,topic,type,stem,optionA,optionB,optionC,optionD,correct,marks,negativeMarks,difficulty,year,shift,solution"
            : '[ { "subject": "Physics", "stem": "…", "optionA": "…", "optionB": "…", "correct": "A" } ]'
        }
      />

      {parseError && <p className="text-sm text-destructive">{parseError}</p>}

      <Button onClick={submit} disabled={pending || !examId}>
        {pending ? "Importing…" : "Import questions"}
      </Button>

      {result && (
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <p className="font-medium text-success">
            Imported {result.created} question(s).
          </p>
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="font-medium text-destructive">
                {result.errors.length} row(s) skipped:
              </p>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
