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
    if (data) setTopics(data);
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

  const onVote = (topic_id, index) => {
    submitVote(topic_id, index);
  };

  const onPinToggle = async (topic_id, is_pinned) => {
    if (!isAuthenticated) return;
    // optimistic update
    setTopics((prev) => {
      const updated = prev.map((t) =>
        t.topic_id === topic_id ? { ...t, is_pinned: !is_pinned } : t
      );
      const pinned = updated.filter((t) => t.is_pinned);
      const others = updated.filter((t) => !t.is_pinned);
      return [...pinned, ...others];
    });
    const success = is_pinned ? await unpinTopic(topic_id) : await pinTopic(topic_id);
    if (!success) {
      // revert on failure
      setTopics((prev) => {
        const reverted = prev.map((t) =>
          t.topic_id === topic_id ? { ...t, is_pinned: is_pinned } : t
        );
        const pinned = reverted.filter((t) => t.is_pinned);
        const others = reverted.filter((t) => !t.is_pinned);
        return [...pinned, ...others];
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
