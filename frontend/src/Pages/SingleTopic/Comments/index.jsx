import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';
import CommentItem from './CommentItem';
import { useComment } from '../../../hooks/useComment';
import { useReply } from '../../../hooks/useReply';
import { useLike } from '../../../hooks/useLike';
import { useAuth } from '../../../hooks/useAuth';
import { showLoginRequiredAlert } from '../../../utils/alertUtils';
import PaginationControls from './PaginationControls';

const Comments = ({ topicId }) => {
  const { getComments, createComment, updateComment, deleteComment, loading } = useComment();
  const { createReply, updateReply, deleteReply } = useReply();
  const { toggleCommentLike, toggleReplyLike } = useLike();
  const { isAuthenticated, isAuthLoading } = useAuth();

  const [comments, setComments] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [newComment, setNewComment] = useState('');

  const itemsPerPage = 10;

  const fetchComment = useCallback(async () => {
    const result = await getComments(topicId);
    setComments(result || []);
  }, [getComments, topicId]);

  useEffect(() => {
    fetchComment();
    setCurrentPage(1);
  }, [topicId, fetchComment]);

  const ensureAuth = async (message) => {
    if (isAuthLoading) return false;
    if (!isAuthenticated) {
      await showLoginRequiredAlert(message);
      return false;
    }
    return true;
  };

  const onCreateComment = async () => {
    if (!(await ensureAuth('댓글을 작성하려면 로그인해 주세요.'))) return;
    const result = await createComment(topicId, newComment);
    if (result) {
      setNewComment('');
      fetchComment();
    }
  };

  const onDeleteComment = async (commentId) => {
    const confirm = await Swal.fire({
      title: '댓글을 삭제하시겠습니까?',
      text: '삭제 후에는 복구할 수 없습니다.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#9CA3AF',
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
    });

    if (confirm.isConfirmed) {
      const success = await deleteComment(commentId);
      if (success) fetchComment();
    }
  };

  const guardedAction = async (action, message) => {
    if (!(await ensureAuth(message))) return null;
    return action();
  };

  const onCommentActions = {
    onEdit: (commentId, content) =>
      guardedAction(() => updateComment(commentId, content), '댓글을 수정하려면 로그인해 주세요.'),
    onDelete: (commentId) =>
      guardedAction(() => onDeleteComment(commentId), '댓글을 삭제하려면 로그인해 주세요.'),
    onLike: (commentId) =>
      guardedAction(() => toggleCommentLike(commentId), '댓글에 좋아요하려면 로그인해 주세요.'),
    onReply: (commentId, content) =>
      guardedAction(() => createReply(commentId, content), '답글을 작성하려면 로그인해 주세요.'),
    onReplyEdit: (replyId, content) =>
      guardedAction(() => updateReply(replyId, content), '답글을 수정하려면 로그인해 주세요.'),
    onReplyDelete: (replyId) =>
      guardedAction(() => deleteReply(replyId), '답글을 삭제하려면 로그인해 주세요.'),
    onReplyLike: (replyId) =>
      guardedAction(() => toggleReplyLike(replyId), '답글에 좋아요하려면 로그인해 주세요.'),
  };

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentComments = comments.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(comments.length / itemsPerPage);

  const isLocked = !isAuthLoading && !isAuthenticated;

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        댓글 <span className="text-blue-600">({comments.length})</span>
      </h2>
      <textarea
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder={isLocked ? '로그인 후 댓글을 작성할 수 있습니다.' : '댓글을 작성해 주세요...'}
        className="w-full p-4 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
        rows={3}
        disabled={isLocked}
      />
      <div className="flex justify-end mt-2">
        <button
          onClick={onCreateComment}
          disabled={!newComment.trim() || loading || isLocked}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-500/60 disabled:cursor-not-allowed"
        >
          댓글 작성
        </button>
      </div>
      <div className="space-y-6 mt-6">
        {currentComments.map((comment) => (
          <CommentItem key={comment.comment_id} item={comment} actions={onCommentActions} refresh={fetchComment} />
        ))}
      </div>
      {totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}
    </div>
  );
};

export default Comments;
