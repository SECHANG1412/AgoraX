import api from "../utils/api";
import {
  handleAuthError,
  showErrorAlert,
  showConfirmDialog,
} from "../utils/alertUtils";

export const useReply = () => {
  const isSuccess = (status) => status >= 200 && status < 300;

  const createReply = async (commentId, content, parentReplyId = null) => {
    try {
      const response = await api.post(`/replies`, {
        comment_id: commentId,
        content,
        parent_reply_id: parentReplyId,
      });

      if (isSuccess(response.status)) return response.data;
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, "대댓글 생성에 실패했습니다.");
      return null;
    }
  };

  const deleteReply = async (replyId) => {
    try {
      const confirm = await showConfirmDialog(
        "대댓글을 삭제할까요?",
        "삭제하면 되돌릴 수 없습니다.",
        "삭제",
        "취소",
        "#EF4444",
        "#9CA3AF"
      );
      if (!confirm.isConfirmed) return false;

      const response = await api.delete(`/replies/${replyId}`);

      if (isSuccess(response.status)) {
        return true;
      }
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, "대댓글 삭제에 실패했습니다.");
      return null;
    }
  };


  const updateReply = async (replyId, content) => {
    try {
      const response = await api.put(`/replies/${replyId}`, { content });

      if (isSuccess(response.status)) return response.data;
      return null;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      showErrorAlert(error, "대댓글 수정에 실패했습니다.");
      return null;
    }
  };

  return {
    createReply,
    deleteReply,
    updateReply,
  };
};
