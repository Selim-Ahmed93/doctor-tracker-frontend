"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  StethoscopeIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/doctors", label: "Doctors", icon: StethoscopeIcon },
  { href: "/patients", label: "Patients", icon: UsersIcon },
];

const getInitials = (name) => {
  const initials = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return initials || "A";
};

function Brand({ showSubtitle = true }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ActivityIcon className="size-5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-heading truncate text-sm font-semibold">
          Doctor Tracker
        </span>
        {showSubtitle ? (
          <span className="truncate text-xs text-muted-foreground">
            Admin console
          </span>
        ) : null}
      </span>
    </span>
  );
}

function AdminSummary({ admin }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar>
        <AvatarFallback>{getInitials(admin?.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm leading-tight font-medium">
          {admin?.name || "Administrator"}
        </p>
        {admin?.email ? (
          <p className="truncate text-xs text-muted-foreground">
            {admin.email}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function NavList({ pathname, onNavigate }) {
  return (
    <nav aria-label="Main navigation">
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
                )}
              >
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-2 left-0 w-1 rounded-full bg-primary"
                  />
                ) : null}
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-foreground" : "text-muted-foreground"
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell({ children }) {
  const { admin, logout } = useAuth();
  const pathname = usePathname() || "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;

    setSigningOut(true);
    setMenuOpen(false);

    try {
      await logout();
      toast.success("Signed out successfully.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-dvh overflow-x-clip bg-muted/30">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      <div className="lg:grid lg:min-h-dvh lg:grid-cols-[16rem_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <aside className="hidden min-w-0 flex-col border-r bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-dvh">
          <div className="flex h-16 shrink-0 items-center border-b px-4">
            <Link
              href="/dashboard"
              className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Brand />
            </Link>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <p className="px-3 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Menu
            </p>
            <NavList pathname={pathname} />
          </div>

          <div className="shrink-0 border-t p-3">
            <div className="p-2">
              <AdminSummary admin={admin} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 w-full justify-start"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <LogOutIcon className="size-4" aria-hidden="true" />
              {signingOut ? "Signing out…" : "Sign out"}
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          {/* Mobile header */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
            <div className="flex min-w-0 items-center gap-1">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Open navigation menu"
                    />
                  }
                >
                  <MenuIcon className="size-5" aria-hidden="true" />
                </SheetTrigger>

                <SheetContent
                  side="left"
                  className="w-72 max-w-[85vw] gap-0 p-0"
                >
                  <SheetHeader className="border-b px-4 py-4 pr-12">
                    <SheetTitle className="flex items-center gap-2">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <ActivityIcon className="size-4" aria-hidden="true" />
                      </span>
                      Doctor Tracker
                    </SheetTitle>
                    <SheetDescription>
                      Admin console navigation
                    </SheetDescription>
                  </SheetHeader>

                  <div className="min-h-0 flex-1 overflow-y-auto p-3">
                    <NavList
                      pathname={pathname}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  </div>

                  <div className="border-t p-3">
                    <div className="p-2">
                      <AdminSummary admin={admin} />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full justify-start"
                      onClick={handleSignOut}
                      disabled={signingOut}
                    >
                      <LogOutIcon className="size-4" aria-hidden="true" />
                      {signingOut ? "Signing out…" : "Sign out"}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <Link
                href="/dashboard"
                className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Brand showSubtitle={false} />
              </Link>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className="sr-only">
                Signed in as {admin?.name || "administrator"}
              </span>
              <Avatar size="sm">
                <AvatarFallback>{getInitials(admin?.name)}</AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main
            id="main-content"
            className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10"
          >
            {children}
          </main>

          <footer className="border-t px-4 py-4 text-center text-xs text-muted-foreground sm:px-6 lg:text-left">
            Doctor Tracker · Administration
          </footer>
        </div>
      </div>
    </div>
  );
}

export default AppShell;
