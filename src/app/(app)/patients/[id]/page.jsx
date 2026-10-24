"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ActivityIcon,
  ArrowLeftIcon,
  BuildingIcon,
  CakeIcon,
  CalendarIcon,
  DropletIcon,
  FileTextIcon,
  HashIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  StethoscopeIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";

import { DataError } from "@/components/data-states";
import { EntityStatusBadge } from "@/components/doctors/entity-status-badge";
import { DeletePatientDialog } from "@/components/patients/delete-patient-dialog";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, getErrorMessage } from "@/lib/api";
import { formatDate, formatText } from "@/lib/format";

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate text-sm font-medium">{formatText(value)}</dd>
      </div>
    </div>
  );
}

function getAge(value) {
  if (!value) return "";
  const dateOfBirth = new Date(value);
  if (Number.isNaN(dateOfBirth.getTime())) return "";

  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDifference = now.getMonth() - dateOfBirth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && now.getDate() < dateOfBirth.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? `${age} year${age === 1 ? "" : "s"}` : "";
}

function PatientDetailSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading patient details…</span>
      <Skeleton className="h-7 w-32" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const [conditions, setConditions] = useState([]);
  const [patientState, setPatientState] = useState({
    id: "",
    status: "loading",
    patient: null,
    error: "",
    statusCode: 0,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/meta/filters")
      .then((payload) => {
        if (cancelled) return;
        setConditions(payload.data?.conditions ?? []);
      })
      .catch(() => {
        // Conditions are suggestions only; the condition field stays free text.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!id) return undefined;

    const controller = new AbortController();
    let cancelled = false;

    api
      .get(`/patients/${id}`, { signal: controller.signal })
      .then((payload) => {
        if (cancelled) return;
        setPatientState({
          id,
          status: "success",
          patient: payload.data,
          error: "",
          statusCode: 0,
        });
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError") return;
        setPatientState((current) => {
          if (current.id === id && current.patient) return current;
          return {
            id,
            status: "error",
            patient: null,
            error: getErrorMessage(error),
            statusCode: error?.status ?? 0,
          };
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id, reloadKey]);

  const patient = patientState.id === id ? patientState.patient : null;
  const isLoading =
    !patient && (patientState.id !== id || patientState.status === "loading");
  const isError =
    !patient && patientState.id === id && patientState.status === "error";

  const retry = () => {
    setPatientState((current) => ({
      ...current,
      status: "loading",
      error: "",
    }));
    setReloadKey((current) => current + 1);
  };

  const refresh = () => setReloadKey((current) => current + 1);

  if (isLoading) {
    return <PatientDetailSkeleton />;
  }

  if (isError) {
    const notFound =
      patientState.statusCode === 404 || patientState.statusCode === 422;
    const invalid = patientState.statusCode === 422;

    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/patients"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "self-start",
          })}
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Back to patients
        </Link>

        <DataError
          title={
            notFound
              ? invalid
                ? "Invalid patient link"
                : "Patient not found"
              : "Could not load this patient"
          }
          message={
            notFound
              ? invalid
                ? "This patient link is not valid. Return to the directory to find the patient."
                : "This patient may have been removed from the directory."
              : patientState.error
          }
          onRetry={notFound ? undefined : retry}
        >
          {notFound ? (
            <Link
              href="/patients"
              className={buttonVariants({ variant: "outline" })}
            >
              Back to patients
            </Link>
          ) : null}
        </DataError>
      </div>
    );
  }

  if (!patient) {
    return <PatientDetailSkeleton />;
  }

  const doctor =
    patient.doctor && typeof patient.doctor === "object"
      ? patient.doctor
      : null;

  const address = [
    patient.address?.street,
    patient.address?.city,
    patient.address?.state,
    patient.address?.zip,
  ]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(", ");

  const dateOfBirth = formatDate(patient.dateOfBirth);
  const age = getAge(patient.dateOfBirth);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/patients"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "self-start",
          })}
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Back to patients
        </Link>

        <PageHeader
          title={patient.name}
          description={`${patient.patientCode} · ${patient.condition}`}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => setFormOpen(true)}
          >
            <PencilIcon className="size-4" aria-hidden="true" />
            Edit
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2Icon className="size-4" aria-hidden="true" />
            Delete
          </Button>
        </PageHeader>

        <div className="flex flex-wrap items-center gap-2">
          <EntityStatusBadge status={patient.status} />
          <span className="text-xs text-muted-foreground">
            Added {formatDate(patient.createdAt)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient details</CardTitle>
              <CardDescription>
                Contact information and clinical details from the record.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <InfoItem
                  icon={HashIcon}
                  label="Patient code"
                  value={patient.patientCode}
                />
                <InfoItem
                  icon={ActivityIcon}
                  label="Primary condition"
                  value={patient.condition}
                />
                <InfoItem icon={PhoneIcon} label="Phone" value={patient.phone} />
                <InfoItem icon={MailIcon} label="Email" value={patient.email} />
                <InfoItem
                  icon={UserIcon}
                  label="Gender"
                  value={
                    patient.gender
                      ? patient.gender.charAt(0).toUpperCase() +
                        patient.gender.slice(1)
                      : ""
                  }
                />
                <InfoItem
                  icon={CakeIcon}
                  label="Date of birth"
                  value={age ? `${dateOfBirth} · ${age}` : dateOfBirth}
                />
                <InfoItem
                  icon={DropletIcon}
                  label="Blood group"
                  value={patient.bloodGroup}
                />
                <InfoItem
                  icon={CalendarIcon}
                  label="Admission date"
                  value={formatDate(patient.admissionDate)}
                />
                <InfoItem
                  icon={CalendarIcon}
                  label="Last visit"
                  value={formatDate(patient.lastVisitDate)}
                />
              </dl>
            </CardContent>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPinIcon
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {address || "No address recorded."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileTextIcon
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line text-muted-foreground">
                  {formatText(patient.notes, "No notes recorded.")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Primary doctor</CardTitle>
            <CardDescription>
              Every patient is assigned to one doctor.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {doctor ? (
              <>
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <StethoscopeIcon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/doctors/${doctor._id}`}
                      className="font-medium hover:underline"
                    >
                      {doctor.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {doctor.specialization}
                    </p>
                  </div>
                </div>

                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <BuildingIcon
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{formatText(doctor.hospital)}</span>
                </p>

                <Link
                  href={`/doctors/${doctor._id}`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "self-start",
                  })}
                >
                  View doctor
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No primary doctor is assigned to this patient.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {formOpen ? (
        <PatientFormDialog
          key={patient._id}
          open={formOpen}
          onOpenChange={setFormOpen}
          patientId={patient._id}
          conditions={conditions}
          onSaved={refresh}
        />
      ) : null}

      <DeletePatientDialog
        patient={patient}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push("/patients")}
      />
    </div>
  );
}
