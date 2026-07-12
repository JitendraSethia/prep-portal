import Link from "next/link";
import { Clock, FileText, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface PaperCardData {
  id: string;
  title: string;
  examName: string;
  type: "PREVIOUS_YEAR" | "MOCK";
  durationMins: number;
  year: number | null;
  questionCount: number;
}

export function PaperCard({ paper }: { paper: PaperCardData }) {
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary">{paper.examName}</Badge>
          <Badge variant={paper.type === "MOCK" ? "outline" : "default"}>
            {paper.type === "MOCK" ? "Mock" : "Previous year"}
          </Badge>
        </div>

        <Link href={`/papers/${paper.id}`} className="group">
          <h3 className="font-semibold leading-snug group-hover:text-primary">
            {paper.title}
          </h3>
        </Link>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ListChecks className="size-4" /> {paper.questionCount} questions
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" /> {paper.durationMins} min
          </span>
          {paper.year && (
            <span className="inline-flex items-center gap-1">
              <FileText className="size-4" /> {paper.year}
            </span>
          )}
        </div>

        <Link href={`/papers/${paper.id}`} className="mt-2">
          <Button className="w-full" size="sm">
            View &amp; start
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
