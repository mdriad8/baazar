'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}

export default function ProductPagination({ currentPage, totalPages, searchParams }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const goToPage = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    startTransition(() => {
      router.replace(`/products?${params.toString()}`, { scroll: false });
    });
  };

  // Build page number list with ellipsis
  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('ellipsis');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8 pb-4">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === 1 || isPending}
        onClick={() => goToPage(currentPage - 1)}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e-${i}`} className="h-8 w-8 flex items-center justify-center text-sm text-muted-foreground">
            &hellip;
          </span>
        ) : (
          <Button
            key={p}
            variant={p === currentPage ? 'default' : 'outline'}
            size="sm"
            disabled={isPending}
            onClick={() => goToPage(p)}
            className={`h-8 w-8 p-0 text-sm ${p === currentPage ? 'pointer-events-none' : ''}`}
          >
            {p}
          </Button>
        )
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === totalPages || isPending}
        onClick={() => goToPage(currentPage + 1)}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
