import { useState } from "react";
import api from "../utils/api";
import {
  handleAuthError,
  showErrorAlert,
  showConfirmDialog,
} from "../utils/alertUtils";

export const useReply = () => {
  const createReply = async (commentId, content) => {
    try {
      const response = await api.post(`/replies`, {
        comment_id: commentId,
        content,
      });

      if (response.status === 200) return response.data;
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, "답글을 작성할 수 없습니다.");
      return null;
    }
  };

  const deleteReply = async (replyId) => {
    try {
      const confirm = await showConfirmDialog(
        "답글을 삭제할까요?",
        "삭제하면 되돌릴 수 없습니다.",
        "삭제",
        "취소",
        "#EF4444",
        "#9CA3AF"
      );
      if (!confirm.isConfirmed) return false;

      const response = await api.delete(`/replies/${replyId}`);

      if (response.status === 200) {
        return true;
      }
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, "답글을 삭제할 수 없습니다.");
      return null;
    }
  };


  const updateReply = async (replyId, content) => {
    try {
      const response = await api.put(`/replies/${replyId}`, { content });

      if (response.status === 200) return response.data;
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, "답글을 수정할 수 없습니다.");
      return null;
    }
  };

  return {
    createReply,
    deleteReply,
    updateReply,
  };
};
