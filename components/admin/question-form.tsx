"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createQuestion, updateQuestion } from "@/lib/actions/admin";
import type { QuestionInput } from "@/lib/validators/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface TaxonomyExam {
  id: string;
  name: string;
  subjects: {
    id: string;
    name: string;
    topics: { id: string; name: string }[];
  }[];
}

type OptionRow = { key: string; text: string };

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuestionForm({
  taxonomy,
  initial,
  questionId,
}: {
  taxonomy: TaxonomyExam[];
  initial?: QuestionInput;
  questionId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [examId, setExamId] = useState(initial?.examId ?? taxonomy[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(initial?.subjectId ?? "");
  const [topicId, setTopicId] = useState(initial?.topicId ?? "");
  const [type, setType] = useState<QuestionInput["type"]>(
    initial?.type ?? "MCQ_SINGLE"
  );
  const [stem, setStem] = useState(initial?.stem ?? "");
  const [options, setOptions] = useState<OptionRow[]>(
    initial?.options?.length
      ? initial.options
      : [
          { key: "A", text: "" },
          { key: "B", text: "" },
          { key: "C", text: "" },
          { key: "D", text: "" },
        ]
  );
  const [correctKeys, setCorrectKeys] = useState<string[]>(
    initial?.correctKeys ?? []
  );
  const [numericValue, setNumericValue] = useState<string>(
    initial?.numericValue != null ? String(initial.numericValue) : ""
  );
  const [numericTolerance, setNumericTolerance] = useState<string>(
    initial?.numericTolerance != null ? String(initial.numericTolerance) : "0"
  );
  const [marks, setMarks] = useState(String(initial?.marks ?? 4));
  const [negativeMarks, setNegativeMarks] = useState(
    String(initial?.negativeMarks ?? 1)
  );
  const [difficulty, setDifficulty] = useState<QuestionInput["difficulty"]>(
    initial?.difficulty ?? "MEDIUM"
  );
  const [year, setYear] = useState(initial?.year ? String(initial.year) : "");
  const [shift, setShift] = useState(initial?.shift ?? "");
  const [solution, setSolution] = useState(initial?.solution ?? "");

  const exam = taxonomy.find((e) => e.id === examId);
  const subjects = exam?.subjects ?? [];
  const topics = useMemo(
    () => subjects.find((s) => s.id === subjectId)?.topics ?? [],
    [subjects, subjectId]
  );

  const isMcq = type !== "NUMERICAL";

  const addOption = () => {
    const key = LETTERS[options.length] ?? String(options.length + 1);
    setOptions([...options, { key, text: "" }]);
  };
  const removeOption = (key: string) => {
    setOptions(options.filter((o) => o.key !== key));
    setCorrectKeys(correctKeys.filter((k) => k !== key));
  };
  const toggleCorrect = (key: string) => {
    if (type === "MCQ_MULTI") {
      setCorrectKeys((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      );
    } else {
      setCorrectKeys([key]);
    }
  };

  const submit = () => {
    setError(null);
    const input: QuestionInput = {
      examId,
      subjectId,
      topicId: topicId || null,
      type,
      stem,
      options: isMcq ? options.filter((o) => o.text.trim() !== "") : [],
      correctKeys: isMcq ? correctKeys : [],
      numericValue: isMcq ? null : numericValue === "" ? null : Number(numericValue),
      numericTolerance: numericTolerance === "" ? 0 : Number(numericTolerance),
      marks: Number(marks) || 0,
      negativeMarks: Number(negativeMarks) || 0,
      difficulty,
      year: year ? Number(year) : null,
      shift: shift || null,
      solution: solution || null,
    };

    startTransition(async () => {
      const res =
        questionId != null
          ? await updateQuestion(questionId, input)
          : await createQuestion(input);
      if (res.ok) {
        router.push("/admin/questions");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Taxonomy */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Exam">
          <Select
            value={examId}
            onChange={(e) => {
              setExamId(e.target.value);
              setSubjectId("");
              setTopicId("");
            }}
          >
            {taxonomy.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Subject">
          <Select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setTopicId("");
            }}
          >
            <option value="">Select subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Topic (optional)">
          <Select
            value={topicId ?? ""}
            onChange={(e) => setTopicId(e.target.value)}
            disabled={!subjectId}
          >
            <option value="">None</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Question type">
        <Select
          value={type}
          onChange={(e) => setType(e.target.value as QuestionInput["type"])}
          className="max-w-xs"
        >
          <option value="MCQ_SINGLE">MCQ — single correct</option>
          <option value="MCQ_MULTI">MCQ — multiple correct</option>
          <option value="NUMERICAL">Numerical</option>
        </Select>
      </Field>

      <Field label="Question text">
        <Textarea
          value={stem}
          onChange={(e) => setStem(e.target.value)}
          rows={4}
          placeholder="Enter the question. LaTeX/markdown allowed."
        />
      </Field>

      {isMcq ? (
        <div className="space-y-3">
          <Label>Options {type === "MCQ_MULTI" ? "(check all correct)" : "(select the correct one)"}</Label>
          {options.map((o) => (
            <div key={o.key} className="flex items-center gap-2">
              <input
                type={type === "MCQ_MULTI" ? "checkbox" : "radio"}
                name="correct"
                checked={correctKeys.includes(o.key)}
                onChange={() => toggleCorrect(o.key)}
                className="size-4"
                aria-label={`Mark option ${o.key} correct`}
              />
              <span className="w-6 text-sm font-semibold">{o.key}</span>
              <Input
                value={o.text}
                onChange={(e) =>
                  setOptions(
                    options.map((x) =>
                      x.key === o.key ? { ...x, text: e.target.value } : x
                    )
                  )
                }
                placeholder={`Option ${o.key}`}
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(o.key)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
          {options.length < 6 && (
            <Button type="button" variant="outline" size="sm" onClick={addOption}>
              <Plus className="size-4" /> Add option
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Correct value">
            <Input
              type="number"
              value={numericValue}
              onChange={(e) => setNumericValue(e.target.value)}
              placeholder="e.g. 9.8"
            />
          </Field>
          <Field label="Tolerance (±)">
            <Input
              type="number"
              value={numericTolerance}
              onChange={(e) => setNumericTolerance(e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Marks">
          <Input
            type="number"
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
          />
        </Field>
        <Field label="Negative marks">
          <Input
            type="number"
            value={negativeMarks}
            onChange={(e) => setNegativeMarks(e.target.value)}
          />
        </Field>
        <Field label="Difficulty">
          <Select
            value={difficulty}
            onChange={(e) =>
              setDifficulty(e.target.value as QuestionInput["difficulty"])
            }
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </Select>
        </Field>
        <Field label="Year">
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2023"
          />
        </Field>
      </div>

      <Field label="Reference solution (optional)">
        <Textarea
          value={solution ?? ""}
          onChange={(e) => setSolution(e.target.value)}
          rows={3}
          placeholder="A short worked solution shown as a fallback and given to the AI."
        />
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : questionId ? "Update question" : "Create question"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/questions")}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
