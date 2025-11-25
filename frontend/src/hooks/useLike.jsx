import { useState } from 'react';
import api from "../utils/api";
import { handleAuthError, showErrorAlert } from "../utils/alertUtils";

export const useLike = () => {
  const toggleTopicLike = async (topicId) => {
    try {
      const response = await api.put(`/likes/topic/${topicId}`);

      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, "좋아요를 처리할 수 없습니다.");
      return null;
    }
  };

  const toggleCommentLike = async (commentId) => {
    try {
      const response = await api.put(`/likes/comment/${commentId}`);

      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, "좋아요를 처리할 수 없습니다.");
      return null;
    }
  };

  const toggleReplyLike = async (replyId) => {
    try {
      const response = await api.put(`/likes/reply/${replyId}`);

      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, "좋아요를 처리할 수 없습니다.");
      return null;
    }
  };

  return {
    toggleTopicLike,
    toggleCommentLike,
    toggleReplyLike,
  };
};
