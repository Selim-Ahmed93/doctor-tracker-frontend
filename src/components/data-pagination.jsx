import { Button } from "@/components/ui/button";

/**
 * Pagination footer for server-paginated lists. It renders the API's
 * `pagination` object verbatim - no client-side recounting.
 */
export function DataPagination({ pagination, onPageChange, itemLabel = "items" }) {
  if (!pagination || pagination.total === 0) return null;

  const start = (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing {start}–{end} of {pagination.total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={!pagination.hasPrev}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={!pagination.hasNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default DataPagination;
