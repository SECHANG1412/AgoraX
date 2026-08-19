import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../utils/api';
import Admin from './index';

vi.mock('../../utils/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

const inquiryItems = [
  {
    inquiry_id: 1,
    status: 'pending',
    title: '첫 번째 문의',
    name: '사용자',
    created_at: '2026-08-14T09:00:00Z',
  },
  {
    inquiry_id: 2,
    status: 'resolved',
    title: '처리된 문의',
    name: '사용자',
    created_at: '2026-08-13T09:00:00Z',
  },
];

const dashboardItems: Record<string, unknown[]> = {
  '/manage-api/topics': [{ topic_id: 1 }, { topic_id: 2 }],
  '/manage-api/comments': [{ comment_id: 1 }],
  '/manage-api/reports': [{ report_id: 1 }],
  '/manage-api/logs': [
    {
      log_id: 1,
      action: 'DELETE_TOPIC',
      target_type: 'Topic',
      target_id: 1,
      reason: '운영 정책 위반',
      admin_user_id: 1,
      created_at: '2026-08-14T10:00:00Z',
    },
  ],
};

const paginatedResponse = (items: unknown[], total: number) => ({
  items,
  total,
  limit: 20,
  offset: 0,
});

const getDashboardData = (url: string, status?: string) => {
  if (url === '/manage-api/logs') return dashboardItems[url];
  if (url === '/manage-api/inquiries') {
    if (status === 'pending') return paginatedResponse([], 12);
    if (status === 'resolved') return paginatedResponse([], 8);
    return paginatedResponse(inquiryItems, 25);
  }
  if (url === '/manage-api/topics') return paginatedResponse(dashboardItems[url], 30);
  if (url === '/manage-api/comments') return paginatedResponse(dashboardItems[url], 18);
  if (url === '/manage-api/reports') return paginatedResponse(dashboardItems[url], 7);
  return undefined;
};

const mockedGet = vi.mocked(api.get);

const mockDashboardRequests = (failedUrls: string[] = []) => {
  mockedGet.mockImplementation((url, config) => {
    if (failedUrls.includes(url)) {
      return Promise.reject(new Error(`failed: ${url}`));
    }
    return Promise.resolve({
      data: getDashboardData(url, config?.params?.status),
    }) as ReturnType<typeof api.get>;
  });
};

const renderAdmin = () =>
  render(
    <MemoryRouter>
      <Admin />
    </MemoryRouter>
  );

const getStatValue = (label: string) => {
  const card = screen.getByText(label).closest('a');
  expect(card).not.toBeNull();
  return within(card as HTMLAnchorElement).getByText(/^(?:\d+|확인 실패)$/);
};

describe('관리자 대시보드', () => {
  beforeEach(() => {
    mockDashboardRequests();
  });

  it('모든 관리자 정보를 불러와 통계와 최근 데이터를 표시한다', async () => {
    renderAdmin();

    expect(await screen.findByText('첫 번째 문의')).toBeInTheDocument();
    expect(screen.getByText('운영 정책 위반')).toBeInTheDocument();
    expect(getStatValue('미처리 문의')).toHaveTextContent('12');
    expect(getStatValue('완료 문의')).toHaveTextContent('8');
    expect(getStatValue('미처리 신고')).toHaveTextContent('7');
    expect(getStatValue('관리 대상 토픽')).toHaveTextContent('30');
    expect(getStatValue('관리 대상 댓글')).toHaveTextContent('18');
    expect(mockedGet).toHaveBeenCalledWith('/manage-api/reports', {
      params: { status: 'pending', limit: 1 },
    });
  });

  it('일부 요청이 실패하면 실패한 영역만 오류로 표시한다', async () => {
    mockDashboardRequests(['/manage-api/topics', '/manage-api/logs']);

    renderAdmin();

    expect(await screen.findByText('일부 관리자 정보를 불러오지 못했습니다.')).toBeInTheDocument();
    expect(getStatValue('관리 대상 토픽')).toHaveTextContent('확인 실패');
    expect(getStatValue('관리 대상 댓글')).toHaveTextContent('18');
    expect(screen.getByText('최근 관리자 조치를 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.getByText('첫 번째 문의')).toBeInTheDocument();
  });

  it('모든 요청이 실패하면 전체 실패 상태를 표시한다', async () => {
    mockDashboardRequests([
      '/manage-api/inquiries',
      '/manage-api/topics',
      '/manage-api/comments',
      '/manage-api/reports',
      '/manage-api/logs',
    ]);

    renderAdmin();

    expect(await screen.findByText('관리자 대시보드를 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.getAllByText('확인 실패')).toHaveLength(5);
    expect(screen.getByText('최근 문의를 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.getByText('최근 관리자 조치를 불러오지 못했습니다.')).toBeInTheDocument();
  });

  it('새로고침하면 실패한 정보를 다시 불러온다', async () => {
    const attempts = new Map<string, number>();
    mockedGet.mockImplementation((url, config) => {
      const attempt = (attempts.get(url) ?? 0) + 1;
      attempts.set(url, attempt);
      if (url === '/manage-api/topics' && attempt === 1) {
        return Promise.reject(new Error('temporary failure'));
      }
      return Promise.resolve({
        data: getDashboardData(url, config?.params?.status),
      }) as ReturnType<typeof api.get>;
    });
    const user = userEvent.setup();

    renderAdmin();

    expect(await screen.findByText('일부 관리자 정보를 불러오지 못했습니다.')).toBeInTheDocument();
    expect(getStatValue('관리 대상 토픽')).toHaveTextContent('확인 실패');

    await user.click(screen.getByRole('button', { name: '새로고침' }));

    await waitFor(() => {
      expect(getStatValue('관리 대상 토픽')).toHaveTextContent('30');
    });
    expect(screen.queryByText('일부 관리자 정보를 불러오지 못했습니다.')).not.toBeInTheDocument();
    expect(attempts.get('/manage-api/topics')).toBe(2);
  });
});
