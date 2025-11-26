import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Categories from '../../Components/Navbar/layout/Categories';
import { useTopic } from '../../hooks/useTopic';
import Header from './layout/Header';
import SearchTag from './layout/SearchTag';
import Pagination from './layout/Pagination';
import Grid from './layout/Grid';
import { useVote } from "../../hooks/useVote";
import { useAuth } from "../../hooks/useAuth";

const Main = () => {
  const { loading, fetchTopics, countAllTopics, pinTopic, unpinTopic } = useTopic();
  const { submitVote } = useVote();
  const { isAuthenticated } = useAuth();
  const [topics, setTopics] = useState([]);
  const [totalTopics, setTotalTopics] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();

  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'created_at';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const topicsPerPage = 12;

  const loadTopics = useCallback(async () => {
    const data = await fetchTopics({
      offset: page,
      limit: topicsPerPage,
      sort,
      category,
      search,
    });
    if (data) {
      // Keep track of the original ordering so pinned items can return to their place when unpinned.
      const withIndex = data.map((t, idx) => ({
        ...t,
        originalIndex: idx,
      }));
      setTopics(withIndex);
    }
  }, [fetchTopics, page, sort, category, search]);

  useEffect(() => {
    countAllTopics(category, search).then((count) => {
      setTotalTopics(count || 0);
    });
    loadTopics();
  }, [category, sort, page, search]);

  const onSortChange = (e) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('sort', e.target.value);
    updated.set('page', 1);
    setSearchParams(updated);
  };

  const onPageChange = (p) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('page', p);
    setSearchParams(updated);
  };

  const titleText = useMemo(() => {
    if (search) return `"${search}" 검색 결과`;
    if (category) return `${category}`;
    return '전체';
  }, [search, category]);

  const onSeachClear = () => {
    const updated = new URLSearchParams(searchParams);
    updated.delete('search');
    setSearchParams(updated);
  };

  const onVote = async (topic_id, index) => {
    const res = await submitVote({ topicId: topic_id, voteIndex: index });
    if (!res) return;

    // Optimistically update the local topic list so the UI reflects the vote immediately.
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
    // optimistic update with stable original order
    setTopics((prev) => {
      const updated = prev.map((t) =>
        t.topic_id === topic_id ? { ...t, is_pinned: !is_pinned } : t
      );
      return sortByPinnedThenOriginal(updated);
    });
    const success = is_pinned ? await unpinTopic(topic_id) : await pinTopic(topic_id);
    if (!success) {
      // revert on failure
      setTopics((prev) => {
        const reverted = prev.map((t) =>
          t.topic_id === topic_id ? { ...t, is_pinned: is_pinned } : t
        );
        return sortByPinnedThenOriginal(reverted);
      });
    }
  };

  return (
    <div className="w-full px-4 pt-6 pb-10 bg-white">
      <div className="container mx-auto px-0">
        <Header title={titleText} total={totalTopics} sort={sort} onSortChange={onSortChange} />
        <SearchTag search={search} onClear={onSeachClear} />
        <Grid topics={topics} loading={loading} onVote={onVote} onPinToggle={onPinToggle} isAuthenticated={isAuthenticated} />
        <Pagination currentPage={page} total={totalTopics} perPage={topicsPerPage} onPageChange={onPageChange} />
      </div>
    </div>
  );
};

export default Main;
