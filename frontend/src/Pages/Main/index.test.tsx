import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../../hooks/auth-context';
import { useConfirm } from '../../hooks/confirm-context';
import { useTopic } from '../../hooks/useTopic';
import { useVote } from '../../hooks/useVote';
import Main from './index';
import Pagination from './layout/Pagination';

vi.mock('../../hooks/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../hooks/confirm-context', () => ({ useConfirm: vi.fn() }));
vi.mock('../../hooks/useTopic', () => ({ useTopic: vi.fn() }));
vi.mock('../../hooks/useVote', () => ({ useVote: vi.fn() }));
vi.mock('./layout/Grid', () => ({ default: () => <div>토픽 목록</div> }));
vi.mock('./layout/TopicListControls', () => ({ default: () => <div>목록 조건</div> }));

const fetchTopics = vi.fn();
const countAllTopics = vi.fn();

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseConfirm = vi.mocked(useConfirm);
const mockedUseTopic = vi.mocked(useTopic);
const mockedUseVote = vi.mocked(useVote);

const LocationProbe = () => {
  const location = useLocation();
  return (
    <output aria-label="현재 주소">
      {decodeURIComponent(`${location.pathname}${location.search}`)}
    </output>
  );
};

const renderMain = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Main />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  fetchTopics.mockResolvedValue([]);
  countAllTopics.mockResolvedValue(32);

  mockedUseAuth.mockReturnValue({
    error: '',
    isAuthenticated: false,
    isAuthLoading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    user: null,
  });
  mockedUseConfirm.mockReturnValue({ confirm: vi.fn() });
  mockedUseTopic.mockReturnValue({
    loading: false,
    fetchTopics,
    countAllTopics,
    addTopic: vi.fn(),
    getTopicById: vi.fn(),
    deleteTopic: vi.fn(),
    pinTopic: vi.fn(),
    unpinTopic: vi.fn(),
  });
  mockedUseVote.mockReturnValue({ submitVote: vi.fn(), getTopicVotes: vi.fn() });
});

describe('메인 토픽 목록 페이지 경계', () => {
  it('정상적인 2페이지는 해당 offset으로 조회한다', async () => {
    renderMain('/?page=2');

    await waitFor(() =>
      expect(fetchTopics).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 16, offset: 16 })
      )
    );
    expect(screen.getByLabelText('현재 주소')).toHaveTextContent('/?page=2');
  });

  it.each(['0', '-1', 'abc', '1.5', '1abc', '9007199254740992'])(
    '잘못된 page=%s 값을 1페이지로 교정하고 목록 조건을 유지한다',
    async (page) => {
      renderMain(`/?page=${page}&category=일상&search=점심&sort=likes&status=closed`);

      await waitFor(() =>
        expect(screen.getByLabelText('현재 주소')).toHaveTextContent(
          '/?page=1&category=일상&search=점심&sort=likes&status=closed'
        )
      );
      await waitFor(() =>
        expect(fetchTopics).toHaveBeenCalledWith({
          offset: 0,
          limit: 16,
          sort: 'like_count',
          status: 'closed',
          category: '일상',
          search: '점심',
        })
      );
    }
  );

  it('마지막 페이지를 초과하면 마지막 유효 페이지로 교정한다', async () => {
    countAllTopics.mockResolvedValue(20);

    renderMain('/?page=99&category=일상');

    await waitFor(() =>
      expect(screen.getByLabelText('현재 주소')).toHaveTextContent('/?page=2&category=일상')
    );
    await waitFor(() =>
      expect(fetchTopics).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 16, offset: 16, category: '일상' })
      )
    );
  });

  it('토픽이 없으면 초과 페이지를 1페이지로 교정한다', async () => {
    countAllTopics.mockResolvedValue(0);

    renderMain('/?page=3');

    await waitFor(() =>
      expect(screen.getByLabelText('현재 주소')).toHaveTextContent('/?page=1')
    );
    await waitFor(() =>
      expect(fetchTopics).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 16, offset: 0 })
      )
    );
  });
});

describe('페이지네이션 버튼 경계', () => {
  it('1페이지 이하에서는 이전 버튼을 비활성화한다', () => {
    render(<Pagination currentPage={0} total={32} perPage={16} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled();
  });

  it('마지막 페이지 이상에서는 다음 버튼을 비활성화한다', () => {
    render(<Pagination currentPage={3} total={32} perPage={16} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
  });
});
