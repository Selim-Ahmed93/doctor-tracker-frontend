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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, buildQuery, getErrorMessage } from "@/lib/api";
import {
  BLOOD_GROUP_OPTIONS,
  GENDER_OPTIONS,
  PATIENT_STATUS_OPTIONS,
  mapPatientFieldErrors,
  patientToForm,
  toPatientPayload,
  validatePatientForm,
} from "@/lib/patient-form";
import { cn } from "@/lib/utils";

const NO_BLOOD_GROUP = "none";

function Field({ id, label, error, hint, className, children }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function PatientFormSkeleton() {
  return (
    <div
      className="flex flex-col gap-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading patient details…</span>
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

function PatientFormFields({
  patient,
  doctors,
  doctorsStatus,
  doctorsError,
  onRetryDoctors,
  conditions,
  onOpenChange,
  onSaved,
}) {
  const isEdit = Boolean(patient?._id);
  const [values, setValues] = useState(() => patientToForm(patient));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const doctorItems = doctors.map((doctor) => ({
    value: doctor._id,
    label: `${doctor.name} · ${doctor.specialization}`,
  }));

  if (
    values.doctor &&
    !doctorItems.some((item) => item.value === values.doctor)
  ) {
    const currentDoctor =
      patient?.doctor && typeof patient.doctor === "object"
        ? patient.doctor
        : null;

    doctorItems.unshift({
      value: values.doctor,
      label: currentDoctor?.name
        ? `${currentDoctor.name}${currentDoctor.specialization ? ` · ${currentDoctor.specialization}` : ""}`
        : "Current doctor",
    });
  }

  const setField = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors = validatePatientForm(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFormError("Please fix the highlighted fields and try again.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const payload = toPatientPayload(values);
      const response = isEdit
        ? await api.patch(`/patients/${patient._id}`, payload)
        : await api.post("/patients", payload);

      toast.success(isEdit ? "Patient updated." : "Patient created.");
      onSaved?.(response?.data, isEdit ? "edit" : "create");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = mapPatientFieldErrors(error.fieldErrors);
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        }
        setFormError(error.message);
      } else {
        setFormError(getErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const noDoctors =
    doctorsStatus === "success" && doctorItems.length === 0 && !values.doctor;

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {formError}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="patient-name"
          label="Full name"
          error={errors.name}
          className="sm:col-span-2"
        >
          <Input
            id="patient-name"
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "patient-name-error" : undefined}
            autoComplete="off"
          />
        </Field>

        <Field id="patient-phone" label="Phone" error={errors.phone}>
          <Input
            id="patient-phone"
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={(event) => setField("phone", event.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={
              errors.phone ? "patient-phone-error" : undefined
            }
            autoComplete="off"
          />
        </Field>

        <Field
          id="patient-email"
          label="Email"
          error={errors.email}
          hint="Optional."
        >
          <Input
            id="patient-email"
            type="email"
            value={values.email}
            onChange={(event) => setField("email", event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={
              errors.email ? "patient-email-error" : undefined
            }
            autoComplete="off"
          />
        </Field>

        <Field id="patient-gender" label="Gender" error={errors.gender}>
          <Select
            items={GENDER_OPTIONS}
            value={values.gender || null}
            onValueChange={(value) => setField("gender", value ?? "")}
          >
            <SelectTrigger
              id="patient-gender"
              className="w-full"
              aria-invalid={Boolean(errors.gender)}
              aria-describedby={
                errors.gender ? "patient-gender-error" : undefined
              }
            >
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          id="patient-date-of-birth"
          label="Date of birth"
          error={errors.dateOfBirth}
        >
          <Input
            id="patient-date-of-birth"
            type="date"
            value={values.dateOfBirth}
            onChange={(event) => setField("dateOfBirth", event.target.value)}
            aria-invalid={Boolean(errors.dateOfBirth)}
            aria-describedby={
              errors.dateOfBirth ? "patient-date-of-birth-error" : undefined
            }
          />
        </Field>

        <Field
          id="patient-blood-group"
          label="Blood group"
          error={errors.bloodGroup}
        >
          <Select
            items={[
              { value: NO_BLOOD_GROUP, label: "Not set" },
              ...BLOOD_GROUP_OPTIONS,
            ]}
            value={values.bloodGroup || NO_BLOOD_GROUP}
            onValueChange={(value) =>
              setField(
                "bloodGroup",
                !value || value === NO_BLOOD_GROUP ? "" : value
              )
            }
          >
            <SelectTrigger
              id="patient-blood-group"
              className="w-full"
              aria-invalid={Boolean(errors.bloodGroup)}
              aria-describedby={
                errors.bloodGroup ? "patient-blood-group-error" : undefined
              }
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_BLOOD_GROUP}>Not set</SelectItem>
              {BLOOD_GROUP_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          id="patient-condition"
          label="Primary condition"
          error={errors.condition}
          hint="Pick an existing condition or type a new one."
          className="sm:col-span-2"
        >
          <Input
            id="patient-condition"
            list="patient-condition-options"
            value={values.condition}
            onChange={(event) => setField("condition", event.target.value)}
            aria-invalid={Boolean(errors.condition)}
            aria-describedby={
              errors.condition ? "patient-condition-error" : undefined
            }
            autoComplete="off"
          />
          <datalist id="patient-condition-options">
            {conditions.map((condition) => (
              <option key={condition} value={condition} />
            ))}
          </datalist>
        </Field>

        <Field id="patient-status" label="Status">
          <Select
            items={PATIENT_STATUS_OPTIONS}
            value={values.status}
            onValueChange={(value) => setField("status", value ?? "active")}
          >
            <SelectTrigger id="patient-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PATIENT_STATUS_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          id="patient-doctor"
          label="Primary doctor"
          error={errors.doctor}
          hint={
            doctorsStatus === "loading"
              ? "Loading doctors…"
              : noDoctors
                ? "No doctors are available. Add a doctor first."
                : undefined
          }
        >
          <Select
            items={doctorItems}
            value={values.doctor || null}
            onValueChange={(value) => setField("doctor", value ?? "")}
            disabled={doctorsStatus === "loading" || doctorItems.length === 0}
          >
            <SelectTrigger
              id="patient-doctor"
              className="w-full"
              aria-invalid={Boolean(errors.doctor)}
              aria-describedby={
                errors.doctor ? "patient-doctor-error" : undefined
              }
            >
              <SelectValue
                placeholder={
                  doctorsStatus === "loading"
                    ? "Loading doctors…"
                    : "Select a doctor"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {doctorItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {doctorsError ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-destructive">{doctorsError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetryDoctors}
              >
                Retry
              </Button>
            </div>
          ) : null}
        </Field>

        <Field
          id="patient-admission-date"
          label="Admission date"
          error={errors.admissionDate}
        >
          <Input
            id="patient-admission-date"
            type="date"
            value={values.admissionDate}
            onChange={(event) => setField("admissionDate", event.target.value)}
            aria-invalid={Boolean(errors.admissionDate)}
            aria-describedby={
              errors.admissionDate ? "patient-admission-date-error" : undefined
            }
          />
        </Field>

        <Field
          id="patient-last-visit"
          label="Last visit"
          error={errors.lastVisitDate}
          hint={isEdit ? "Leave blank to keep the stored date." : undefined}
        >
          <Input
            id="patient-last-visit"
            type="date"
            value={values.lastVisitDate}
            onChange={(event) => setField("lastVisitDate", event.target.value)}
            aria-invalid={Boolean(errors.lastVisitDate)}
            aria-describedby={
              errors.lastVisitDate ? "patient-last-visit-error" : undefined
            }
          />
        </Field>

        <Field
          id="patient-notes"
          label="Notes"
          error={errors.notes}
          hint={`${values.notes.length}/500 characters`}
          className="sm:col-span-2"
        >
          <Textarea
            id="patient-notes"
            value={values.notes}
            onChange={(event) => setField("notes", event.target.value)}
            aria-invalid={Boolean(errors.notes)}
            aria-describedby={
              errors.notes ? "patient-notes-error" : undefined
            }
            rows={3}
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-4 rounded-lg border p-3">
        <legend className="px-1 text-xs font-medium text-muted-foreground">
          Address (optional)
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="patient-address-street"
            label="Street"
            error={errors.addressStreet}
            className="sm:col-span-2"
          >
            <Input
              id="patient-address-street"
              value={values.addressStreet}
              onChange={(event) =>
                setField("addressStreet", event.target.value)
              }
              aria-invalid={Boolean(errors.addressStreet)}
              aria-describedby={
                errors.addressStreet ? "patient-address-street-error" : undefined
              }
              autoComplete="off"
            />
          </Field>

          <Field
            id="patient-address-city"
            label="City"
            error={errors.addressCity}
          >
            <Input
              id="patient-address-city"
              value={values.addressCity}
              onChange={(event) => setField("addressCity", event.target.value)}
              aria-invalid={Boolean(errors.addressCity)}
              aria-describedby={
                errors.addressCity ? "patient-address-city-error" : undefined
              }
              autoComplete="off"
            />
          </Field>

          <Field
            id="patient-address-state"
            label="State"
            error={errors.addressState}
          >
            <Input
              id="patient-address-state"
              value={values.addressState}
              onChange={(event) => setField("addressState", event.target.value)}
              aria-invalid={Boolean(errors.addressState)}
              aria-describedby={
                errors.addressState ? "patient-address-state-error" : undefined
              }
              autoComplete="off"
            />
          </Field>

          <Field
            id="patient-address-zip"
            label="ZIP"
            error={errors.addressZip}
          >
            <Input
              id="patient-address-zip"
              value={values.addressZip}
              onChange={(event) => setField("addressZip", event.target.value)}
              aria-invalid={Boolean(errors.addressZip)}
              aria-describedby={
                errors.addressZip ? "patient-address-zip-error" : undefined
              }
              autoComplete="off"
            />
          </Field>
        </div>
      </fieldset>

      <DialogFooter className="mt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create patient"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/**
 * Create/edit dialog. In edit mode the full record is loaded from the API so
 * fields that the list endpoint does not return (notes, address) are preserved.
 * The body is keyed so each opening starts clean.
 */
export function PatientFormDialog({
  open,
  onOpenChange,
  patientId = null,
  conditions = [],
  onSaved,
}) {
  const isEdit = Boolean(patientId);

  const [patientState, setPatientState] = useState(() => ({
    status: isEdit ? "loading" : "ready",
    patient: null,
    error: "",
  }));
  const [patientReloadKey, setPatientReloadKey] = useState(0);

  const [doctorsState, setDoctorsState] = useState({
    status: "loading",
    doctors: [],
    error: "",
  });
  const [doctorsReloadKey, setDoctorsReloadKey] = useState(0);

  useEffect(() => {
    if (!isEdit) return undefined;

    const controller = new AbortController();
    let cancelled = false;

    api
      .get(`/patients/${patientId}`, { signal: controller.signal })
      .then((payload) => {
        if (cancelled) return;
        setPatientState({
          status: "ready",
          patient: payload.data,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError") return;
        setPatientState({
          status: "error",
          patient: null,
          error: getErrorMessage(error),
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isEdit, patientId, patientReloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    api
      .get(`/doctors${buildQuery({ limit: 100, sort: "name" })}`, {
        signal: controller.signal,
      })
      .then((payload) => {
        if (cancelled) return;
        setDoctorsState({
          status: "success",
          doctors: payload.data ?? [],
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError") return;
        setDoctorsState({
          status: "error",
          doctors: [],
          error: getErrorMessage(error),
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [doctorsReloadKey]);

  const retryPatient = () => {
    setPatientState((current) => ({
      ...current,
      status: "loading",
      error: "",
    }));
    setPatientReloadKey((current) => current + 1);
  };

  const retryDoctors = () => {
    setDoctorsState((current) => ({
      ...current,
      status: "loading",
      error: "",
    }));
    setDoctorsReloadKey((current) => current + 1);
  };

  const ready = !isEdit || patientState.status === "ready";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit patient" : "Add patient"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the patient record or move them to another primary doctor."
              : "Create a patient record. The patient code is generated by the server."}
          </DialogDescription>
        </DialogHeader>

        {isEdit && patientState.status === "loading" ? (
          <PatientFormSkeleton />
        ) : null}

        {isEdit && patientState.status === "error" ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="max-w-md text-sm text-destructive">
              {patientState.error}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={retryPatient}
            >
              Try again
            </Button>
          </div>
        ) : null}

        {ready ? (
          <PatientFormFields
            key={patientId ?? "new"}
            patient={patientState.patient}
            doctors={doctorsState.doctors}
            doctorsStatus={doctorsState.status}
            doctorsError={doctorsState.error}
            onRetryDoctors={retryDoctors}
            conditions={conditions}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default PatientFormDialog;
