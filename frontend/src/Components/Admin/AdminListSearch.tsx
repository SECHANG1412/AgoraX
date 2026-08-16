import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

type AdminListSearchProps = {
  value: string;
  onSearch: (value: string) => void;
  placeholder?: string;
};

const AdminListSearch = ({ value, onSearch, placeholder = '검색어 입력' }: AdminListSearchProps) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(draft.trim());
  };

  const handleReset = () => {
    setDraft('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-2 sm:flex-row">
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={100}
        placeholder={placeholder}
        aria-label="관리자 목록 검색"
        className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="min-h-11 flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 sm:flex-none"
        >
          검색
        </button>
        <button
          type="button"
          onClick={handleReset}
          disabled={!draft && !value}
          className="min-h-11 flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 sm:flex-none"
        >
          초기화
        </button>
      </div>
    </form>
  );
};

export default AdminListSearch;
