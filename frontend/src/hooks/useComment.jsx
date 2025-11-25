import { useState } from 'react';
import api from '../utils/api';
import { handleAuthError, showErrorAlert, showSuccessAlert } from '../utils/alertUtils';

export const useComment = () => {
  const createComment = async (topicId, content) => {
    try {
    const response = await api.post(`/comments`, {
      topic_id: topicId,
      content,
    });

    if (response.status === 200) {
      showSuccessAlert('댓글이 성공적으로 작성되었습니다.');
      return response.data;
    }
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, '댓글을 작성할 수 없습니다.');
      return null;
    }
  };

  const getComments = async (topicId) => {
    try {
      const response = await api.get(`/comments/by-topic/${topicId}`);

      if (response.status === 200) {
        return response.data;
      } else {
        showErrorAlert(new Error('예기치 않은 응답'), '댓글을 불러올 수 없습니다.');
        return null;
      }
    } catch (error) {
      if (await handleAuthError(error)) return;
      showErrorAlert(error, '댓글을 불러올 수 없습니다.');
      return null;
    }
  };

  const deleteComment = async (commentId) => {
    try {
      const response = await api.delete(`/comments/${commentId}`);

    if (response.status === 200) {
      showSuccessAlert('댓글이 성공적으로 삭제되었습니다.');
      return true;
    } else {
        showErrorAlert(new Error('예기치 않은 응답'), '댓글을 삭제할 수 없습니다.');
        return false;
      }
    } catch (error) {
      if (await handleAuthError(error)) return;
      showErrorAlert(error, '댓글을 삭제할 수 없습니다.');
      return false;
    }
  };

  const updateComment = async (commentId, content) => {
    try {
    const response = await api.put(`/comments/${commentId}`, { content });

    if (response.status === 200) {
      showSuccessAlert('댓글이 성공적으로 수정되었습니다.');
      return response.data;
    }
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, '댓글을 수정할 수 없습니다.');
      return null;
    }
  };

  return {
    createComment,
    getComments,
    deleteComment,
    updateComment,
  };
};
