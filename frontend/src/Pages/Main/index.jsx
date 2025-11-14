import React, { useEffect, useCallback, useMemo, useState } from 'react';
import Categories from '../../Components/Navbar/layout/Categories';
import { useTopic } from '../../hooks/useTopic';
import Header from './layout/Header';
import SearchTag from './layout/SearchTag';
import Pagination from './layout/Pagination';
import Grid from './layout/Grid';

const Main = () => {
  const { loading, fetchTopics, countAllTopics } = useTopic();
  const [topics, setTopics] = useState([]);
  const [totalTopics, setTotalTopics] = useState(0);

  const category = '';
  const sort = 'created_at';
  const search = '';
  const page = 1;
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

  useEffect(
    () => {
      countAllTopics(Categories, search).then((count) => {
        setTotalTopics(count || 0);
      });
      loadTopics();
    },
    { category, sort, page, search }
  );

  const onSortChange = (e) => {
    console.log(e.target.value);
  };

  const onPageChange = (p) => {
    console.log(p);
  };

  const titleText = useMemo(() => {
    if (search) return `"${search}" 검색 결과`;
    if (category) return `${category} 토픽`;
    return '전체 토픽';
  }, [search, category]);

  const onSeachClear = () => {
    console.log('Seach Clear');
  };

  const onVote = (topic_id, index) => {
    console.log(topic_id, index);
  };

  return (
    <div className="w-full px-4 py-4 bg-white">
      <div className="max-w-8xl mx-auto">
        <Header title={titleText} total={totalTopics} sort={sort} onSortChange={onSortChange} />
        <SearchTag search={search} onClear={onSeachClear} />
        <Grid topics={topics} loading={loading} onVote={onVote} />
        <Pagination currentPage={page} total={totalTopics} perPage={topicsPerPage} onChange={onPageChange} />
      </div>
    </div>
  );
};

export default Main;
