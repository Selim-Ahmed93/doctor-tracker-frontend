"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarIcon,
  PlusIcon,
  SearchIcon,
  StethoscopeIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { DataError, EmptyState } from "@/components/data-states";
import { DataPagination } from "@/components/data-pagination";
import { EntityStatusBadge } from "@/components/doctors/entity-status-badge";
import { DeletePatientDialog } from "@/components/patients/delete-patient-dialog";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { formatDate } from "@/lib/format";
import {
  GENDER_OPTIONS,
  PATIENT_STATUS_OPTIONS,
} from "@/lib/patient-form";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "-name", label: "Name (Z–A)" },
  { value: "condition", label: "Condition (A–Z)" },
  { value: "-lastVisitDate", label: "Recent visit" },
  { value: "-admissionDate", label: "Recent admission" },
];

const PAGE_SIZE = 10;
const ALL = "all";

function PatientsListSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="hidden xl:block">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
          >
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      <div className="divide-y xl:hidden">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-56 max-w-full" />
            <Skeleton className="h-4 w-44 max-w-full" />
            <Skeleton className="h-4 w-32 max-w-full" />
            <Skeleton className="h-7 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

function patientDoctor(patient) {
  return patient?.doctor && typeof patient.doctor === "object"
    ? patient.doctor
    : null;
}

export default function PatientsPage() {
  const [meta, setMeta] = useState({ conditions: [] });
  const [doctors, setDoctors] = useState([]);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [condition, setCondition] = useState("");
  const [status, setStatus] = useState("");
  const [doctor, setDoctor] = useState("");
  const [gender, setGender] = useState("");
  const [sort, setSort] = useState("-createdAt");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [result, setResult] = useState({
    queryKey: "",
    status: "loading",
    patients: [],
    pagination: null,
    error: "",
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const query = buildQuery({
    page,
    limit: PAGE_SIZE,
    search,
    condition,
    status,
    doctor,
    gender,
    sort,
  });

  useEffect(() => {
    let cancelled = false;

    api
      .get("/meta/filters")
      .then((payload) => {
        if (cancelled) return;
        setMeta({ conditions: payload.data?.conditions ?? [] });
      })
      .catch(() => {
        // Conditions are optional suggestions; free-text search still works.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/doctors${buildQuery({ limit: 100, sort: "name" })}`)
      .then((payload) => {
        if (cancelled) return;
        setDoctors(payload.data ?? []);
      })
      .catch(() => {
        // The doctor filter is optional; the patient list still loads.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    api
      .get(`/patients${query}`, { signal: controller.signal })
      .then((payload) => {
        if (cancelled) return;
        setResult({
          queryKey: query,
          status: "success",
          patients: payload.data ?? [],
          pagination: payload.pagination ?? null,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError") return;
        setResult({
          queryKey: query,
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
  }, [query, reloadKey]);

  const isLoading = result.queryKey !== query || result.status === "loading";
  const isError = !isLoading && result.status === "error";

  const hasActiveFilters = Boolean(
    searchInput || condition || status || doctor || gender || sort !== "-createdAt"
  );

  const conditionOptions = [
    { value: ALL, label: "All conditions" },
    ...meta.conditions.map((value) => ({ value, label: value })),
  ];

  const statusOptions = [
    { value: ALL, label: "All statuses" },
    ...PATIENT_STATUS_OPTIONS,
  ];

  const genderOptions = [
    { value: ALL, label: "All genders" },
    ...GENDER_OPTIONS,
  ];

  const doctorOptions = [
    { value: ALL, label: "All doctors" },
    ...doctors.map((entry) => ({
      value: entry._id,
      label: `${entry.name} · ${entry.specialization}`,
    })),
  ];

  const clearFilters = () => {
    setSearchInput("");
    setCondition("");
    setStatus("");
    setDoctor("");
    setGender("");
    setSort("-createdAt");
    setPage(1);
  };

  const retry = () => {
    setResult((current) => ({ ...current, status: "loading", error: "" }));
    setReloadKey((current) => current + 1);
  };

  const refresh = () => setReloadKey((current) => current + 1);

  const openCreate = () => {
    setEditingPatientId(null);
    setFormOpen(true);
  };

  const openEdit = (patient) => {
    setEditingPatientId(patient._id);
    setFormOpen(true);
  };

  const handleSaved = (_patient, mode) => {
    if (mode === "create") {
      setPage(1);
    }
    refresh();
  };

  const handleDeleted = () => {
    const removedLastRow = result.patients.length === 1 && page > 1;
    if (removedLastRow) {
      setPage(page - 1);
    } else {
      refresh();
    }
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Patients"
        description="Search patient records, manage their details, and review the doctor responsible for each patient."
      >
        <Button type="button" onClick={openCreate}>
          <PlusIcon className="size-4" aria-hidden="true" />
          Add patient
        </Button>
      </PageHeader>

      {isError ? (
        <DataError
          title="Could not load patients"
          message={result.error}
          onRetry={retry}
        >
          {hasActiveFilters ? (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </DataError>
      ) : (
        <Card className="gap-0 py-0">
          <div className="flex flex-col gap-3 border-b p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-sm">
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
                  placeholder="Search name, code, phone, email, condition…"
                  aria-label="Search patients"
                  className="pl-8"
                />
              </div>

              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                >
                  <XIcon className="size-4" aria-hidden="true" />
                  Clear filters
                </Button>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Select
                items={conditionOptions}
                value={condition || ALL}
                onValueChange={(value) => {
                  setCondition(value === ALL ? "" : (value ?? ALL));
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Filter by condition"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditionOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                items={statusOptions}
                value={status || ALL}
                onValueChange={(value) => {
                  setStatus(value === ALL ? "" : (value ?? ALL));
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-36"
                  aria-label="Filter by status"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                items={doctorOptions}
                value={doctor || ALL}
                onValueChange={(value) => {
                  setDoctor(value === ALL ? "" : (value ?? ALL));
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-52"
                  aria-label="Filter by primary doctor"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {doctorOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                items={genderOptions}
                value={gender || ALL}
                onValueChange={(value) => {
                  setGender(value === ALL ? "" : (value ?? ALL));
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-36"
                  aria-label="Filter by gender"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                items={SORT_OPTIONS}
                value={sort}
                onValueChange={(value) => {
                  setSort(value ?? "-createdAt");
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Sort patients"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div role="status" aria-live="polite" aria-busy="true">
              <span className="sr-only">Loading patients…</span>
              <PatientsListSkeleton />
            </div>
          ) : null}

          {!isLoading && result.patients.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title={
                hasActiveFilters
                  ? "No patients match these filters"
                  : "No patients yet"
              }
              description={
                hasActiveFilters
                  ? "Try a different search term or clear the filters."
                  : "Add the first patient to start building the directory."
              }
            >
              {hasActiveFilters ? (
                <Button type="button" variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button type="button" onClick={openCreate}>
                  <PlusIcon className="size-4" aria-hidden="true" />
                  Add patient
                </Button>
              )}
            </EmptyState>
          ) : null}

          {!isLoading && result.patients.length > 0 ? (
            <>
              <div className="hidden xl:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Primary doctor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.patients.map((patient) => {
                      const assignedDoctor = patientDoctor(patient);

                      return (
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
                          <TableCell>
                            {assignedDoctor ? (
                              <div className="flex flex-col">
                                <Link
                                  href={`/doctors/${assignedDoctor._id}`}
                                  className="hover:underline"
                                >
                                  {assignedDoctor.name}
                                </Link>
                                <span className="text-xs text-muted-foreground">
                                  {assignedDoctor.specialization}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <EntityStatusBadge status={patient.status} />
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(patient.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={`/patients/${patient._id}`}
                                className={buttonVariants({
                                  variant: "ghost",
                                  size: "sm",
                                })}
                              >
                                View
                              </Link>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => openEdit(patient)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(patient)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <ul className="divide-y xl:hidden">
                {result.patients.map((patient) => {
                  const assignedDoctor = patientDoctor(patient);

                  return (
                    <li key={patient._id} className="flex flex-col gap-3 p-4">
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

                      <div className="flex flex-col gap-1.5 text-sm">
                        <p className="flex items-center gap-2">
                          <StethoscopeIcon
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {assignedDoctor
                              ? `${assignedDoctor.name} · ${assignedDoctor.specialization}`
                              : "No primary doctor"}
                          </span>
                        </p>
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <CalendarIcon
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                          <span>Created {formatDate(patient.createdAt)}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/patients/${patient._id}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          View
                        </Link>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(patient)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeleteTarget(patient)}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <DataPagination
                pagination={result.pagination}
                onPageChange={setPage}
                itemLabel="patients"
              />
            </>
          ) : null}
        </Card>
      )}

      {formOpen ? (
        <PatientFormDialog
          key={editingPatientId ?? "new"}
          open={formOpen}
          onOpenChange={setFormOpen}
          patientId={editingPatientId}
          conditions={meta.conditions}
          onSaved={handleSaved}
        />
      ) : null}

      <DeletePatientDialog
        patient={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
