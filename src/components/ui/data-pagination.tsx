import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DataPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: string) => void;
  hasNext: boolean;
  hasPrev: boolean;
  total: number;
  perPage: number;
}

export function DataPagination({
  currentPage,
  totalPages,
  onPageChange,
  onPageSizeChange,
  hasNext,
  hasPrev,
  total,
  perPage,
}: DataPaginationProps) {
  const generatePageNumbers = () => {
    const pages = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, current page area, and last page with ellipsis
      if (currentPage <= 4) {
        // Near the beginning
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near the end
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, total);

  return (
    <div className="flex items-center justify-between px-2">
      {/* Left: Display info */}
      <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
        <p>
          Affichage de {startItem} à {endItem} sur {total} résultats
        </p>
      </div>

      {/* Center: Pagination controls */}
      <div className="flex-1 flex justify-center">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => {
                  e.preventDefault();
                  if (hasPrev) onPageChange(currentPage - 1);
                }}
                className={!hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {generatePageNumbers().map((page, index) => (
              <PaginationItem key={index}>
                {page === -1 ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(page);
                    }}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={(e) => {
                  e.preventDefault();
                  if (hasNext) onPageChange(currentPage + 1);
                }}
                className={!hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Right: Page size selector */}
      <div className="flex items-center">
        {onPageSizeChange && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground whitespace-nowrap">
            <p>Afficher</p>
            <Select value={perPage.toString()} onValueChange={onPageSizeChange}>
              <SelectTrigger className="h-8 bg-white w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <p>par page</p>
          </div>
        )}
      </div>
    </div>
  );
}
