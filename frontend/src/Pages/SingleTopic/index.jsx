import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTopic } from '../../hooks/useTopic';
import { useLike } from '../../hooks/useLike';
import { useVote } from '../../hooks/useVote';
import Header from './layout/Header';
import InfoBar from './layout/InfoBar';
import VoteButtons from './layout/VoteButtons';
import { voteColors } from '../../constants/voteColors';
import Chart from './Chart';

const SingleTopic = () => {
  const { id } = useParams();
  const { getTopicById } = useTopic();
  const { toggleTopicLike } = useLike();
  const { submitVote } = useVote();

  const [topic, setTopic] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchTopic = useCallback(async () => {
    setLoading(true);
    const topicData = await getTopicById(id);
    if (topicData) setTopic(topicData);
    setLoading(false);
  }, [id, getTopicById]);

  useEffect(() => {
    fetchTopic();
  }, []);

  const onLikeClick = async () => {
    const result = await toggleTopicLike(id);
    if (result !== null) {
      setTopic((prev) => ({
        ...prev,
        has_liked: !prev.has_liked,
        like_count: prev.has_liked ? prev.like_count - 1 : prev.like_count + 1,
      }));
    }
  };

  const onVote = async (index) => {
    if (topic?.has_voted) return;
    const success = await submitVote({ topicId: id, voteIndex: index });
    if (success) await fetchTopic();
  };

  if (loading)
    return (
      <div className="flex justify-center items-center py-10 text-gray-500">
        <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full mr-3" />
        <span>로딩 중...</span>
      </div>
    );

  if (!topic)
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg">
        <p className="text-lg text-gray-500">토픽을 찾을 수 없습니다</p>
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-lg p-8 border border-gray-200">
      <Header title={topic.title} liked={topic.has_liked} likes={topic.like_count} onLikeClick={onLikeClick} />
      <p className="text-gray-600 mb-6">{topic.description}</p>
      <Chart topicId={topic.topic_id} voteOptions={topic.vote_options} />
      <InfoBar createdAt={topic.created_at} totalVotes={topic.total_vote} />
      <VoteButtons
        voteOptions={topic.vote_options}
        voteResults={topic.vote_results}
        totalVotes={topic.total_vote}
        hasVoted={topic.has_voted}
        useVoteIndex={topic.user_vote_index}
        onVote={onVote}
        colors={voteColors[topic.vote_options.length]}
      />
    </div>
  );
};

export default SingleTopic;
