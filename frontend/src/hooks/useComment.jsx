import { useCallback } from 'react';
import api from '../utils/api';
import { handleAuthError, showErrorAlert, showSuccessAlert } from '../utils/alertUtils';

export const useComment = () => {
  const createComment = useCallback(async (topicId, content) => {
    try {
      const response = await api.post(`/comments`, {
        topic_id: topicId,
        content,
      });

      if (response.status === 200) {
        showSuccessAlert('댓글이 등록되었습니다.');
        return response.data;
      }
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, '댓글 작성에 실패했습니다.');
      return null;
    }
  }, []);

  const getComments = useCallback(async (topicId) => {
    try {
      const response = await api.get(`/comments/by-topic/${topicId}`);

      if (response.status === 200) {
        return response.data;
      } else {
        showErrorAlert(new Error('데이터 에러'), '댓글을 불러오지 못했습니다.');
        return null;
      }
    } catch (error) {
      if (await handleAuthError(error)) return;
      showErrorAlert(error, '댓글을 불러오지 못했습니다.');
      return null;
    }
  }, []);

  const deleteComment = useCallback(async (commentId) => {
    try {
      const response = await api.delete(`/comments/${commentId}`);

      if (response.status === 200) {
        showSuccessAlert('댓글이 삭제되었습니다.');
        return true;
      } else {
        showErrorAlert(new Error('데이터 에러'), '댓글 삭제에 실패했습니다.');
        return false;
      }
    } catch (error) {
      if (await handleAuthError(error)) return;
      showErrorAlert(error, '댓글 삭제에 실패했습니다.');
      return false;
    }
  }, []);

  const updateComment = useCallback(async (commentId, content) => {
    try {
      const response = await api.put(`/comments/${commentId}`, { content });

      if (response.status === 200) {
        showSuccessAlert('댓글이 수정되었습니다.');
        return response.data;
      }
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, '댓글 수정에 실패했습니다.');
      return null;
    }
  }, []);

  return {
    createComment,
    getComments,
    deleteComment,
    updateComment,
  };
};
