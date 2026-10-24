"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatNumber, formatText } from "@/lib/format";
import { PATIENT_STATUS_OPTIONS } from "@/lib/patient-form";

const STATUS_COLORS = {
  active: "var(--color-emerald-500)",
  critical: "var(--color-destructive)",
  recovered: "var(--color-sky-500)",
  inactive: "var(--color-muted-foreground)",
};

const STATUS_LABELS = new Map(
  PATIENT_STATUS_OPTIONS.map(({ value, label }) => [value, label])
);

const truncateLabel = (value, maxLength = 18) => {
  const label = formatText(value);
  return label.length > maxLength
    ? `${label.slice(0, maxLength - 1).trimEnd()}…`
    : label;
};

function ChartTooltip({ active, payload, label, valueLabel = "Patients" }) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const data = item?.payload ?? {};
  const title =
    data.displayLabel ?? data.name ?? data.label ?? label ?? "Details";

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{formatText(title)}</p>
      <p className="mt-0.5 text-muted-foreground">
        {valueLabel}:{" "}
        <span className="font-medium text-foreground">
          {formatNumber(item?.value ?? 0)}
        </span>
      </p>
    </div>
  );
}

/** Monthly patient registrations for the 12 buckets returned by the API. */
export function MonthlyRegistrationsChart({ data }) {
  return (
    <div
      role="img"
      aria-label="Bar chart showing patient registrations for the last 12 months"
      className="h-[280px] w-full min-w-0"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barCategoryGap="22%"
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={18}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            width={36}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={<ChartTooltip valueLabel="Patients" />}
          />
          <Bar
            dataKey="count"
            name="Patients"
            fill="var(--color-chart-2)"
            radius={[6, 6, 0, 0]}
            maxBarSize={34}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Donut chart for the patient status distribution. */
export function StatusBreakdownChart({ data }) {
  const chartData = data.map((item) => ({
    ...item,
    displayLabel: STATUS_LABELS.get(item.label) ?? formatText(item.label),
    color: STATUS_COLORS[item.label] ?? "var(--color-chart-2)",
  }));
  const total = chartData.reduce(
    (sum, item) => sum + (Number(item.value) || 0),
    0
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={`Donut chart showing ${formatNumber(total)} patients by status`}
        className="relative h-[220px] w-full min-w-0"
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="displayLabel"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={84}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {chartData.map((item) => (
                <Cell key={item.label} fill={item.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip valueLabel="Patients" />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-2xl font-semibold tracking-tight">
            {formatNumber(total)}
          </span>
          <span className="text-xs text-muted-foreground">patients</span>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {chartData.map((item) => (
          <li
            key={item.label}
            className="flex min-w-0 items-center justify-between gap-2 text-xs"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="truncate text-muted-foreground">
                {item.displayLabel}
              </span>
            </span>
            <span className="shrink-0 font-medium">
              {formatNumber(item.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compact horizontal bars used for specializations, conditions and doctors. */
export function HorizontalBarChart({
  data,
  labelKey = "label",
  valueKey = "value",
  color = "var(--color-chart-2)",
  maxItems = 8,
  labelWidth = 112,
  maxLabelLength = 18,
  ariaLabel = "Horizontal bar chart",
}) {
  const chartData = data.slice(0, maxItems);
  const height = Math.max(180, chartData.length * 30 + 20);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className="w-full min-w-0"
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 28, left: 0, bottom: 4 }}
        >
          <CartesianGrid
            horizontal={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis type="number" hide domain={[0, "dataMax + 1"]} />
          <YAxis
            type="category"
            dataKey={labelKey}
            width={labelWidth}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(value) => truncateLabel(value, maxLabelLength)}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            content={<ChartTooltip valueLabel="Patients" />}
          />
          <Bar
            dataKey={valueKey}
            name="Patients"
            fill={color}
            radius={[0, 6, 6, 0]}
            maxBarSize={18}
            isAnimationActive={false}
          >
            <LabelList
              dataKey={valueKey}
              position="right"
              fill="var(--muted-foreground)"
              fontSize={11}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
