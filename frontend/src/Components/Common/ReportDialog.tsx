import { useEffect, useState } from 'react';
import type { ReportReason, ReportTargetType } from '../../types';
import { useReport } from '../../hooks/useReport';

type ReportDialogProps = {
  isOpen: boolean;
  targetType: ReportTargetType;
  targetId: number;
  onClose: () => void;
};

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'abuse', label: '욕설·비방' },
  { value: 'hate', label: '혐오·차별' },
  { value: 'sexual', label: '음란성 콘텐츠' },
  { value: 'spam', label: '광고·도배' },
  { value: 'privacy', label: '개인정보 노출' },
  { value: 'misinformation', label: '허위·조작 정보' },
  { value: 'other', label: '기타' },
];

const ReportDialog = ({ isOpen, targetType, targetId, onClose }: ReportDialogProps) => {
  const [reason, setReason] = useState<ReportReason>('abuse');
  const [detail, setDetail] = useState('');
  const { createReport, isSubmitting } = useReport();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const report = await createReport({
      target_type: targetType,
      target_id: targetId,
      reason,
      detail: detail.trim() || null,
    });
    if (report) {
      setReason('abuse');
      setDetail('');
      onClose();
    }
  };

  const detailRequired = reason === 'other';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl sm:p-6"
      >
        <h2 id="report-dialog-title" className="text-xl font-bold text-slate-900">콘텐츠 신고</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          신고는 관리자 검토 후 처리되며, 신고자의 정보는 작성자에게 공개되지 않습니다.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">
            신고 사유
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as ReportReason)}
              className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {REASONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            상세 내용 {detailRequired ? <span className="text-red-600">*</span> : '(선택)'}
            <textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              required={detailRequired}
              maxLength={500}
              rows={4}
              placeholder="관리자가 판단하는 데 필요한 내용을 입력해주세요."
              className="mt-2 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-6"
            />
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (detailRequired && !detail.trim())}
              className="min-h-11 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? '접수 중' : '신고하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportDialog;
