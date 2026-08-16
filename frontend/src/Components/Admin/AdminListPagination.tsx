type AdminListPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
};

const AdminListPagination = ({
  page,
  pageSize,
  total,
  onPageChange,
}: AdminListPaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <nav
      aria-label="관리자 목록 페이지 이동"
      className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-slate-500">
        총 {total.toLocaleString()}건 · {page}/{totalPages}페이지
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="min-h-10 rounded-md border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          이전
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="min-h-10 rounded-md border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
        >
          다음
        </button>
      </div>
    </nav>
  );
};

export default AdminListPagination;
