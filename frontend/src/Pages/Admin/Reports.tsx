import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatKoreanDateTime } from '../../utils/date';
import type { PaginatedResponse, ReportAdminRead, ReportResolutionRequest, ReportStatus, ReportTargetType } from '../../types';
import AdminListPagination from '../../Components/Admin/AdminListPagination';
import AdminListSearch from '../../Components/Admin/AdminListSearch';

const PAGE_SIZE = 20;

type StatusFilter = ReportStatus | 'all';
type TargetFilter = ReportTargetType | 'all';
type Message = { type: 'success' | 'error'; text: string };

const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: '미처리',
  resolved: '제재 완료',
  dismissed: '기각',
};

const TARGET_LABELS: Record<ReportTargetType, string> = {
  topic: '토픽',
  comment: '댓글',
  reply: '답글',
};

const REASON_LABELS: Record<string, string> = {
  abuse: '욕설·비방',
  hate: '혐오·차별',
  sexual: '음란성 콘텐츠',
  spam: '광고·도배',
  privacy: '개인정보 노출',
  misinformation: '허위·조작 정보',
  other: '기타',
};

const AdminReports = () => {
  const [reports, setReports] = useState<ReportAdminRead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [targetType, setTargetType] = useState<TargetFilter>('all');
  const [resolutionById, setResolutionById] = useState<Record<number, string>>({});
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await api.get<PaginatedResponse<ReportAdminRead>>('/manage-api/reports', {
        params: {
          ...(status !== 'all' && { status }),
          ...(targetType !== 'all' && { target_type: targetType }),
          ...(search && { search }),
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        },
      });
      setReports(response.data.items);
      setTotal(response.data.total);
    } catch {
      setMessage({ type: 'error', text: '신고 목록을 불러오지 못했습니다.' });
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status, targetType]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const groupedReports = useMemo(() => {
    const unique = new Map<string, ReportAdminRead>();
    reports.forEach((report) => {
      const key = `${report.target_type}:${report.target_id}`;
      if (!unique.has(key)) unique.set(key, report);
    });
    return [...unique.values()];
  }, [reports]);

  const processReport = async (report: ReportAdminRead, action: 'resolve' | 'dismiss') => {
    const resolution = (resolutionById[report.report_id] || '').trim();
    if (!resolution) {
      setMessage({ type: 'error', text: '처리 사유를 입력해주세요.' });
      return;
    }
    const prompt = action === 'resolve'
      ? '콘텐츠를 삭제하고 관련 신고를 제재 완료 처리하시겠습니까?'
      : '콘텐츠를 유지하고 관련 신고를 기각하시겠습니까?';
    if (!window.confirm(prompt)) return;

    setProcessingId(report.report_id);
    setMessage(null);
    try {
      const payload: ReportResolutionRequest = { resolution };
      await api.patch(`/manage-api/reports/${report.report_id}/${action}`, payload);
      if (groupedReports.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadReports();
      }
      setMessage({
        type: 'success',
        text: action === 'resolve' ? '콘텐츠를 제재하고 신고를 처리했습니다.' : '신고를 기각했습니다.',
      });
    } catch {
      setMessage({ type: 'error', text: '신고를 처리하지 못했습니다. 상태를 새로고침해주세요.' });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-10">
      <div className="mb-6">
        <Link to="/manage" className="text-sm font-semibold text-blue-600 hover:text-blue-700">관리자 홈</Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">신고 관리</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">접수된 신고와 원문 스냅샷을 검토하고 제재 또는 기각합니다.</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="text-sm font-semibold text-slate-700">
          처리 상태
          <select value={status} onChange={(event) => { setStatus(event.target.value as StatusFilter); setPage(1); }} className="ml-2 min-h-11 rounded-md border border-slate-300 px-3 py-2">
            <option value="pending">미처리</option>
            <option value="resolved">제재 완료</option>
            <option value="dismissed">기각</option>
            <option value="all">전체</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          대상
          <select value={targetType} onChange={(event) => { setTargetType(event.target.value as TargetFilter); setPage(1); }} className="ml-2 min-h-11 rounded-md border border-slate-300 px-3 py-2">
            <option value="all">전체</option>
            <option value="topic">토픽</option>
            <option value="comment">댓글</option>
            <option value="reply">답글</option>
          </select>
        </label>
        <button type="button" onClick={loadReports} disabled={isLoading} className="min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
          새로고침
        </button>
      </div>

      {message && <p className={`mb-4 text-sm font-semibold ${message.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>}

      <div className="mb-4">
        <AdminListSearch
          value={search}
          onSearch={(value) => { setSearch(value); setPage(1); }}
          placeholder="신고 내용 또는 신고자 검색"
        />
      </div>

      {isLoading ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">신고 목록을 불러오는 중입니다.</p>
      ) : groupedReports.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">조건에 맞는 신고가 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {groupedReports.map((report) => {
            const snapshot = report.target_snapshot;
            const isPending = report.status === 'pending';
            const isProcessing = processingId === report.report_id;
            return (
              <li key={`${report.target_type}:${report.target_id}`} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">{TARGET_LABELS[report.target_type]} #{report.target_id}</span>
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">누적 {report.report_count}건</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">{STATUS_LABELS[report.status]}</span>
                </div>
                <h2 className="mt-3 break-words text-base font-semibold text-slate-900">{snapshot.title}</h2>
                <p className="mt-2 whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">{snapshot.content || '내용 없음'}</p>
                <dl className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <div><dt className="font-semibold text-slate-700">작성자</dt><dd>{snapshot.author_name || `회원 #${snapshot.author_id}`}</dd></div>
                  <div><dt className="font-semibold text-slate-700">신고자</dt><dd>{report.reporter_name}</dd></div>
                  <div><dt className="font-semibold text-slate-700">신고 사유</dt><dd>{REASON_LABELS[report.reason] || report.reason}{report.detail ? ` · ${report.detail}` : ''}</dd></div>
                  <div><dt className="font-semibold text-slate-700">접수 시각</dt><dd>{formatKoreanDateTime(report.created_at)}</dd></div>
                </dl>

                {isPending ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <textarea
                      value={resolutionById[report.report_id] || ''}
                      onChange={(event) => setResolutionById((current) => ({ ...current, [report.report_id]: event.target.value }))}
                      rows={3}
                      maxLength={500}
                      placeholder="처리 사유를 입력해주세요."
                      className="w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button type="button" disabled={isProcessing} onClick={() => processReport(report, 'dismiss')} className="min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">신고 기각</button>
                      <button type="button" disabled={isProcessing} onClick={() => processReport(report, 'resolve')} className="min-h-11 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-slate-300">콘텐츠 삭제</button>
                    </div>
                  </div>
                ) : report.resolution ? (
                  <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-600"><span className="font-semibold text-slate-800">처리 사유:</span> {report.resolution}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {!isLoading && (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <AdminListPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      )}
    </section>
  );
};

export default AdminReports;
