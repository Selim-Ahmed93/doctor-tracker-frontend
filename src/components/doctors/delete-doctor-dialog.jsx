"use client";

import { useState } from "react";
import { Loader2Icon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { api, getErrorMessage } from "@/lib/api";

function DeleteDoctorBody({ doctor, onOpenChange, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (deleting) return;

    setDeleting(true);
    setError("");

    try {
      await api.delete(`/doctors/${doctor._id}`);
      toast.success(`${doctor.name} was deleted.`);
      onDeleted?.(doctor);
      onOpenChange(false);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogMedia className="bg-destructive/10 text-destructive">
          <TriangleAlertIcon />
        </AlertDialogMedia>
        <AlertDialogTitle>Delete this doctor?</AlertDialogTitle>
        <AlertDialogDescription>
          {doctor.name} will be permanently removed from the directory. Doctors
          with assigned patients cannot be deleted until those patients are
          reassigned.
        </AlertDialogDescription>
      </AlertDialogHeader>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <AlertDialogFooter>
        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {deleting ? "Deleting…" : "Delete doctor"}
        </Button>
      </AlertDialogFooter>
    </>
  );
}

/** Confirmation dialog; the 409 "doctor has patients" response stays inline. */
export function DeleteDoctorDialog({ doctor, open, onOpenChange, onDeleted }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        {doctor ? (
          <DeleteDoctorBody
            key={doctor._id}
            doctor={doctor}
            onOpenChange={onOpenChange}
            onDeleted={onDeleted}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteDoctorDialog;
