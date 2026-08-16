import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import type {
  AdminDeleteResponse,
  InquiryDeleteRequest,
  AdminInquiryListParams,
  InquiryRead,
  InquiryStatus,
  InquiryStatusUpdateRequest,
  PaginatedResponse,
} from '../../types';
import { formatKoreanDateTime } from '../../utils/date';
import AdminListPagination from '../../Components/Admin/AdminListPagination';
import AdminListSearch from '../../Components/Admin/AdminListSearch';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'pending', label: '미처리' },
  { value: 'in_progress', label: '처리중' },
  { value: 'resolved', label: '완료' },
];

const DATE_OPTIONS = [
  { value: 'all', label: '전체 기간' },
  { value: 'today', label: '오늘' },
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
];

const STATUS_LABELS = {
  pending: '미처리',
  in_progress: '처리중',
  resolved: '완료',
};

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

type DateFilter = 'all' | 'today' | '7d' | '30d';
type StatusFilter = '' | InquiryStatus;
type Message = { type: 'success' | 'error'; text: string };

const getDateParams = (dateFilter: DateFilter): AdminInquiryListParams => {
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

type StatusBadgeProps = {
  status: InquiryStatus;
};

const StatusBadge = ({ status }: StatusBadgeProps) => (
  <span
    className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${
      STATUS_STYLES[status] || 'border-slate-200 bg-slate-50 text-slate-600'
    }`}
  >
    {STATUS_LABELS[status] || status}
  </span>
);

const AdminInquiries = () => {
  const [inquiries, setInquiries] = useState<InquiryRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRead | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [nextStatus, setNextStatus] = useState<InquiryStatus>('resolved');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<Message | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const params = useMemo(() => {
    const nextParams = { ...getDateParams(dateFilter) };
    if (statusFilter) nextParams.status = statusFilter;
    if (search) nextParams.search = search;
    nextParams.limit = PAGE_SIZE;
    nextParams.offset = (page - 1) * PAGE_SIZE;
    return nextParams;
  }, [dateFilter, page, search, statusFilter]);

  const loadInquiries = useCallback(async () => {
    setIsListLoading(true);
    setMessage(null);
    try {
      const response = await api.get<PaginatedResponse<InquiryRead>>('/manage-api/inquiries', { params });
      setInquiries(response.data.items);
      setTotal(response.data.total);
      setSelectedId((current) => {
        if (current && response.data.items.some((inquiry) => inquiry.inquiry_id === current)) {
          return current;
        }
        return response.data.items[0]?.inquiry_id ?? null;
      });
    } catch {
      setMessage({ type: 'error', text: '문의 목록을 불러오지 못했습니다.' });
    } finally {
      setIsListLoading(false);
    }
  }, [params]);

  const loadInquiryDetail = useCallback(async (inquiryId: number | null) => {
    if (!inquiryId) {
      setSelectedInquiry(null);
      return;
    }

    setIsDetailLoading(true);
    setMessage(null);
    try {
      const response = await api.get<InquiryRead>(`/manage-api/inquiries/${inquiryId}`);
      setSelectedInquiry(response.data);
      setNextStatus(response.data.status);
      setReason('');
    } catch {
      setMessage({ type: 'error', text: '문의 상세를 불러오지 못했습니다.' });
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInquiries();
  }, [loadInquiries]);

  useEffect(() => {
    loadInquiryDetail(selectedId);
  }, [loadInquiryDetail, selectedId]);

  const replaceInquiry = (updated: InquiryRead) => {
    setSelectedInquiry(updated);
    setInquiries((prev) =>
      prev.map((inquiry) =>
        inquiry.inquiry_id === updated.inquiry_id ? updated : inquiry
      )
    );
  };

  const handleStatusChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedReason = reason.trim();
    if (!selectedInquiry || !trimmedReason) {
      setMessage({ type: 'error', text: '처리 사유를 입력해주세요.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const payload: InquiryStatusUpdateRequest = {
        status: nextStatus,
        reason: trimmedReason,
      };
      const response = await api.patch<InquiryRead>(
        `/manage-api/inquiries/${selectedInquiry.inquiry_id}/status`,
        payload
      );
      replaceInquiry(response.data);
      setReason('');
      setMessage({ type: 'success', text: '문의 상태를 변경했습니다.' });
    } catch {
      setMessage({ type: 'error', text: '문의 상태를 변경하지 못했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInquiry) return;
    const trimmedReason = reason.trim() || '관리자 문의 삭제';
    if (!window.confirm('이 문의를 영구 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const payload: InquiryDeleteRequest = { reason: trimmedReason };
      await api.patch<AdminDeleteResponse>(
        `/manage-api/inquiries/${selectedInquiry.inquiry_id}/delete`,
        payload
      );
      if (inquiries.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadInquiries();
      }
      setReason('');
      setMessage({ type: 'success', text: '문의를 영구 삭제했습니다. 삭제 내역은 감사 로그에 기록됩니다.' });
    } catch {
      setMessage({ type: 'error', text: '문의를 영구 삭제하지 못했습니다.' });
    } finally {
      setIsSubmitting(false);
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
          <h1 className="mt-3 break-words text-2xl font-bold text-slate-900 sm:text-3xl">문의 관리</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            문의 상태를 처리하고, 더 이상 보관할 필요가 없는 문의를 영구 삭제합니다.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-sm font-semibold text-slate-700">
            상태
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setPage(1);
              }}
              className="mt-2 block min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

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
      </div>

      {message && <p className={`mb-4 text-sm font-semibold ${messageColor}`}>{message.text}</p>}

      <div className="mb-4">
        <AdminListSearch
          value={search}
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="제목, 내용, 작성자 또는 이메일 검색"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">문의 목록</h2>
          </div>

          {isListLoading ? (
            <p className="px-4 py-8 text-sm text-slate-500">문의 목록을 불러오는 중입니다.</p>
          ) : inquiries.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500">조건에 맞는 문의가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {inquiries.map((inquiry) => {
                const selected = inquiry.inquiry_id === selectedId;
                return (
                  <li key={inquiry.inquiry_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(inquiry.inquiry_id)}
                      className={`w-full px-4 py-4 text-left transition ${
                        selected ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-slate-900">{inquiry.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {inquiry.name} · {inquiry.email}
                          </p>
                        </div>
                        <StatusBadge status={inquiry.status} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        작성일 {formatKoreanDateTime(inquiry.created_at)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!isListLoading && (
            <AdminListPagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">문의 상세</h2>
          </div>

          {isDetailLoading ? (
            <p className="px-4 py-8 text-sm text-slate-500">문의 상세를 불러오는 중입니다.</p>
          ) : !selectedInquiry ? (
            <p className="px-4 py-8 text-sm text-slate-500">선택된 문의가 없습니다.</p>
          ) : (
            <div className="space-y-5 p-4">
              <div>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="break-words text-lg font-bold text-slate-900">{selectedInquiry.title}</h3>
                  <StatusBadge status={selectedInquiry.status} />
                </div>
                <dl className="grid gap-2 text-sm text-slate-600">
                  <div>
                    <dt className="font-semibold text-slate-800">작성자</dt>
                    <dd>{selectedInquiry.name}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">이메일</dt>
                    <dd>{selectedInquiry.email}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">작성일</dt>
                    <dd>{formatKoreanDateTime(selectedInquiry.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-800">수정일</dt>
                    <dd>{formatKoreanDateTime(selectedInquiry.updated_at)}</dd>
                  </div>
                </dl>
              </div>

              <div className="break-words rounded-md bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {selectedInquiry.content}
              </div>

              <form onSubmit={handleStatusChange} className="space-y-4 border-t border-slate-200 pt-4">
                <label className="block text-sm font-semibold text-slate-700">
                  처리 상태
                  <select
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value as InquiryStatus)}
                    className="mt-2 block min-h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.filter((option) => option.value).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  처리 사유
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={4}
                    placeholder="상태 변경 또는 삭제 사유를 입력하세요."
                    className="mt-2 w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-sm leading-6"
                  />
                </label>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !reason.trim()}
                    className="min-h-11 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSubmitting ? '처리 중' : '상태 변경'}
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleDelete}
                    className="min-h-11 rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  >
                    영구 삭제
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default AdminInquiries;
