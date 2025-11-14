import { useState } from 'react';

export const useTopic = () => {
  const [loading, setLoading] = useState(false);
  const dummyTopics = [
    {
      topic_id: 1,
      user_id: 1,
      title: '테스트 토픽 1',
      category: '기타',
      vote_options: ['옵션1', '옵션2'],
      vote_results: [2, 3],
      total_vote: 5,
      has_voted: false,
      user_vote_index: null,
      description: '더미 설명 1',
      created_at: '2025-01-01T12:00:00Z',
      like_count: 10,
      has_liked: false,
    },
    {
      topic_id: 2,
      user_id: 2,
      title: '테스트 토픽 2',
      category: '기타',
      vote_options: ['옵션A', '옵션B', '옵션C'],
      vote_results: [1, 2, 1],
      total_vote: 4,
      has_voted: true,
      user_vote_index: 1,
      description: '더미 설명 2',
      created_at: '2025-02-01T12:00:00Z',
      like_count: 5,
      has_liked: true,
    },
  ];

  const fetchTopics = async ({ sort, limit, offset, category, search }) => {
    return dummyTopics;
  };

  const countAllTopics = async (category, search) => {
    return dummyTopics.length * 155;
  };

  const addTopic = async (TopicData) => {
    console.log(TopicData);
    return TopicData;
  };

  const getTopicById = async (topicId) => {
    return dummyTopics[topicId - 1];
  };

  return {
    loading,
    fetchTopics,
    countAllTopics,
    addTopic,
    getTopicById,
  };
};
