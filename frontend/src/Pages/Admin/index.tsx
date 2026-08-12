import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import type { AdminActionLogRead, CommentAdminRead, InquiryRead, InquiryStatus, ReportAdminRead, TopicAdminRead } from '../../types';
import { formatKoreanDateTime, parseApiDate } from '../../utils/date';

type KnownAdminAction = 'UPDATE_INQUIRY_STATUS' | 'DELETE_INQUIRY' | 'DELETE_TOPIC' | 'DELETE_COMMENT';

const ACTION_LABELS: Record<KnownAdminAction, string> = {
  UPDATE_INQUIRY_STATUS: '문의 상태 변경',
  DELETE_INQUIRY: '문의 삭제',
  DELETE_TOPIC: '토픽 삭제',
  DELETE_COMMENT: '댓글 삭제',
};

const getActionLabel = (action: string) =>
  action in ACTION_LABELS ? ACTION_LABELS[action as KnownAdminAction] : action;

const STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: '미처리',
  in_progress: '처리중',
  resolved: '완료',
};

type Message = { type: 'success' | 'error'; text: string };
type DashboardResource = 'inquiries' | 'topics' | 'comments' | 'reports' | 'logs';

type StatCardProps = {
  label: string;
  value: number | null;
  to: string;
};

const StatCard = ({ label, value, to }: StatCardProps) => (
  <Link
    to={to}
    className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50 sm:p-5"
  >
    <p className="break-words text-sm font-semibold text-slate-600">{label}</p>
    <p className="mt-2 text-2xl font-bold text-slate-900 sm:mt-3 sm:text-3xl">
      {value === null ? '확인 실패' : value}
    </p>
  </Link>
);

type QuickLinkProps = {
  to: string;
  children: ReactNode;
};

const QuickLink = ({ to, children }: QuickLinkProps) => (
  <Link
    to={to}
    className="min-h-11 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
  >
    {children}
  </Link>
);

const Admin = () => {
  const [inquiries, setInquiries] = useState<InquiryRead[]>([]);
  const [topics, setTopics] = useState<TopicAdminRead[]>([]);
  const [comments, setComments] = useState<CommentAdminRead[]>([]);
  const [reports, setReports] = useState<ReportAdminRead[]>([]);
  const [logs, setLogs] = useState<AdminActionLogRead[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [failedResources, setFailedResources] = useState<Set<DashboardResource>>(new Set());

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    const [inquiriesResult, topicsResult, commentsResult, reportsResult, logsResult] =
      await Promise.allSettled([
        api.get<InquiryRead[]>('/manage-api/inquiries'),
        api.get<TopicAdminRead[]>('/manage-api/topics'),
        api.get<CommentAdminRead[]>('/manage-api/comments'),
        api.get<ReportAdminRead[]>('/manage-api/reports', { params: { status: 'pending' } }),
        api.get<AdminActionLogRead[]>('/manage-api/logs', { params: { limit: 5 } }),
      ]);

    const nextFailedResources = new Set<DashboardResource>();

    if (inquiriesResult.status === 'fulfilled') {
      setInquiries(inquiriesResult.value.data);
    } else {
      nextFailedResources.add('inquiries');
    }
    if (topicsResult.status === 'fulfilled') {
      setTopics(topicsResult.value.data);
    } else {
      nextFailedResources.add('topics');
    }
    if (commentsResult.status === 'fulfilled') {
      setComments(commentsResult.value.data);
    } else {
      nextFailedResources.add('comments');
    }
    if (reportsResult.status === 'fulfilled') {
      setReports(reportsResult.value.data);
    } else {
      nextFailedResources.add('reports');
    }
    if (logsResult.status === 'fulfilled') {
      setLogs(logsResult.value.data);
    } else {
      nextFailedResources.add('logs');
    }

    setFailedResources(nextFailedResources);
    if (nextFailedResources.size === 5) {
      setMessage({ type: 'error', text: '관리자 대시보드를 불러오지 못했습니다.' });
    } else if (nextFailedResources.size > 0) {
      setMessage({ type: 'error', text: '일부 관리자 정보를 불러오지 못했습니다.' });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const stats = useMemo(() => {
    return {
      pendingInquiries: inquiries.filter((inquiry) => inquiry.status === 'pending').length,
      resolvedInquiries: inquiries.filter((inquiry) => inquiry.status === 'resolved').length,
      topics: topics.length,
      comments: comments.length,
      pendingReports: reports.length,
    };
  }, [comments, inquiries, reports, topics]);

  const recentInquiries = useMemo(() => {
    return [...inquiries]
      .sort(
        (a, b) =>
          (parseApiDate(b.created_at)?.getTime() ?? 0) -
          (parseApiDate(a.created_at)?.getTime() ?? 0)
      )
      .slice(0, 5);
  }, [inquiries]);

  return (
    <section className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">관리자</p>
          <h1 className="mt-3 break-words text-2xl font-bold text-slate-900 sm:text-3xl">운영 대시보드</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            문의, 토픽, 댓글과 최근 관리자 조치를 한 화면에서 확인합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={loadDashboard}
          disabled={isLoading}
          className="min-h-11 rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {isLoading ? '불러오는 중' : '새로고침'}
        </button>
      </div>

      {message && <p className="mb-4 text-sm font-semibold text-red-600">{message.text}</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="미처리 문의"
          value={failedResources.has('inquiries') ? null : stats.pendingInquiries}
          to="/manage/inquiries"
        />
        <StatCard
          label="완료 문의"
          value={failedResources.has('inquiries') ? null : stats.resolvedInquiries}
          to="/manage/inquiries"
        />
        <StatCard
          label="미처리 신고"
          value={failedResources.has('reports') ? null : stats.pendingReports}
          to="/manage/reports"
        />
        <StatCard
          label="관리 대상 토픽"
          value={failedResources.has('topics') ? null : stats.topics}
          to="/manage/topics"
        />
        <StatCard
          label="관리 대상 댓글"
          value={failedResources.has('comments') ? null : stats.comments}
          to="/manage/comments"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-slate-900">최근 문의</h2>
            <Link to="/manage/inquiries" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              전체 보기
            </Link>
          </div>

          {isLoading ? (
            <p className="px-4 py-8 text-sm text-slate-500">최근 문의를 불러오는 중입니다.</p>
          ) : failedResources.has('inquiries') ? (
            <p className="px-4 py-8 text-sm font-semibold text-red-600">최근 문의를 불러오지 못했습니다.</p>
          ) : recentInquiries.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500">등록된 문의가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentInquiries.map((inquiry) => (
                <li key={inquiry.inquiry_id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-900">{inquiry.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {inquiry.name} · {formatKoreanDateTime(inquiry.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {STATUS_LABELS[inquiry.status] || inquiry.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-slate-900">최근 관리자 조치</h2>
            <Link to="/manage/logs" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              전체 보기
            </Link>
          </div>

          {isLoading ? (
            <p className="px-4 py-8 text-sm text-slate-500">최근 조치를 불러오는 중입니다.</p>
          ) : failedResources.has('logs') ? (
            <p className="px-4 py-8 text-sm font-semibold text-red-600">최근 관리자 조치를 불러오지 못했습니다.</p>
          ) : logs.length === 0 ? (
            <p className="px-4 py-8 text-sm text-slate-500">기록된 관리자 조치가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {logs.map((log) => (
                <li key={log.log_id} className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                      {getActionLabel(log.action)}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {log.target_type} #{log.target_id}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-sm leading-6 text-slate-700">{log.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    관리자 번호 {log.admin_user_id} · {formatKoreanDateTime(log.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">빠른 이동</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <QuickLink to="/manage/users">회원 관리</QuickLink>
          <QuickLink to="/manage/inquiries">문의 관리</QuickLink>
          <QuickLink to="/manage/topics">토픽 관리</QuickLink>
          <QuickLink to="/manage/reports">신고 관리</QuickLink>
          <QuickLink to="/manage/comments">댓글 관리</QuickLink>
          <QuickLink to="/manage/logs">감사 로그</QuickLink>
        </div>
      </section>
    </section>
  );
};

export default Admin;
