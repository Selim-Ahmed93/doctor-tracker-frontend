"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  BuildingIcon,
  GraduationCapIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  SearchIcon,
  Trash2Icon,
  UserMinusIcon,
  UserPlusIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";

import { DataError, EmptyState } from "@/components/data-states";
import { DataPagination } from "@/components/data-pagination";
import { AssignPatientDialog } from "@/components/doctors/assign-patient-dialog";
import { DeleteDoctorDialog } from "@/components/doctors/delete-doctor-dialog";
import { DoctorFormDialog } from "@/components/doctors/doctor-form-dialog";
import { EntityStatusBadge } from "@/components/doctors/entity-status-badge";
import { RemovePatientDialog } from "@/components/doctors/remove-patient-dialog";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, buildQuery, getErrorMessage } from "@/lib/api";
import { formatDate, formatNumber, formatText } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const PATIENT_PAGE_SIZE = 10;
const ALL = "all";

const PATIENT_STATUS_OPTIONS = [
  { value: ALL, label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "critical", label: "Critical" },
  { value: "recovered", label: "Recovered" },
  { value: "inactive", label: "Inactive" },
];

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

function DoctorDetailSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading doctor details…</span>
      <Skeleton className="h-7 w-32" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function PatientsSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="hidden xl:block">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
          >
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ml-auto h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
      <div className="divide-y xl:hidden">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DoctorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const [meta, setMeta] = useState({ specializations: [] });

  const [doctorState, setDoctorState] = useState({
    id: "",
    status: "loading",
    doctor: null,
    error: "",
    statusCode: 0,
  });
  const [doctorReloadKey, setDoctorReloadKey] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [patientsReloadKey, setPatientsReloadKey] = useState(0);
  const [patientsState, setPatientsState] = useState({
    id: "",
    queryKey: "",
    status: "loading",
    patients: [],
    pagination: null,
    error: "",
  });

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const patientsQuery = buildQuery({
    page,
    limit: PATIENT_PAGE_SIZE,
    search,
    status: statusFilter,
    sort: "name",
  });

  useEffect(() => {
    let cancelled = false;

    api
      .get("/meta/filters")
      .then((payload) => {
        if (cancelled) return;
        setMeta({ specializations: payload.data?.specializations ?? [] });
      })
      .catch(() => {
        // The edit form still works with the current specialization.
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
      .get(`/doctors/${id}`, { signal: controller.signal })
      .then((payload) => {
        if (cancelled) return;
        setDoctorState({
          id,
          status: "success",
          doctor: payload.data,
          error: "",
          statusCode: 0,
        });
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError") return;
        setDoctorState((current) => {
          if (current.id === id && current.doctor) return current;
          return {
            id,
            status: "error",
            doctor: null,
            error: getErrorMessage(error),
            statusCode: error?.status ?? 0,
          };
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id, doctorReloadKey]);

  useEffect(() => {
    if (!id) return undefined;

    const controller = new AbortController();
    let cancelled = false;

    api
      .get(`/doctors/${id}/patients${patientsQuery}`, {
        signal: controller.signal,
      })
      .then((payload) => {
        if (cancelled) return;
        setPatientsState({
          id,
          queryKey: patientsQuery,
          status: "success",
          patients: payload.data ?? [],
          pagination: payload.pagination ?? null,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError") return;
        setPatientsState({
          id,
          queryKey: patientsQuery,
          status: "error",
          patients: [],
          pagination: null,
          error: getErrorMessage(error),
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id, patientsQuery, patientsReloadKey]);

  const doctor = doctorState.id === id ? doctorState.doctor : null;
  const isDoctorLoading =
    !doctor &&
    (doctorState.id !== id || doctorState.status === "loading");
  const isDoctorError =
    !doctor && doctorState.id === id && doctorState.status === "error";

  const isPatientsLoading =
    patientsState.id !== id ||
    patientsState.queryKey !== patientsQuery ||
    patientsState.status === "loading";
  const isPatientsError = !isPatientsLoading && patientsState.status === "error";

  const hasPatientFilters = Boolean(searchInput || statusFilter);

  const retryDoctor = () => {
    setDoctorState((current) => ({ ...current, status: "loading", error: "" }));
    setDoctorReloadKey((current) => current + 1);
  };

  const retryPatients = () => {
    setPatientsState((current) => ({
      ...current,
      status: "loading",
      error: "",
    }));
    setPatientsReloadKey((current) => current + 1);
  };

  const refreshDoctor = () => setDoctorReloadKey((current) => current + 1);
  const refreshPatients = () =>
    setPatientsReloadKey((current) => current + 1);

  const clearPatientFilters = () => {
    setSearchInput("");
    setStatusFilter("");
    setPage(1);
  };

  const handlePatientChange = () => {
    refreshDoctor();
    refreshPatients();
  };

  const handleMoved = () => {
    if (patientsState.patients.length === 1 && page > 1) {
      setPage(page - 1);
    } else {
      refreshPatients();
    }
    refreshDoctor();
    setRemoveTarget(null);
  };

  if (isDoctorLoading) {
    return <DoctorDetailSkeleton />;
  }

  if (isDoctorError) {
    const notFound = doctorState.statusCode === 404;

    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/doctors"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "self-start",
          })}
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Back to doctors
        </Link>

        <DataError
          title={notFound ? "Doctor not found" : "Could not load this doctor"}
          message={
            notFound
              ? "This doctor may have been removed from the directory."
              : doctorState.error
          }
          onRetry={notFound ? undefined : retryDoctor}
        >
          {notFound ? (
            <Link
              href="/doctors"
              className={buttonVariants({ variant: "outline" })}
            >
              Back to doctors
            </Link>
          ) : null}
        </DataError>
      </div>
    );
  }

  if (!doctor) {
    return <DoctorDetailSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/doctors"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "self-start",
          })}
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Back to doctors
        </Link>

        <PageHeader
          title={doctor.name}
          description={`${doctor.specialization} · ${doctor.hospital}`}
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
          <EntityStatusBadge status={doctor.status} />
          <span className="text-xs text-muted-foreground">
            Added {formatDate(doctor.createdAt)}
          </span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Doctor details</CardTitle>
          <CardDescription>
            Contact information and professional details from the directory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem icon={MailIcon} label="Email" value={doctor.email} />
            <InfoItem icon={PhoneIcon} label="Phone" value={doctor.phone} />
            <InfoItem
              icon={BuildingIcon}
              label="Hospital"
              value={doctor.hospital}
            />
            <InfoItem icon={MapPinIcon} label="City" value={doctor.city} />
            <InfoItem
              icon={GraduationCapIcon}
              label="Qualification"
              value={doctor.qualification}
            />
            <InfoItem
              icon={BriefcaseIcon}
              label="Experience"
              value={
                doctor.experienceYears === undefined ||
                doctor.experienceYears === null
                  ? ""
                  : `${doctor.experienceYears} year(s)`
              }
            />
            <InfoItem
              icon={WalletIcon}
              label="Consultation fee"
              value={
                doctor.consultationFee === undefined ||
                doctor.consultationFee === null
                  ? ""
                  : formatNumber(doctor.consultationFee)
              }
            />
            <InfoItem
              icon={UsersIcon}
              label="Patients"
              value={`${doctor.patientCount} total · ${doctor.activePatientCount} active`}
            />
          </dl>
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-3 border-b p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-base font-medium">
                Assigned patients
              </h2>
              <p className="text-sm text-muted-foreground">
                {doctor.patientCount}{" "}
                {doctor.patientCount === 1 ? "patient" : "patients"} assigned to{" "}
                {doctor.name}.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setAssignOpen(true)}
            >
              <UserPlusIcon className="size-4" aria-hidden="true" />
              Assign patient
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setPage(1);
                }}
                placeholder="Search assigned patients…"
                aria-label="Search assigned patients"
                className="pl-8"
              />
            </div>

            <Select
              items={PATIENT_STATUS_OPTIONS}
              value={statusFilter || ALL}
              onValueChange={(value) => {
                setStatusFilter(value === ALL ? "" : (value ?? ALL));
                setPage(1);
              }}
            >
              <SelectTrigger
                className="w-full sm:w-40"
                aria-label="Filter assigned patients by status"
              >
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

            {hasPatientFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearPatientFilters}
              >
                <XIcon className="size-4" aria-hidden="true" />
                Clear
              </Button>
            ) : null}
          </div>
        </div>

        {isPatientsLoading ? (
          <div role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading assigned patients…</span>
            <PatientsSkeleton />
          </div>
        ) : null}

        {isPatientsError ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <p className="max-w-md text-sm text-destructive">
              {patientsState.error}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={retryPatients}
            >
              Try again
            </Button>
          </div>
        ) : null}

        {!isPatientsLoading &&
        !isPatientsError &&
        patientsState.patients.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={
              hasPatientFilters
                ? "No patients match these filters"
                : "No patients assigned yet"
            }
            description={
              hasPatientFilters
                ? "Try a different search term or clear the filter."
                : "Assign an existing patient to this doctor to see them here."
            }
          >
            {hasPatientFilters ? (
              <Button
                type="button"
                variant="outline"
                onClick={clearPatientFilters}
              >
                Clear filters
              </Button>
            ) : (
              <Button type="button" onClick={() => setAssignOpen(true)}>
                <UserPlusIcon className="size-4" aria-hidden="true" />
                Assign patient
              </Button>
            )}
          </EmptyState>
        ) : null}

        {!isPatientsLoading &&
        !isPatientsError &&
        patientsState.patients.length > 0 ? (
          <>
            <div className="hidden xl:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last visit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patientsState.patients.map((patient) => (
                    <TableRow key={patient._id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <Link
                            href={`/patients/${patient._id}`}
                            className="font-medium hover:underline"
                          >
                            {patient.name}
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {patient.patientCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{patient.condition}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {patient.phone}
                      </TableCell>
                      <TableCell>
                        <EntityStatusBadge status={patient.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(patient.lastVisitDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemoveTarget(patient)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y xl:hidden">
              {patientsState.patients.map((patient) => (
                <li key={patient._id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/patients/${patient._id}`}
                        className="font-medium hover:underline"
                      >
                        {patient.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {patient.patientCode} · {patient.condition}
                      </p>
                    </div>
                    <EntityStatusBadge status={patient.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {patient.phone} · Last visit {formatDate(patient.lastVisitDate)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => setRemoveTarget(patient)}
                  >
                    <UserMinusIcon className="size-4" aria-hidden="true" />
                    Remove
                  </Button>
                </li>
              ))}
            </ul>

            <DataPagination
              pagination={patientsState.pagination}
              onPageChange={setPage}
              itemLabel="patients"
            />
          </>
        ) : null}
      </Card>

      <DoctorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        doctor={doctor}
        specializations={meta.specializations}
        onSaved={refreshDoctor}
      />

      <DeleteDoctorDialog
        doctor={doctor}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push("/doctors")}
      />

      <AssignPatientDialog
        doctor={doctor}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssigned={handlePatientChange}
      />

      <RemovePatientDialog
        patient={removeTarget}
        doctor={doctor}
        open={Boolean(removeTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        onMoved={handleMoved}
      />
    </div>
  );
}
