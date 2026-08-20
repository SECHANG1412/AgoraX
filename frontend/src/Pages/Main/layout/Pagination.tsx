import { useMemo } from "react";

type PaginationProps = {
  currentPage: number;
  total: number;
  perPage: number;
  onPageChange: (page: number) => void;
};

const Pagination = ({ currentPage, total, perPage, onPageChange }: PaginationProps) => {
  const totalPages = Math.ceil(total / perPage);
  const delta = 1;

  const pages = useMemo(() => {
    if (totalPages <= 1) return [];

    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);
    const range: Array<number | '...'> = [];

    range.push(1);
    if (left > 2) range.push('...');

    for (let i = left; i <= right; i++) {
      range.push(i);
    }

    if (right < totalPages - 1) range.push('...');
    if (totalPages > 1) range.push(totalPages);

    return range;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
      >
        이전
      </button>
      {pages.map((page, index) =>
        page === '...' ? (
          <span key={index} className="flex min-h-11 min-w-8 items-center justify-center px-1 text-slate-400">
            ...
          </span>
        ) : (
          <button
            key={index}
            type="button"
            onClick={() => onPageChange(page)}
            className={`min-h-11 min-w-11 cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              page === currentPage
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            {page}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
      >
        다음
      </button>
    </div>
  );
};

export default Pagination;
