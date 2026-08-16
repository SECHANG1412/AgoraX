import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import type {
  AdminContentListParams,
  AdminDeleteResponse,
  CommentModerationRequest,
  PaginatedResponse,
  TopicModerationRequest,
} from '../../types';
import { formatKoreanDateTime } from '../../utils/date';
import AdminListPagination from '../../Components/Admin/AdminListPagination';
import AdminListSearch from '../../Components/Admin/AdminListSearch';

const PAGE_SIZE = 20;

const DATE_OPTIONS = [
  { value: 'all', label: '전체 기간' },
  { value: 'today', label: '오늘' },
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
];

const DELETE_REASONS = ['스팸', '욕설/비방', '개인정보', '광고', '기타'];

type DateFilter = 'all' | 'today' | '7d' | '30d';
type Id = number | string;
type Message = { type: 'success' | 'error'; text: string };
type ModerationMeta = { label: string; value: ReactNode };

export type ContentModerationItem = {
  created_at?: string | null;
};

export type ContentModerationPageProps<TItem extends ContentModerationItem> = {
  title: string;
  description: string;
  listEndpoint: string;
  getItemId: (item: TItem) => Id;
  getItemTitle: (item: TItem) => ReactNode;
  getItemDescription: (item: TItem) => ReactNode;
  getItemMeta: (item: TItem) => ModerationMeta[];
  deleteEndpoint: (itemId: Id) => string;
};

const getDateParams = (dateFilter: DateFilter): AdminContentListParams => {
  if (dateFilter === 'all') return {};
  const now = new Date();
  const start = new Date(now);

  if (dateFilter === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (dateFilter === '7d') {
    start.setDate(now.getDate() - 7);
  } else if (dateFilter === '30d') {
    start.setDate(now.getDate() - 30);
  }

  return {
    start_at: start.toISOString(),
    end_at: now.toISOString(),
  };
};

const ContentModerationPage = <TItem extends ContentModerationItem>({
  title,
  description,
  listEndpoint,
  getItemId,
  getItemTitle,
  getItemDescription,
  getItemMeta,
  deleteEndpoint,
}: ContentModerationPageProps<TItem>) => {
  const [items, setItems] = useState<TItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionItemId, setActionItemId] = useState<Id | null>(null);

  const params = useMemo(
    () => ({
      ...getDateParams(dateFilter),
      ...(search && { search }),
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [dateFilter, page, search]
  );

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await api.get<PaginatedResponse<TItem>>(listEndpoint, { params });
      setItems(response.data.items);
      setTotal(response.data.total);
    } catch {
      setMessage({ type: 'error', text: '목록을 불러오지 못했습니다.' });
    } finally {
      setIsLoading(false);
    }
  }, [listEndpoint, params]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const setReason = (itemId: Id, value: string) => {
    setReasonById((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleDelete = async (item: TItem) => {
    const itemId = getItemId(item);
    const reason = (reasonById[String(itemId)] || '').trim();

    if (!reason) {
      setMessage({ type: 'error', text: '삭제 사유를 입력해주세요.' });
      return;
    }
    if (!window.confirm('이 항목을 영구 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) {
      return;
    }

    setActionItemId(itemId);
    setMessage(null);
    try {
      const payload: TopicModerationRequest | CommentModerationRequest = { reason };
      await api.patch<AdminDeleteResponse>(deleteEndpoint(itemId), payload);
      setReason(itemId, '');
      if (items.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadItems();
      }
      setMessage({ type: 'success', text: '영구 삭제되었습니다. 삭제 내역은 감사 로그에 기록됩니다.' });
    } catch {
      setMessage({ type: 'error', text: '영구 삭제하지 못했습니다.' });
    } finally {
      setActionItemId(null);
    }
  };

  const messageColor = message?.type === 'success' ? 'text-emerald-700' : 'text-red-600';

  return (
    <section className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/manage" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
            관리자 홈
          </Link>
          <h1 className="mt-3 break-words text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>

        <label className="text-sm font-semibold text-slate-700">
          기간
          <select
            value={dateFilter}
            onChange={(event) => {
              setDateFilter(event.target.value as DateFilter);
              setPage(1);
            }}
            className="mt-2 block min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {DATE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {message && <p className={`mb-4 text-sm font-semibold ${messageColor}`}>{message.text}</p>}

      <div className="mb-4">
        <AdminListSearch
          value={search}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={`${title} 검색`}
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <p className="px-4 py-8 text-sm text-slate-500">목록을 불러오는 중입니다.</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-500">관리할 항목이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const itemId = getItemId(item);
              const isActionLoading = actionItemId === itemId;
              const reason = reasonById[String(itemId)] || '';
              return (
                <li key={itemId} className="p-3 sm:p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-base font-semibold text-slate-900">
                        {getItemTitle(item)}
                      </h2>
                      <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-slate-600">
                        {getItemDescription(item)}
                      </p>
                      <dl className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                        {getItemMeta(item).map((meta) => (
                          <div key={meta.label}>
                            <dt className="font-semibold text-slate-700">{meta.label}</dt>
                            <dd className="break-words">{meta.value}</dd>
                          </div>
                        ))}
                        <div>
                          <dt className="font-semibold text-slate-700">작성일</dt>
                          <dd>{formatKoreanDateTime(item.created_at)}</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="w-full shrink-0 lg:w-80">
                      <label className="block text-sm font-semibold text-slate-700">
                        삭제 사유
                        <select
                          value={reason}
                          onChange={(event) => setReason(itemId, event.target.value)}
                          className="mt-2 block min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <option value="">사유 선택</option>
                          {DELETE_REASONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                      <textarea
                        value={reason}
                        onChange={(event) => setReason(itemId, event.target.value)}
                        rows={3}
                        placeholder="삭제 사유를 입력하세요."
                        className="mt-2 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm leading-6"
                      />
                      <button
                        type="button"
                        disabled={isActionLoading || !reason.trim()}
                        onClick={() => handleDelete(item)}
                        className="mt-3 min-h-11 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {isActionLoading ? '삭제 중' : '영구 삭제'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!isLoading && (
          <AdminListPagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
          />
        )}
      </section>
    </section>
  );
};

export default ContentModerationPage;
