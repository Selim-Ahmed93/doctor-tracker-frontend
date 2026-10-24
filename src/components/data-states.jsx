import { CircleAlertIcon, InboxIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Full-width error card with an optional retry action. */
export function DataError({
  title = "Could not load this data",
  message,
  onRetry,
  retrying = false,
  children,
}) {
  return (
    <Card className="items-center gap-3 px-6 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <CircleAlertIcon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-base font-medium">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {message || "Please try again in a moment."}
        </p>
      </div>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? "Retrying…" : "Try again"}
        </Button>
      ) : null}
      {children}
    </Card>
  );
}

/** Empty state used by the list and patient sections. */
export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  children,
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-base font-medium">{title}</h2>
        {description ? (
          <p className="max-w-md text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default EmptyState;
