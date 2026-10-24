import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_META = {
  active: {
    label: "Active",
    className:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  on_leave: {
    label: "On leave",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  },
  inactive: {
    label: "Inactive",
    className: "bg-muted text-muted-foreground",
  },
  critical: {
    label: "Critical",
    className: "bg-destructive/10 text-destructive",
  },
  recovered: {
    label: "Recovered",
    className: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  },
};

/** Renders the doctor/patient status enums returned by the API. */
export function EntityStatusBadge({ status, className }) {
  const meta = STATUS_META[status] ?? {
    label: status || "Unknown",
    className: "bg-muted text-muted-foreground",
  };

  return (
    <Badge
      variant="secondary"
      className={cn("border-transparent", meta.className, className)}
    >
      {meta.label}
    </Badge>
  );
}

export default EntityStatusBadge;
