"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircleAlertIcon } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AppShellSkeleton } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";

/**
 * Gate for every page inside the app. The shell and its content are only
 * rendered once the API confirms the session; while checking - or when the check
 * fails - the user sees a neutral screen instead of private data.
 */
export default function ProtectedLayout({ children }) {
  const { status, error, refresh } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "authenticated") {
    return <AppShell>{children}</AppShell>;
  }

  if (status === "error") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <Card size="sm" className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleAlertIcon
                className="size-4 text-destructive"
                aria-hidden="true"
              />
              Could not verify your session
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button type="button" onClick={() => refresh()}>
              Try again
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.replace("/login")}
            >
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <AppShellSkeleton
      label={
        status === "unauthenticated"
          ? "Redirecting to sign in…"
          : "Checking your session…"
      }
    />
  );
}
