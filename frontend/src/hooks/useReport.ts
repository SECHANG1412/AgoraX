import { isAxiosError } from 'axios';
import { useCallback, useState } from 'react';
import type { ReportCreateRequest, ReportRead } from '../types';
import api from '../utils/api';
import { handleAuthError, showErrorAlert, showSuccessAlert, showWarningAlert } from '../utils/alertUtils';


export const useReport = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createReport = useCallback(async (payload: ReportCreateRequest) => {
    setIsSubmitting(true);
    try {
      const response = await api.post<ReportRead>('/reports', payload);
      showSuccessAlert('신고가 접수되었습니다. 검토 결과는 알림으로 안내해드리겠습니다.');
      return response.data;
    } catch (error) {
      if (await handleAuthError(error)) return null;
      if (isAxiosError(error) && error.response?.status === 409) {
        showWarningAlert('이미 신고한 콘텐츠입니다.', '동일한 콘텐츠는 한 번만 신고할 수 있습니다.');
        return null;
      }
      showErrorAlert(error, '신고를 접수하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { createReport, isSubmitting };
};
