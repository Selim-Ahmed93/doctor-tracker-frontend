"use client";

import { useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, buildQuery, getErrorMessage } from "@/lib/api";

function RemovePatientBody({ patient, doctor, onOpenChange, onMoved }) {
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [targetId, setTargetId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    api
      .get(`/doctors${buildQuery({ limit: 100, sort: "name" })}`, {
        signal: controller.signal,
      })
      .then((payload) => {
        if (cancelled) return;
        setDoctors(
          (payload.data ?? []).filter(
            (entry) => String(entry._id) !== String(doctor._id)
          )
        );
        setLoadingDoctors(false);
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError") return;
        setLoadError(getErrorMessage(error));
        setLoadingDoctors(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [doctor._id, reloadKey]);

  const retryDoctors = () => {
    setLoadingDoctors(true);
    setLoadError("");
    setReloadKey((current) => current + 1);
  };

  const items = doctors.map((entry) => ({
    value: entry._id,
    label: `${entry.name} · ${entry.specialization}`,
  }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    if (!targetId) {
      setActionError("Select the doctor who will take over this patient.");
      return;
    }

    setSubmitting(true);
    setActionError("");

    try {
      await api.patch(`/patients/${patient._id}`, { doctor: targetId });
      const target = doctors.find((entry) => entry._id === targetId);
      toast.success(
        `${patient.name} was moved to ${target?.name ?? "the selected doctor"}.`
      );
      onMoved?.();
      onOpenChange(false);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Remove patient from this doctor</DialogTitle>
        <DialogDescription>
          A patient must have a primary doctor. Choose another doctor to take
          over {patient.name} - the patient record itself is kept.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg border bg-muted/40 p-3 text-sm">
        <p className="font-medium">{patient.name}</p>
        <p className="text-xs text-muted-foreground">
          {patient.patientCode} · {patient.condition} · Currently with{" "}
          {doctor.name}
        </p>
      </div>

      {loadError ? (
        <div className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="self-start"
            onClick={retryDoctors}
          >
            Try again
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="target-doctor">New primary doctor</Label>
        <Select
          items={items}
          value={targetId || null}
          onValueChange={(value) => setTargetId(value ?? "")}
          disabled={loadingDoctors || doctors.length === 0}
        >
          <SelectTrigger id="target-doctor" className="w-full">
            <SelectValue
              placeholder={
                loadingDoctors ? "Loading doctors…" : "Select a doctor"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!loadingDoctors && !loadError && doctors.length === 0 ? (
          <p className="text-xs text-destructive">
            There are no other doctors available to take over this patient.
          </p>
        ) : null}
      </div>

      {actionError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {actionError}
        </div>
      ) : null}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting || loadingDoctors || doctors.length === 0}
        >
          {submitting ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {submitting ? "Moving…" : "Move patient"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Removing a patient from a doctor's list means reassigning them, because the
 * API requires every patient to have a primary doctor. No patient is deleted.
 */
export function RemovePatientDialog({
  patient,
  doctor,
  open,
  onOpenChange,
  onMoved,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {patient && doctor ? (
          <RemovePatientBody
            key={patient._id}
            patient={patient}
            doctor={doctor}
            onOpenChange={onOpenChange}
            onMoved={onMoved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default RemovePatientDialog;
