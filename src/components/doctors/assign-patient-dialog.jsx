"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { EntityStatusBadge } from "@/components/doctors/entity-status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, buildQuery, getErrorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/use-debounced-value";

/**
 * Assigns an existing patient to the doctor by updating the patient's primary
 * doctor. It never creates a patient record, so no duplicates are possible.
 */
export function AssignPatientDialog({
  doctor,
  open,
  onOpenChange,
  onAssigned,
}) {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({
    status: "loading",
    patients: [],
    error: "",
  });
  const [assigningId, setAssigningId] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!open) return undefined;

    const controller = new AbortController();
    let cancelled = false;

    api
      .get(`/patients${buildQuery({ search, limit: 10, sort: "name" })}`, {
        signal: controller.signal,
      })
      .then((payload) => {
        if (cancelled) return;
        setState({ status: "success", patients: payload.data ?? [], error: "" });
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError") return;
        setState({
          status: "error",
          patients: [],
          error: getErrorMessage(error),
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open, search, reloadKey]);

  const retry = () => {
    setState({ status: "loading", patients: [], error: "" });
    setReloadKey((current) => current + 1);
  };

  const handleAssign = async (patient) => {
    if (assigningId) return;

    setAssigningId(patient._id);
    setActionError("");

    try {
      await api.patch(`/patients/${patient._id}`, { doctor: doctor._id });
      toast.success(`${patient.name} is now assigned to ${doctor.name}.`);
      onAssigned?.();
      onOpenChange(false);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign a patient</DialogTitle>
          <DialogDescription>
            Choose an existing patient for {doctor?.name}. Their record is
            updated, never duplicated.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, code, phone, or condition"
            aria-label="Search patients to assign"
            className="pl-8"
            autoFocus
          />
        </div>

        {actionError ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {actionError}
          </div>
        ) : null}

        <div className="max-h-72 min-h-32 overflow-y-auto rounded-lg border">
          {state.status === "loading" ? (
            <div
              className="flex flex-col gap-3 p-3"
              role="status"
              aria-live="polite"
            >
              <span className="sr-only">Loading patients…</span>
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <div className="flex flex-1 flex-col gap-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-7 w-16" />
                </div>
              ))}
            </div>
          ) : null}

          {state.status === "error" ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <p className="text-sm text-destructive">{state.error}</p>
              <Button type="button" size="sm" variant="outline" onClick={retry}>
                Try again
              </Button>
            </div>
          ) : null}

          {state.status === "success" && state.patients.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No patients match your search.
            </p>
          ) : null}

          {state.status === "success" && state.patients.length > 0 ? (
            <ul className="divide-y">
              {state.patients.map((patient) => {
                const currentDoctorId = patient.doctor?._id ?? patient.doctor;
                const isCurrent =
                  String(currentDoctorId) === String(doctor?._id);

                return (
                  <li
                    key={patient._id}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {patient.name}
                        </p>
                        <EntityStatusBadge status={patient.status} />
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {patient.patientCode} · {patient.condition} · Currently
                        with {patient.doctor?.name ?? "another doctor"}
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={isCurrent ? "secondary" : "default"}
                      className="shrink-0"
                      onClick={() => handleAssign(patient)}
                      disabled={isCurrent || Boolean(assigningId)}
                    >
                      {assigningId === patient._id ? (
                        <Loader2Icon
                          className="size-3.5 animate-spin"
                          aria-hidden="true"
                        />
                      ) : null}
                      {assigningId === patient._id
                        ? "Assigning…"
                        : isCurrent
                          ? "Assigned"
                          : "Assign"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          Showing up to 10 matches. Refine your search to find a specific
          patient.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default AssignPatientDialog;
