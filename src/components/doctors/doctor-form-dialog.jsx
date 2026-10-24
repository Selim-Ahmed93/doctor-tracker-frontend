"use client";

import { useState } from "react";
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
import { api, ApiError, getErrorMessage } from "@/lib/api";
import {
  DOCTOR_STATUS_OPTIONS,
  doctorToForm,
  toDoctorPayload,
  validateDoctorForm,
} from "@/lib/doctor-form";
import { cn } from "@/lib/utils";

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

function DoctorFormBody({ doctor, specializations, onOpenChange, onSaved }) {
  const isEdit = Boolean(doctor?._id);
  const [values, setValues] = useState(() => doctorToForm(doctor));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const specializationItems = [...specializations];
  if (
    values.specialization &&
    !specializationItems.includes(values.specialization)
  ) {
    specializationItems.unshift(values.specialization);
  }
  const specializationOptions = specializationItems.map((value) => ({
    value,
    label: value,
  }));

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

    const nextErrors = validateDoctorForm(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFormError("Please fix the highlighted fields and try again.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const payload = toDoctorPayload(values);
      const response = isEdit
        ? await api.patch(`/doctors/${doctor._id}`, payload)
        : await api.post("/doctors", payload);

      toast.success(isEdit ? "Doctor updated." : "Doctor created.");
      onSaved?.(response?.data, isEdit ? "edit" : "create");
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldErrors = error.fieldErrors;
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
        } else if (error.status === 409 && /email/i.test(error.message)) {
          setErrors((current) => ({ ...current, email: error.message }));
        }
        setFormError(error.message);
      } else {
        setFormError(getErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  };

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
          id="name"
          label="Full name"
          error={errors.name}
          className="sm:col-span-2"
        >
          <Input
            id="name"
            value={values.name}
            onChange={(event) => setField("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            autoComplete="off"
          />
        </Field>

        <Field id="specialization" label="Specialization" error={errors.specialization}>
          <Select
            items={specializationOptions}
            value={values.specialization || null}
            onValueChange={(value) => setField("specialization", value ?? "")}
          >
            <SelectTrigger
              id="specialization"
              className="w-full"
              aria-invalid={Boolean(errors.specialization)}
              aria-describedby={
                errors.specialization ? "specialization-error" : undefined
              }
            >
              <SelectValue placeholder="Select specialization" />
            </SelectTrigger>
            <SelectContent>
              {specializationOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="status" label="Status">
          <Select
            items={DOCTOR_STATUS_OPTIONS}
            value={values.status}
            onValueChange={(value) => setField("status", value ?? "active")}
          >
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCTOR_STATUS_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          id="hospital"
          label="Hospital"
          error={errors.hospital}
          className="sm:col-span-2"
        >
          <Input
            id="hospital"
            value={values.hospital}
            onChange={(event) => setField("hospital", event.target.value)}
            aria-invalid={Boolean(errors.hospital)}
            aria-describedby={errors.hospital ? "hospital-error" : undefined}
            autoComplete="off"
          />
        </Field>

        <Field id="email" label="Email" error={errors.email}>
          <Input
            id="email"
            type="email"
            value={values.email}
            onChange={(event) => setField("email", event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            autoComplete="off"
          />
        </Field>

        <Field
          id="phone"
          label="Phone"
          error={errors.phone}
          hint="Digits, spaces, +, -, and parentheses."
        >
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={(event) => setField("phone", event.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            autoComplete="off"
          />
        </Field>

        <Field id="city" label="City" error={errors.city}>
          <Input
            id="city"
            value={values.city}
            onChange={(event) => setField("city", event.target.value)}
            aria-invalid={Boolean(errors.city)}
            aria-describedby={errors.city ? "city-error" : undefined}
            autoComplete="off"
          />
        </Field>

        <Field id="qualification" label="Qualification" error={errors.qualification}>
          <Input
            id="qualification"
            value={values.qualification}
            onChange={(event) => setField("qualification", event.target.value)}
            aria-invalid={Boolean(errors.qualification)}
            aria-describedby={
              errors.qualification ? "qualification-error" : undefined
            }
            autoComplete="off"
          />
        </Field>

        <Field
          id="experienceYears"
          label="Experience (years)"
          error={errors.experienceYears}
        >
          <Input
            id="experienceYears"
            type="number"
            inputMode="numeric"
            min="0"
            max="60"
            step="1"
            value={values.experienceYears}
            onChange={(event) => setField("experienceYears", event.target.value)}
            aria-invalid={Boolean(errors.experienceYears)}
            aria-describedby={
              errors.experienceYears ? "experienceYears-error" : undefined
            }
          />
        </Field>

        <Field
          id="consultationFee"
          label="Consultation fee"
          error={errors.consultationFee}
        >
          <Input
            id="consultationFee"
            type="number"
            inputMode="decimal"
            min="0"
            max="1000000"
            step="0.01"
            value={values.consultationFee}
            onChange={(event) =>
              setField("consultationFee", event.target.value)
            }
            aria-invalid={Boolean(errors.consultationFee)}
            aria-describedby={
              errors.consultationFee ? "consultationFee-error" : undefined
            }
          />
        </Field>
      </div>

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
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create doctor"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Create/edit dialog. The body is keyed so each opening starts clean. */
export function DoctorFormDialog({
  open,
  onOpenChange,
  doctor = null,
  specializations = [],
  onSaved,
}) {
  const isEdit = Boolean(doctor?._id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit doctor" : "Add doctor"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update the details stored for ${doctor.name}.`
              : "Add a doctor to the directory. Fields marked as required must be filled in."}
          </DialogDescription>
        </DialogHeader>

        <DoctorFormBody
          key={doctor?._id ?? "new"}
          doctor={doctor}
          specializations={specializations}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}

export default DoctorFormDialog;
