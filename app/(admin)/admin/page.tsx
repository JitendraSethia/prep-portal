import { Users, FileCheck2, Database, Trophy } from "lucide-react";
import {
  getDashboardOverview,
  getDailyActivity,
  getEventTypeBreakdown,
  getTopPapers,
  getMostMissedQuestions,
  getTopPagesByTime,
} from "@/lib/data/analytics";
import { formatDuration } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityLineChart, EventTypeBarChart } from "@/components/admin/charts";
import { RankedBars } from "@/components/admin/ranked-bars";

export const metadata = { title: "Analytics" };

export default async function AdminDashboardPage() {
  const [overview, activity, eventTypes, topPapers, missed, topPages] =
    await Promise.all([
      getDashboardOverview(),
      getDailyActivity(14),
      getEventTypeBreakdown(),
      getTopPapers(),
      getMostMissedQuestions(),
      getTopPagesByTime(),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Student activity, engagement and question performance.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Users className="size-5" />}
          label="Students"
          value={String(overview.students)}
        />
        <Kpi
          icon={<FileCheck2 className="size-5" />}
          label="Tests submitted"
          value={String(overview.submittedAttempts)}
        />
        <Kpi
          icon={<Database className="size-5" />}
          label="Questions"
          value={String(overview.questions)}
        />
        <Kpi
          icon={<Trophy className="size-5" />}
          label="Avg score"
          value={
            overview.submittedAttempts ? overview.avgScore.toFixed(1) : "—"
          }
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity (last 14 days)</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <ActivityLineChart data={activity} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Events by type</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <EventTypeBarChart data={eventTypes} />
          </CardContent>
        </Card>
      </div>

      {/* Ranked lists */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most attempted papers</CardTitle>
          </CardHeader>
          <CardContent>
            <RankedBars
              items={topPapers.map((p) => ({
                label: p.title,
                value: p.attempts,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most-missed questions</CardTitle>
          </CardHeader>
          <CardContent>
            <RankedBars
              items={missed.map((m) => ({
                label: m.stem,
                value: m.wrong,
                display: `${m.wrong} wrong`,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time by page</CardTitle>
          </CardHeader>
          <CardContent>
            <RankedBars
              items={topPages.map((p) => ({
                label: p.path,
                value: p.ms,
                display: formatDuration(p.ms),
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
