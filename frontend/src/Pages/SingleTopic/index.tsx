import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { COMMON_MESSAGES, TOPIC_MESSAGES } from '../../constants/messages';
import { voteColors } from '../../constants/voteColors';
import { useAuth } from '../../hooks/auth-context';
import { useLike } from '../../hooks/useLike';
import { useTopic } from '../../hooks/useTopic';
import { useVote } from '../../hooks/useVote';
import { useConfirm } from '../../hooks/confirm-context';
import { showLoginRequiredAlert } from '../../utils/alertUtils';
import Comments from './Comments';
import ExpirationCountdown from './layout/ExpirationCountdown';
import { getRemainingMs } from './layout/expirationCountdownUtils';
import Header from './layout/Header';
import InfoBar from './layout/InfoBar';
import VoteButtons from './layout/VoteButtons';
import type { TopicRead } from '../../types';
import ReportButton from '../../Components/Common/ReportButton';

const Chart = lazy(() => import('./Chart'));

type FetchState = 'idle' | 'loading' | 'not-found' | 'error' | 'ready';
type VoteColorKey = keyof typeof voteColors;

const ChartFallback = () => (
  <section className="h-[260px] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:h-[420px] sm:p-5">
    <div className="h-full animate-pulse rounded-md bg-slate-100" aria-hidden="true" />
  </section>
);

const SingleTopic = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getTopicById, deleteTopic } = useTopic();
  const { toggleTopicLike } = useLike();
  const { submitVote } = useVote();
  const { user: authUser, isAuthenticated, isAuthLoading } = useAuth();
  const { confirm } = useConfirm();

  const [topic, setTopic] = useState<TopicRead | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [isExpiredLocally, setIsExpiredLocally] = useState(false);

  const fetchTopic = useCallback(async () => {
    if (!id) {
      setTopic(null);
      setFetchState('not-found');
      return;
    }

    setLoading(true);
    setFetchState('loading');

    const topicData = await getTopicById(id);

    if (topicData === null) {
      setTopic(null);
      setFetchState('not-found');
      setLoading(false);
      return;
    }

    if (topicData === undefined) {
      setTopic(null);
      setFetchState('error');
      setLoading(false);
      return;
    }

    setTopic(topicData);
    setFetchState('ready');
    setLoading(false);
  }, [id, getTopicById]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

  useEffect(() => {
    setIsExpiredLocally(false);
  }, [topic?.topic_id, topic?.expires_at]);

  const onExpire = useCallback(() => {
    setIsExpiredLocally(true);
  }, []);

  const onLikeClick = async () => {
    if (!id) return;
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      await showLoginRequiredAlert();
      return;
    }

    const result = await toggleTopicLike(id);
    if (result !== null) {
      setTopic((prev) => prev ? ({
        ...prev,
        has_liked: !prev.has_liked,
        like_count: prev.has_liked ? prev.like_count - 1 : prev.like_count + 1,
      }) : prev);
    }
  };

  const onVote = async (index: number) => {
    if (topic?.has_voted) return;
    if (topic?.is_closed) return;
    const currentRemainingMs = topic ? getRemainingMs(topic.expires_at, Date.now()) : null;
    if (currentRemainingMs !== null && currentRemainingMs <= 0) return;
    if (!id) return;
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      await showLoginRequiredAlert();
      return;
    }

    const confirmed = await confirm({
      title: '투표하시겠습니까?',
      description: '투표는 한 번만 가능하며 선택 후 변경할 수 없습니다.',
      confirmText: '투표하기',
      cancelText: COMMON_MESSAGES.cancel,
      actionOrder: 'confirm-first',
    });
    if (!confirmed) return;

    const success = await submitVote({ topicId: id, voteIndex: index });
    if (success) await fetchTopic();
  };

  const onDelete = async () => {
    if (!id) return;
    const confirmed = await confirm({
      title: TOPIC_MESSAGES.deleteConfirmTitle,
      description: TOPIC_MESSAGES.deleteConfirmText,
      confirmText: COMMON_MESSAGES.delete,
      cancelText: COMMON_MESSAGES.cancel,
      variant: 'danger',
    });
    if (!confirmed) return;

    const success = await deleteTopic(id);
    if (success) {
      navigate('/');
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <div className="mr-3 h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <span>토픽을 불러오는 중입니다.</span>
      </div>
    );

  if (fetchState === 'not-found')
    return (
      <div className="rounded-lg bg-slate-50 py-10 text-center">
        <p className="text-lg text-slate-500">{TOPIC_MESSAGES.notFound}</p>
      </div>
    );

  if (fetchState === 'error')
    return (
      <div className="rounded-lg bg-slate-50 py-10 text-center">
        <p className="text-lg text-slate-500">{TOPIC_MESSAGES.loadError}</p>
      </div>
    );

  if (!topic) return null;

  const commentCount = topic.comment_count ?? 0;
  const colors = voteColors[topic.vote_options.length as VoteColorKey] || [];
  const currentRemainingMs = getRemainingMs(topic.expires_at, Date.now());
  const isClosed = topic.is_closed || isExpiredLocally || (currentRemainingMs !== null && currentRemainingMs <= 0);
  const votePanel = (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-lg font-bold text-slate-950 sm:mb-4 sm:text-xl">
        {isClosed || topic.has_voted ? '투표 결과' : '지금 투표하기'}
      </h2>
      <ExpirationCountdown expiresAt={topic.expires_at} isClosed={isClosed} onExpire={onExpire} />
      <VoteButtons
        voteOptions={topic.vote_options}
        voteResults={topic.vote_results}
        totalVotes={topic.total_vote}
        hasVoted={topic.has_voted}
        useVoteIndex={topic.user_vote_index}
        onVote={onVote}
        colors={colors}
        isAuthLoading={isAuthLoading}
        isClosed={isClosed}
      />
      <p className="mt-3 text-center text-xs font-medium text-slate-500 sm:mt-4 sm:text-sm">
        {isClosed ? '마감된 토픽은 더 이상 투표할 수 없습니다.' : '한 번 투표하면 변경할 수 없습니다.'}
      </p>
    </section>
  );

  return (
    <div className="bg-slate-50 px-3 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <main className="space-y-4 sm:space-y-5">
          <Header
            title={topic.title}
            description={topic.description}
            category={topic.category}
            authorName={topic.author_name}
            createdAt={topic.created_at}
            commentCount={commentCount}
            liked={topic.has_liked}
            likes={topic.like_count}
            onLikeClick={onLikeClick}
            likeDisabled={isAuthLoading}
            actions={
              authUser?.user_id === topic.user_id ? (
                <button
                  onClick={onDelete}
                  className="min-h-9 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                >
                  {COMMON_MESSAGES.delete}
                </button>
              ) : (
                <ReportButton targetType="topic" targetId={topic.topic_id} />
              )
            }
          />

          <div className="lg:hidden">{votePanel}</div>

          <Suspense fallback={<ChartFallback />}>
            <Chart topicId={topic.topic_id} voteOptions={topic.vote_options} />
          </Suspense>
          <div className="lg:hidden">
            <InfoBar totalVotes={topic.total_vote} category={topic.category} />
          </div>
          <Comments topicId={topic.topic_id} />
        </main>

        <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block">
          {votePanel}
          <InfoBar totalVotes={topic.total_vote} category={topic.category} />
        </aside>
      </div>
    </div>
  );
};

export default SingleTopic;
