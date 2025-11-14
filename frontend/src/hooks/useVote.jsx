import { useState } from 'react';

export const useVote = () => {
  const dummVote = {
    '2024-01-01T00:00:00Z': {
      formattedTime: '01/01 00:00',
      0: { count: 5, percent: 25 },
      1: { count: 10, percent: 50 },
      2: { count: 5, percent: 25 },
    },
    '2024-01-01T01:00:00Z': {
      formattedTime: '01/01 01:00',
      0: { count: 8, percent: 26 },
      1: { count: 15, percent: 50 },
      2: { count: 7, percent: 24 },
    },
    '2024-01-01T02:00:00Z': {
      formattedTime: '01/01 02:00',
      0: { count: 11, percent: 28 },
      1: { count: 20, percent: 50 },
      2: { count: 9, percent: 22 },
    },
    '2024-01-01T03:00:00Z': {
      formattedTime: '01/01 03:00',
      0: { count: 15, percent: 30 },
      1: { count: 26, percent: 52 },
      2: { count: 11, percent: 18 },
    },
  };

  const submitVote = async ({ topicId, voteIndex }) => {
    return false;
  };

  const getTopicVotes = async (topicId, timeRange = 'ALL') => {
    return dummVote;
  };

  return {
    submitVote,
    getTopicVotes,
  };
};
