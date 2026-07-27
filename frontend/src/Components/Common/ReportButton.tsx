import { useState } from 'react';
import { FaFlag } from 'react-icons/fa';
import type { ReportTargetType } from '../../types';
import { useAuth } from '../../hooks/auth-context';
import { showLoginRequiredAlert } from '../../utils/alertUtils';
import ReportDialog from './ReportDialog';

type ReportButtonProps = {
  targetType: ReportTargetType;
  targetId: number;
  compact?: boolean;
};

const ReportButton = ({ targetType, targetId, compact = false }: ReportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, isAuthLoading } = useAuth();

  const open = async () => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      await showLoginRequiredAlert('신고하려면 로그인이 필요합니다.');
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={isAuthLoading}
        className={compact
          ? 'inline-flex h-11 w-11 items-center justify-center rounded-md text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50'
          : 'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-500 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50'}
        aria-label="신고"
        title="신고"
      >
        <FaFlag className="h-3.5 w-3.5" />
        {!compact && <span>신고</span>}
      </button>
      <ReportDialog
        isOpen={isOpen}
        targetType={targetType}
        targetId={targetId}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default ReportButton;
