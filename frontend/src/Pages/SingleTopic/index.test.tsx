import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TopicRead } from '../../types';
import { useAuth } from '../../hooks/auth-context';
import { useConfirm } from '../../hooks/confirm-context';
import { useLike } from '../../hooks/useLike';
import { useTopic } from '../../hooks/useTopic';
import { useVote } from '../../hooks/useVote';
import SingleTopic from './index';

vi.mock('../../hooks/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('../../hooks/confirm-context', () => ({ useConfirm: vi.fn() }));
vi.mock('../../hooks/useLike', () => ({ useLike: vi.fn() }));
vi.mock('../../hooks/useTopic', () => ({ useTopic: vi.fn() }));
vi.mock('../../hooks/useVote', () => ({ useVote: vi.fn() }));
vi.mock('./Chart', () => ({ default: () => <div>투표 차트</div> }));
vi.mock('./Comments', () => ({ default: () => <div>댓글 영역</div> }));
vi.mock('../../Components/Common/ReportButton', () => ({
  default: () => <button>신고</button>,
}));

const getTopicById = vi.fn();
const deleteTopic = vi.fn();
const submitVote = vi.fn();
const toggleTopicLike = vi.fn();
const confirm = vi.fn();

const topic: TopicRead = {
  topic_id: 7,
  title: '점심 메뉴 투표',
  description: '오늘 점심 메뉴를 골라주세요.',
  category: '일상',
  vote_options: ['한식', '중식'],
  created_at: '2026-08-15T01:00:00Z',
  expires_at: '2099-08-15T01:00:00Z',
  user_id: 2,
  author_name: '작성자',
  has_voted: false,
  user_vote_index: null,
  vote_results: [3, 2],
  total_vote: 5,
  like_count: 1,
  has_liked: false,
  is_pinned: false,
  comment_count: 0,
  is_closed: false,
};

const mockedUseAuth = vi.mocked(useAuth);
const mockedUseConfirm = vi.mocked(useConfirm);
const mockedUseLike = vi.mocked(useLike);
const mockedUseTopic = vi.mocked(useTopic);
const mockedUseVote = vi.mocked(useVote);

const renderSingleTopic = () =>
  render(
    <MemoryRouter initialEntries={['/topic/7']}>
      <Routes>
        <Route path="/topic/:id" element={<SingleTopic />} />
      </Routes>
    </MemoryRouter>
  );

describe('토픽 상세 조회', () => {
  beforeEach(() => {
    getTopicById.mockResolvedValue(topic);
    deleteTopic.mockResolvedValue(true);
    submitVote.mockResolvedValue(true);
    toggleTopicLike.mockResolvedValue(true);
    confirm.mockResolvedValue(true);

    mockedUseAuth.mockReturnValue({
      error: '',
      isAuthenticated: true,
      isAuthLoading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      user: null,
    });
    mockedUseConfirm.mockReturnValue({ confirm });
    mockedUseLike.mockReturnValue({
      toggleTopicLike,
      toggleCommentLike: vi.fn(),
      toggleReplyLike: vi.fn(),
    });
    mockedUseTopic.mockReturnValue({
      loading: false,
      fetchTopics: vi.fn(),
      countAllTopics: vi.fn(),
      addTopic: vi.fn(),
      getTopicById,
      deleteTopic,
      pinTopic: vi.fn(),
      unpinTopic: vi.fn(),
    });
    mockedUseVote.mockReturnValue({ submitVote, getTopicVotes: vi.fn() });
  });

  it('조회 중에는 로딩 상태를 표시한다', () => {
    getTopicById.mockReturnValue(new Promise(() => undefined));

    renderSingleTopic();

    expect(screen.getByText('토픽을 불러오는 중입니다.')).toBeInTheDocument();
  });

  it('조회한 토픽 내용과 투표 선택지를 표시한다', async () => {
    renderSingleTopic();

    expect(await screen.findByText('점심 메뉴 투표')).toBeInTheDocument();
    expect(screen.getByText('오늘 점심 메뉴를 골라주세요.')).toBeInTheDocument();
    expect(screen.getAllByText('한식')).toHaveLength(2);
    expect(screen.getAllByText('중식')).toHaveLength(2);
    expect(getTopicById).toHaveBeenCalledWith('7');
  });

  it('토픽이 없으면 존재하지 않음 상태를 표시한다', async () => {
    getTopicById.mockResolvedValue(null);

    renderSingleTopic();

    expect(await screen.findByText('존재하지 않는 토픽입니다.')).toBeInTheDocument();
  });

  it('조회에 실패하면 오류 상태를 표시한다', async () => {
    getTopicById.mockResolvedValue(undefined);

    renderSingleTopic();

    expect(
      await screen.findByText('토픽을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
    ).toBeInTheDocument();
  });
});
