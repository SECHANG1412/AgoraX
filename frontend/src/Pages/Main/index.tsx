import { useEffect, useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTopic } from '../../hooks/useTopic';
import Pagination from './layout/Pagination';
import Grid from './layout/Grid';
import TopicListControls from './layout/TopicListControls';
import { useVote } from "../../hooks/useVote";
import { useAuth } from "../../hooks/auth-context";
import { useConfirm } from '../../hooks/confirm-context';
import { showLoginRequiredAlert } from '../../utils/alertUtils';
import type { TopicRead } from '../../types';

const SORT_MAP = {
  recent: 'created_at',
  likes: 'like_count',
} as const;

const STATUS_MAP = {
  all: 'all',
  active: 'active',
  voted: 'voted',
  closed: 'closed',
} as const;

type SortParam = keyof typeof SORT_MAP;
type StatusParam = keyof typeof STATUS_MAP;
export type MainTopic = TopicRead & { originalIndex?: number };
export type MainVoteHandler = (topicId: number, voteIndex: number) => Promise<void>;
export type MainPinToggleHandler = (topicId: number, isPinned: boolean) => Promise<void>;

const parsePageParam = (value: string | null) => {
  if (!value || !/^[1-9]\d*$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const Main = () => {
  const { loading, fetchTopics, countAllTopics, pinTopic, unpinTopic } = useTopic();
  const { submitVote } = useVote();
  const { isAuthenticated, isAuthLoading } = useAuth();
  const { confirm } = useConfirm();
  const [topics, setTopics] = useState<MainTopic[]>([]);
  const [totalTopics, setTotalTopics] = useState(0);
  const latestRequestIdRef = useRef(0);

  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') || '';
  const rawSort = searchParams.get('sort');
  const sortParam =
    rawSort === 'created_at'
      ? 'recent'
      : rawSort === 'like_count'
        ? 'likes'
        : rawSort || 'recent';
  const sort: SortParam = sortParam in SORT_MAP ? (sortParam as SortParam) : 'recent';
  const rawStatus = searchParams.get('status') || 'all';
  const status: StatusParam = rawStatus in STATUS_MAP ? (rawStatus as StatusParam) : 'all';
  const search = searchParams.get('search') || '';
  const rawPage = searchParams.get('page');
  const parsedPage = parsePageParam(rawPage);
  const page = parsedPage ?? 1;
  const topicsPerPage = 16;

  const apiSort = SORT_MAP[sort];
  const apiStatus = STATUS_MAP[status];

  const loadTopics = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current;

    if (rawPage !== null && parsedPage === null) {
      const updated = new URLSearchParams(searchParams);
      updated.set('page', '1');
      setSearchParams(updated, { replace: true });
      return;
    }

    const [count, data] = await Promise.all([
      countAllTopics(category, search, apiStatus),
      fetchTopics({
        offset: (page - 1) * topicsPerPage,
        limit: topicsPerPage,
        sort: apiSort,
        status: apiStatus,
        category,
        search,
      }),
    ]);

    if (requestId !== latestRequestIdRef.current) return;

    if (count !== null) {
      const totalPages = Math.max(1, Math.ceil(count / topicsPerPage));
      setTotalTopics(count);

      if (page > totalPages) {
        const updated = new URLSearchParams(searchParams);
        updated.set('page', String(totalPages));
        setSearchParams(updated, { replace: true });
        return;
      }
    }

    if (data) {
      const withIndex = data.map((t, idx) => ({
        ...t,
        originalIndex: idx,
      }));
      setTopics(withIndex);
    }
  }, [
    apiSort,
    apiStatus,
    category,
    countAllTopics,
    fetchTopics,
    page,
    parsedPage,
    rawPage,
    search,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    loadTopics();
  }, [loadTopics]);

  const onPageChange = (p: number) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('page', String(p));
    setSearchParams(updated);
  };

  const updateListParam = (key: 'sort' | 'status', value: SortParam | StatusParam, defaultValue: string) => {
    const updated = new URLSearchParams(searchParams);
    if (value === defaultValue) {
      updated.delete(key);
    } else {
      updated.set(key, value);
    }
    updated.set('page', '1');
    setSearchParams(updated);
  };

  const onStatusChange = (nextStatus: StatusParam) => {
    updateListParam('status', nextStatus, 'all');
  };

  const onSortChange = (nextSort: SortParam) => {
    updateListParam('sort', nextSort, 'recent');
  };

  const onVote: MainVoteHandler = async (topic_id, index) => {
    if (isAuthLoading) return;
    const targetTopic = topics.find((topic) => topic.topic_id === topic_id);
    if (targetTopic?.is_closed) return;
    if (!isAuthenticated) {
      await showLoginRequiredAlert();
      return;
    }

    const confirmed = await confirm({
      title: '선택한 항목으로 투표할까요?',
      description: '투표 후에는 선택을 변경할 수 없어요.',
      confirmText: '투표하기',
      cancelText: '취소',
      actionOrder: 'confirm-first',
    });
    if (!confirmed) return;

    const res = await submitVote({ topicId: topic_id, voteIndex: index });
    if (!res) return;

    setTopics((prev) =>
      prev.map((t) => {
        if (t.topic_id !== topic_id) return t;
        const updatedResults = [...t.vote_results];
        if (index >= 0 && index < updatedResults.length) {
          updatedResults[index] = updatedResults[index] + 1;
        }
        return {
          ...t,
          has_voted: true,
          user_vote_index: index,
          total_vote: t.total_vote + 1,
          vote_results: updatedResults,
        };
      })
    );
  };

  const sortByPinnedThenOriginal = (list: MainTopic[]) =>
    [...list].sort(
      (a, b) =>
        (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) ||
        (a.originalIndex ?? 0) - (b.originalIndex ?? 0)
    );

  const onPinToggle: MainPinToggleHandler = async (topic_id, is_pinned) => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      await showLoginRequiredAlert('토픽을 고정하려면 로그인해 주세요.');
      return;
    }
    setTopics((prev) => {
      const updated = prev.map((t) =>
        t.topic_id === topic_id ? { ...t, is_pinned: !is_pinned } : t
      );
      return sortByPinnedThenOriginal(updated);
    });
    const success = is_pinned ? await unpinTopic(topic_id) : await pinTopic(topic_id);
    if (!success) {
      setTopics((prev) => {
        const reverted = prev.map((t) =>
          t.topic_id === topic_id ? { ...t, is_pinned: is_pinned } : t
        );
        return sortByPinnedThenOriginal(reverted);
      });
    }
  };

  return (
    <div className="w-full px-0 pt-3 pb-10">
      <div className="container mx-auto px-0">
        <TopicListControls
          status={status}
          sort={sort}
          onStatusChange={onStatusChange}
          onSortChange={onSortChange}
        />
        <Grid
          topics={topics}
          loading={loading}
          onVote={onVote}
          onPinToggle={onPinToggle}
          isAuthenticated={isAuthenticated}
          isAuthLoading={isAuthLoading}
        />
        <Pagination currentPage={page} total={totalTopics} perPage={topicsPerPage} onPageChange={onPageChange} />
      </div>
    </div>
  );
};

export default Main;
