import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function Block({ className }) {
  return (
    <Skeleton
      aria-hidden="true"
      className={cn("motion-reduce:animate-none", className)}
    />
  );
}

/**
 * Neutral, accessible placeholder shown while the session is being confirmed.
 * It mirrors the shell layout so the transition into the app is calm, and it
 * never contains page data.
 */
export function AppShellSkeleton({ label = "Checking your session…" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-h-dvh overflow-x-clip bg-muted/30"
    >
      <span className="sr-only">{label}</span>

      <div className="lg:grid lg:min-h-dvh lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="hidden flex-col border-r bg-sidebar lg:flex lg:h-dvh">
          <div className="flex h-16 items-center border-b px-4">
            <Block className="h-9 w-44" />
          </div>
          <div className="flex flex-col gap-2 p-3 pt-6">
            <Block className="h-9 w-full" />
            <Block className="h-9 w-full" />
            <Block className="h-9 w-full" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <div className="flex h-14 items-center justify-between border-b px-4 lg:hidden">
            <Block className="h-8 w-40" />
            <Block className="size-8 rounded-full" />
          </div>

          <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
            <Block className="h-7 w-40" />
            <Block className="mt-2 h-4 w-64 max-w-full" />
            <Block className="mt-6 h-24 w-full rounded-xl" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Block className="h-32 w-full rounded-xl" />
              <Block className="h-32 w-full rounded-xl" />
              <Block className="h-32 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppShellSkeleton;
