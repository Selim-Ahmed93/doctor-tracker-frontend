"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BuildingIcon,
  MailIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  StethoscopeIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { DataError, EmptyState } from "@/components/data-states";
import { DataPagination } from "@/components/data-pagination";
import { DeleteDoctorDialog } from "@/components/doctors/delete-doctor-dialog";
import { DoctorFormDialog } from "@/components/doctors/doctor-form-dialog";
import { EntityStatusBadge } from "@/components/doctors/entity-status-badge";
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
import { DOCTOR_STATUS_OPTIONS } from "@/lib/doctor-form";
import { useDebouncedValue } from "@/lib/use-debounced-value";

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "-name", label: "Name (Z–A)" },
  { value: "-experienceYears", label: "Most experience" },
];

const PAGE_SIZE = 10;

const ALL = "all";

function DoctorsListSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="hidden xl:block">
        {[0, 1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
          >
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="ml-auto h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
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
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-7 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DoctorsPage() {
  const [meta, setMeta] = useState({ specializations: [], cities: [] });

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [specialization, setSpecialization] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState("-createdAt");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [result, setResult] = useState({
    queryKey: "",
    status: "loading",
    doctors: [],
    pagination: null,
    error: "",
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const query = buildQuery({
    page,
    limit: PAGE_SIZE,
    search,
    specialization,
    status,
    city,
    sort,
  });

  useEffect(() => {
    let cancelled = false;

    api
      .get("/meta/filters")
      .then((payload) => {
        if (cancelled) return;
        setMeta({
          specializations: payload.data?.specializations ?? [],
          cities: payload.data?.cities ?? [],
        });
      })
      .catch(() => {
        // Filter options are optional; search, sorting and pagination still work.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    api
      .get(`/doctors${query}`, { signal: controller.signal })
      .then((payload) => {
        if (cancelled) return;
        setResult({
          queryKey: query,
          status: "success",
          doctors: payload.data ?? [],
          pagination: payload.pagination ?? null,
          error: "",
        });
      })
      .catch((error) => {
        if (cancelled || error?.name === "AbortError") return;
        setResult({
          queryKey: query,
          status: "error",
          doctors: [],
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
    searchInput ||
      specialization ||
      status ||
      city ||
      sort !== "-createdAt"
  );

  const specializationOptions = [
    { value: ALL, label: "All specializations" },
    ...meta.specializations.map((value) => ({ value, label: value })),
  ];

  const statusOptions = [
    { value: ALL, label: "All statuses" },
    ...DOCTOR_STATUS_OPTIONS,
  ];

  const cityOptions = [
    { value: ALL, label: "All cities" },
    ...meta.cities.map((value) => ({ value, label: value })),
  ];

  const clearFilters = () => {
    setSearchInput("");
    setSpecialization("");
    setStatus("");
    setCity("");
    setSort("-createdAt");
    setPage(1);
  };

  const retry = () => {
    setResult((current) => ({ ...current, status: "loading", error: "" }));
    setReloadKey((current) => current + 1);
  };

  const refresh = () => setReloadKey((current) => current + 1);

  const openCreate = () => {
    setEditingDoctor(null);
    setFormOpen(true);
  };

  const openEdit = (doctor) => {
    setEditingDoctor(doctor);
    setFormOpen(true);
  };

  const handleSaved = (_doctor, mode) => {
    if (mode === "create") {
      setPage(1);
    }
    refresh();
  };

  const handleDeleted = () => {
    const removedLastRow = result.doctors.length === 1 && page > 1;
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
        title="Doctors"
        description="Search the medical team, manage their details, and review assigned patients."
      >
        <Button type="button" onClick={openCreate}>
          <PlusIcon className="size-4" aria-hidden="true" />
          Add doctor
        </Button>
      </PageHeader>

      {isError ? (
        <DataError
          title="Could not load doctors"
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
                  placeholder="Search name, email, phone, hospital…"
                  aria-label="Search doctors"
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
                items={specializationOptions}
                value={specialization || ALL}
                onValueChange={(value) => {
                  setSpecialization(value === ALL ? "" : (value ?? ALL));
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Filter by specialization"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {specializationOptions.map((item) => (
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
                items={cityOptions}
                value={city || ALL}
                onValueChange={(value) => {
                  setCity(value === ALL ? "" : (value ?? ALL));
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full sm:w-36"
                  aria-label="Filter by city"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cityOptions.map((item) => (
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
                  aria-label="Sort doctors"
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
              <span className="sr-only">Loading doctors…</span>
              <DoctorsListSkeleton />
            </div>
          ) : null}

          {!isLoading && result.doctors.length === 0 ? (
            <EmptyState
              icon={StethoscopeIcon}
              title={
                hasActiveFilters
                  ? "No doctors match these filters"
                  : "No doctors yet"
              }
              description={
                hasActiveFilters
                  ? "Try a different search term or clear the filters."
                  : "Add the first doctor to start building the directory."
              }
            >
              {hasActiveFilters ? (
                <Button type="button" variant="outline" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button type="button" onClick={openCreate}>
                  <PlusIcon className="size-4" aria-hidden="true" />
                  Add doctor
                </Button>
              )}
            </EmptyState>
          ) : null}

          {!isLoading && result.doctors.length > 0 ? (
            <>
              <div className="hidden xl:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Patients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.doctors.map((doctor) => (
                      <TableRow key={doctor._id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <Link
                              href={`/doctors/${doctor._id}`}
                              className="font-medium hover:underline"
                            >
                              {doctor.name}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {doctor.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{doctor.specialization}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{doctor.hospital}</span>
                            {doctor.city ? (
                              <span className="text-xs text-muted-foreground">
                                {doctor.city}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {doctor.phone}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <UsersIcon
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            {doctor.patientCount}
                          </span>
                        </TableCell>
                        <TableCell>
                          <EntityStatusBadge status={doctor.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/doctors/${doctor._id}`}
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
                              onClick={() => openEdit(doctor)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(doctor)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="divide-y xl:hidden">
                {result.doctors.map((doctor) => (
                  <li key={doctor._id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/doctors/${doctor._id}`}
                          className="font-medium hover:underline"
                        >
                          {doctor.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {doctor.specialization}
                        </p>
                      </div>
                      <EntityStatusBadge status={doctor.status} />
                    </div>

                    <div className="flex flex-col gap-1.5 text-sm">
                      <p className="flex items-center gap-2">
                        <BuildingIcon
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span>
                          {doctor.hospital}
                          {doctor.city ? `, ${doctor.city}` : ""}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <PhoneIcon
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span>{doctor.phone}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <MailIcon
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <span className="truncate">{doctor.email}</span>
                      </p>
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <UsersIcon
                          className="size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span>
                          {doctor.patientCount}{" "}
                          {doctor.patientCount === 1 ? "patient" : "patients"}
                        </span>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/doctors/${doctor._id}`}
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
                        onClick={() => openEdit(doctor)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(doctor)}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              <DataPagination
                pagination={result.pagination}
                onPageChange={setPage}
                itemLabel="doctors"
              />
            </>
          ) : null}
        </Card>
      )}

      <DoctorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        doctor={editingDoctor}
        specializations={meta.specializations}
        onSaved={handleSaved}
      />

      <DeleteDoctorDialog
        doctor={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
