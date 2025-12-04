import React, { useEffect, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTopic } from '../../hooks/useTopic';
import Pagination from './layout/Pagination';
import Grid from './layout/Grid';
import { useVote } from "../../hooks/useVote";
import { useAuth } from "../../hooks/useAuth";

const SORT_MAP = {
  recent: 'created_at',
  likes: 'like_count',
  views: 'view_count',
};

const Main = () => {
  const { loading, fetchTopics, countAllTopics, pinTopic, unpinTopic } = useTopic();
  const { submitVote } = useVote();
  const { isAuthenticated } = useAuth();
  const [topics, setTopics] = useState([]);
  const [totalTopics, setTotalTopics] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') || '';
  const rawSort = searchParams.get('sort');
  const sortParam =
    rawSort === 'created_at'
      ? 'recent'
      : rawSort === 'like_count'
        ? 'likes'
        : rawSort === 'view_count'
          ? 'views'
          : rawSort || 'recent';
  const sort = SORT_MAP[sortParam] ? sortParam : 'recent';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const topicsPerPage = 10;

  const apiSort = SORT_MAP[sort];

  const loadTopics = useCallback(async () => {
    const data = await fetchTopics({
      offset: page,
      limit: topicsPerPage,
      sort: apiSort,
      category,
      search,
    });
    if (data) {
      const withIndex = data.map((t, idx) => ({
        ...t,
        originalIndex: idx,
      }));
      setTopics(withIndex);
    }
  }, [fetchTopics, page, apiSort, category, search]);

  useEffect(() => {
    countAllTopics(category, search).then((count) => {
      setTotalTopics(count || 0);
    });
    loadTopics();
  }, [category, apiSort, page, search]);

  const onPageChange = (p) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('page', p);
    setSearchParams(updated);
  };

  const onVote = async (topic_id, index) => {
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

  const sortByPinnedThenOriginal = (list) =>
    [...list].sort(
      (a, b) =>
        (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) ||
        (a.originalIndex ?? 0) - (b.originalIndex ?? 0)
    );

  const onPinToggle = async (topic_id, is_pinned) => {
    if (!isAuthenticated) return;
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
    <div className="w-full px-0 pt-4 pb-10">
      <div className="container mx-auto px-0">
        <Grid topics={topics} loading={loading} onVote={onVote} onPinToggle={onPinToggle} isAuthenticated={isAuthenticated} />
        <Pagination currentPage={page} total={totalTopics} perPage={topicsPerPage} onPageChange={onPageChange} />
      </div>
    </div>
  );
};

export default Main;
