"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ActivityIcon,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  StethoscopeIcon,
  UsersIcon,
} from "lucide-react";

import {
  HorizontalBarChart,
  MonthlyRegistrationsChart,
  StatusBreakdownChart,
} from "@/components/dashboard/dashboard-charts";
import { DataError, EmptyState } from "@/components/data-states";
import { EntityStatusBadge } from "@/components/doctors/entity-status-badge";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate, formatNumber, formatText } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Small client-side resource hook. The dashboard has three independent
 * endpoints so each section can keep its own loading, error and retry state.
 */
function useDashboardResource(path) {
  const [state, setState] = useState({
    status: "loading",
    data: null,
    error: "",
  });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    api
      .get(path, { signal: controller.signal })
      .then((payload) => {
        if (cancelled) return;
        setState({ status: "success", data: payload.data ?? null, error: "" });
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError") return;
        setState({
          status: "error",
          data: null,
          error: getErrorMessage(error),
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [path, reloadKey]);

  const retry = () => {
    setState((current) => ({ ...current, status: "loading", error: "" }));
    setReloadKey((current) => current + 1);
  };

  return { ...state, retry };
}

function StatCard({ title, description, value, icon: Icon, footer }) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm">{title}</CardTitle>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="font-heading text-3xl font-semibold tracking-tight">
          {formatNumber(value)}
        </p>
        {footer ? (
          <p className="text-xs text-muted-foreground">{footer}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatCardsSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading practice statistics…</span>
      <div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-hidden="true"
      >
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} size="sm" className="min-w-0">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
              <Skeleton className="h-4 w-40 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-4 w-32 max-w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ChartCardSkeleton({ className, height = "h-[280px]" }) {
  return (
    <Card size="sm" className={cn("min-w-0", className)} aria-hidden="true">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className={cn("w-full rounded-lg", height)} />
      </CardContent>
    </Card>
  );
}

function ChartsSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading dashboard charts…</span>
      <div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        aria-hidden="true"
      >
        <ChartCardSkeleton className="md:col-span-2 lg:col-span-2" />
        <ChartCardSkeleton />
        <ChartCardSkeleton height="h-[240px]" />
        <ChartCardSkeleton height="h-[240px]" />
        <ChartCardSkeleton height="h-[240px]" />
      </div>
    </div>
  );
}

function RecentSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading recent activity…</span>
      <div className="grid gap-4 lg:grid-cols-2" aria-hidden="true">
        {[0, 1].map((card) => (
          <Card key={card} size="sm" className="min-w-0">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48 max-w-full" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {[0, 1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <Skeleton className="h-4 w-40 max-w-full" />
                    <Skeleton className="h-3 w-56 max-w-full" />
                  </div>
                  <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function doctorSummary(doctor) {
  const name = formatText(doctor?.name, "");
  const specialization = formatText(doctor?.specialization, "");

  if (!name) return "No doctor assigned";
  return specialization ? `${name} · ${specialization}` : name;
}

/**
 * Aggregations that tie on value come back from MongoDB in an arbitrary order.
 * Sorting by value and then label keeps the chart order stable between loads.
 */
function sortByValueThenLabel(items, labelKey) {
  return [...items].sort((left, right) => {
    const valueDifference =
      (Number(right.value) || 0) - (Number(left.value) || 0);
    if (valueDifference) return valueDifference;

    return String(left[labelKey] ?? "").localeCompare(
      String(right[labelKey] ?? "")
    );
  });
}

function RecentPatientsCard({ patients }) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle>Recent patients</CardTitle>
        <CardDescription>The five newest patient records.</CardDescription>
        <CardAction>
          <Link
            href="/patients"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            View all
            <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2">
        {patients.length ? (
          <ul className="flex flex-col">
            {patients.map((patient) => (
              <li key={patient._id}>
                <Link
                  href={`/patients/${patient._id}`}
                  className="group flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium group-hover:underline">
                      {formatText(patient.name)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {formatText(patient.patientCode)} ·{" "}
                      {formatText(patient.condition)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {doctorSummary(patient.doctor)}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <EntityStatusBadge status={patient.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(patient.createdAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={UsersIcon}
            title="No patients yet"
            description="Patient records will appear here as they are added."
          />
        )}
      </CardContent>
    </Card>
  );
}

function RecentDoctorsCard({ doctors }) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle>Recent doctors</CardTitle>
        <CardDescription>The five newest doctor records.</CardDescription>
        <CardAction>
          <Link
            href="/doctors"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            View all
            <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2">
        {doctors.length ? (
          <ul className="flex flex-col">
            {doctors.map((doctor) => (
              <li key={doctor._id}>
                <Link
                  href={`/doctors/${doctor._id}`}
                  className="group flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium group-hover:underline">
                      {formatText(doctor.name)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {formatText(doctor.specialization)} ·{" "}
                      {formatText(doctor.hospital)}
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <EntityStatusBadge status={doctor.status} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(doctor.createdAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={StethoscopeIcon}
            title="No doctors yet"
            description="Doctor records will appear here as they are added."
          />
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { admin } = useAuth();
  const stats = useDashboardResource("/dashboard/stats");
  const charts = useDashboardResource("/dashboard/charts");
  const recent = useDashboardResource("/dashboard/recent");

  const statsData = stats.data ?? {};
  const chartsData = charts.data ?? {};
  const recentData = recent.data ?? {};

  const monthlyRegistrations = chartsData.monthlyRegistrations ?? [];
  const monthlyTotal = monthlyRegistrations.reduce(
    (sum, item) => sum + (Number(item.count) || 0),
    0
  );
  const patientsByStatus = sortByValueThenLabel(
    chartsData.patientsByStatus ?? [],
    "label"
  );
  const patientsByCondition = sortByValueThenLabel(
    chartsData.patientsByCondition ?? [],
    "label"
  );
  const patientsBySpecialization = sortByValueThenLabel(
    chartsData.patientsBySpecialization ?? [],
    "label"
  );
  const topDoctors = sortByValueThenLabel(chartsData.topDoctors ?? [], "name");

  const specializationDescription =
    patientsBySpecialization.length > 8
      ? `Top 8 of ${formatNumber(patientsBySpecialization.length)} specializations by patient count.`
      : "Patients assigned across doctor specializations.";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back${
          admin?.name ? `, ${admin.name}` : ""
        }. A live overview of your practice and records.`}
      />

      <section
        aria-labelledby="summary-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="summary-heading" className="text-sm font-medium">
            Practice summary
          </h2>
          {stats.status === "success" && statsData.generatedAt ? (
            <span className="text-xs text-muted-foreground">
              Updated {formatDate(statsData.generatedAt)}
            </span>
          ) : null}
        </div>

        {stats.status === "loading" ? <StatCardsSkeleton /> : null}

        {stats.status === "error" ? (
          <DataError
            title="Could not load practice statistics"
            message={stats.error}
            onRetry={stats.retry}
          />
        ) : null}

        {stats.status === "success" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total doctors"
              description="Doctors in the directory."
              value={statsData.totalDoctors}
              icon={StethoscopeIcon}
              footer={`${formatNumber(
                statsData.activeDoctors
              )} active · ${formatNumber(
                statsData.averagePatientsPerDoctor
              )} patients per doctor`}
            />
            <StatCard
              title="Total patients"
              description="Patients across all doctors."
              value={statsData.totalPatients}
              icon={UsersIcon}
              footer={`${formatNumber(statsData.activePatients)} active`}
            />
            <StatCard
              title="Critical patients"
              description="Patients currently marked critical."
              value={statsData.criticalPatients}
              icon={ActivityIcon}
              footer={`${formatNumber(statsData.recoveredPatients)} recovered`}
            />
            <StatCard
              title="New this month"
              description="Patients registered since the start of the month."
              value={statsData.newPatientsThisMonth}
              icon={CalendarDaysIcon}
              footer={`${formatNumber(
                statsData.newPatientsThisWeek
              )} in the last 7 days`}
            />
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby="insights-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="insights-heading" className="text-sm font-medium">
            Patient insights
          </h2>
          {charts.status === "success" ? (
            <Badge variant="outline">Live data</Badge>
          ) : null}
        </div>

        {charts.status === "loading" ? <ChartsSkeleton /> : null}

        {charts.status === "error" ? (
          <DataError
            title="Could not load dashboard charts"
            message={charts.error}
            onRetry={charts.retry}
          />
        ) : null}

        {charts.status === "success" ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card
              size="sm"
              className="min-w-0 md:col-span-2 lg:col-span-2"
            >
              <CardHeader>
                <CardTitle>Monthly registrations</CardTitle>
                <CardDescription>
                  Patients registered in the last 12 months.
                </CardDescription>
                <CardAction>
                  <Badge variant="secondary">
                    {formatNumber(monthlyTotal)} total
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                {monthlyRegistrations.length && monthlyTotal > 0 ? (
                  <MonthlyRegistrationsChart
                    data={monthlyRegistrations}
                  />
                ) : (
                  <EmptyState
                    icon={CalendarDaysIcon}
                    title="No registrations yet"
                    description="Patient registrations in the last 12 months will appear here."
                  />
                )}
              </CardContent>
            </Card>

            <Card size="sm" className="min-w-0">
              <CardHeader>
                <CardTitle>Patients by status</CardTitle>
                <CardDescription>
                  Current status distribution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {patientsByStatus.length ? (
                  <StatusBreakdownChart data={patientsByStatus} />
                ) : (
                  <EmptyState
                    icon={UsersIcon}
                    title="No patient data"
                    description="Status totals will appear here once patients are added."
                  />
                )}
              </CardContent>
            </Card>

            <Card size="sm" className="min-w-0">
              <CardHeader>
                <CardTitle>Top doctors by patients</CardTitle>
                <CardDescription>
                  The doctors with the most patients assigned.
                </CardDescription>
                <CardAction>
                  <Link
                    href="/doctors"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    All doctors
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent>
                {topDoctors.length ? (
                  <HorizontalBarChart
                    data={topDoctors}
                    labelKey="name"
                    valueKey="value"
                    color="var(--color-chart-2)"
                    maxItems={8}
                    labelWidth={112}
                    maxLabelLength={16}
                    ariaLabel="Horizontal bar chart of the top doctors by patient count"
                  />
                ) : (
                  <EmptyState
                    icon={StethoscopeIcon}
                    title="No doctor assignments"
                    description="Patient counts per doctor will appear here once patients are assigned."
                  />
                )}
              </CardContent>
            </Card>

            <Card size="sm" className="min-w-0">
              <CardHeader>
                <CardTitle>Patients by condition</CardTitle>
                <CardDescription>
                  The most common conditions among current patients.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {patientsByCondition.length ? (
                  <HorizontalBarChart
                    data={patientsByCondition}
                    labelKey="label"
                    valueKey="value"
                    color="var(--color-chart-3)"
                    maxItems={8}
                    labelWidth={104}
                    maxLabelLength={16}
                    ariaLabel="Horizontal bar chart of patients by condition"
                  />
                ) : (
                  <EmptyState
                    icon={ActivityIcon}
                    title="No conditions recorded"
                    description="Condition totals will appear here once patients are added."
                  />
                )}
              </CardContent>
            </Card>

            <Card size="sm" className="min-w-0">
              <CardHeader>
                <CardTitle>Patients by specialization</CardTitle>
                <CardDescription>
                  {specializationDescription}
                </CardDescription>
                <CardAction>
                  <Link
                    href="/doctors"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Doctors
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent>
                {patientsBySpecialization.length ? (
                  <HorizontalBarChart
                    data={patientsBySpecialization}
                    labelKey="label"
                    valueKey="value"
                    color="var(--color-chart-4)"
                    maxItems={8}
                    labelWidth={112}
                    maxLabelLength={16}
                    ariaLabel="Horizontal bar chart of patients by doctor specialization"
                  />
                ) : (
                  <EmptyState
                    icon={StethoscopeIcon}
                    title="No specialization data"
                    description="Patient totals by specialization will appear here once patients are assigned."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby="recent-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="recent-heading" className="text-sm font-medium">
            Recent activity
          </h2>
          <span className="text-xs text-muted-foreground">
            Newest records first
          </span>
        </div>

        {recent.status === "loading" ? <RecentSkeleton /> : null}

        {recent.status === "error" ? (
          <DataError
            title="Could not load recent activity"
            message={recent.error}
            onRetry={recent.retry}
          />
        ) : null}

        {recent.status === "success" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <RecentPatientsCard
              patients={recentData.recentPatients ?? []}
            />
            <RecentDoctorsCard doctors={recentData.recentDoctors ?? []} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
