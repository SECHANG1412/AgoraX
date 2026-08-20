import { useCallback, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '../../constants/categories';
import { CREATE_TOPIC_MESSAGES } from '../../constants/messages';
import { useTopic } from '../../hooks/useTopic';
import { showErrorAlert, showWarningAlert } from '../../utils/alertUtils';
import CategorySelect from './layout/CategorySelect';
import ExpirationSelect, { type ExpirationPreset } from './layout/ExpirationSelect';
import FormField from './layout/FormField';
import SubmitButton from './layout/SubmitButton';
import VoteOptionInputs from './layout/VoteOptionInputs';
import { combineDateTime, getPresetDate, toDateInputValue } from './expiration';

const TITLE_MAX_LENGTH = 80;
const OPTION_COUNT = 2;
const DEFAULT_EXPIRATION_TIME = '23:59';

export type CreateTopicFormData = {
  title: string;
  description: string;
  vote_options: string[];
  category: string;
  expires_at: string;
};

const CreateTopic = () => {
  const { addTopic } = useTopic();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<CreateTopicFormData>({
    title: '',
    description: '',
    vote_options: ['', ''],
    category: '',
    expires_at: combineDateTime(getPresetDate('7d'), DEFAULT_EXPIRATION_TIME),
  });
  const [expirationPreset, setExpirationPreset] = useState<ExpirationPreset>('7d');
  const [expirationTime, setExpirationTime] = useState(DEFAULT_EXPIRATION_TIME);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const onChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const minExpirationDate = toDateInputValue(new Date());
  const expirationDate = new Date(formData.expires_at);
  const isExpirationInvalid = Number.isNaN(expirationDate.getTime()) || expirationDate <= new Date();

  const onExpirationPresetChange = useCallback((preset: ExpirationPreset) => {
    setExpirationPreset(preset);
    if (preset === 'custom') return;
    setFormData((prev) => ({ ...prev, expires_at: combineDateTime(getPresetDate(preset), expirationTime) }));
  }, [expirationTime]);

  const onCustomExpirationDateChange = useCallback((value: string) => {
    setExpirationPreset('custom');
    setFormData((prev) => ({ ...prev, expires_at: combineDateTime(value, expirationTime) }));
  }, [expirationTime]);

  const onExpirationTimeChange = useCallback((value: string) => {
    setExpirationTime(value);
    setFormData((prev) => {
      const [dateValue] = prev.expires_at.split('T');
      return { ...prev, expires_at: combineDateTime(dateValue || minExpirationDate, value) };
    });
  }, [minExpirationDate]);

  const onSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (isSubmittingRef.current) return;

      const title = formData.title.trim();
      const validVoteOptions = formData.vote_options.map((opt) => opt.trim());

      if (title.length > TITLE_MAX_LENGTH) {
        showWarningAlert('제목이 너무 깁니다', `제목은 최대 ${TITLE_MAX_LENGTH}자까지 입력할 수 있습니다.`);
        return;
      }

      if (validVoteOptions.some((opt) => opt === '') || validVoteOptions.length !== OPTION_COUNT) {
        showWarningAlert('투표 옵션을 입력해 주세요', '두 선택지를 모두 입력해 주세요.');
        return;
      }

      if (new Set(validVoteOptions).size !== validVoteOptions.length) {
        showWarningAlert(
          CREATE_TOPIC_MESSAGES.duplicateOptionTitle,
          CREATE_TOPIC_MESSAGES.duplicateOptionText
        );
        return;
      }

      const expiresAt = new Date(formData.expires_at);
      if (!formData.expires_at || Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
        showWarningAlert('마감 시간을 확인해 주세요', '마감 시간은 현재 시각 이후로 설정해야 합니다.');
        return;
      }

      isSubmittingRef.current = true;
      setIsSubmitting(true);

      try {
        const result = await addTopic({
          ...formData,
          title,
          vote_options: validVoteOptions,
          expires_at: expiresAt.toISOString(),
        });
        if (!result) return;
        navigate(`/topic/${result.topic_id}`);
      } catch (error) {
        showErrorAlert(error, CREATE_TOPIC_MESSAGES.retry);
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [formData, addTopic, navigate]
  );

  const onOptionChange = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.vote_options];
      updated[index] = value;
      return { ...prev, vote_options: updated };
    });
  }, []);

  return (
    <div className="flex items-center justify-center bg-slate-50 px-3 py-6 sm:px-4 sm:py-10">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <h2 className="mb-5 text-xl font-semibold text-slate-900 sm:mb-6 sm:text-2xl">토픽 만들기</h2>
        <form onSubmit={onSubmit} className="space-y-5 sm:space-y-6">
          <FormField
            label="제목"
            name="title"
            value={formData.title}
            onChange={onChange}
            placeholder="토픽 제목을 입력해 주세요"
            maxLength={TITLE_MAX_LENGTH}
            helperText={`${formData.title.length}/${TITLE_MAX_LENGTH}`}
          />
          <FormField
            label="설명"
            name="description"
            value={formData.description}
            onChange={onChange}
            placeholder="토픽에 대한 설명을 입력해 주세요"
          />
          <VoteOptionInputs formData={formData} onOptionChange={onOptionChange} />
          <CategorySelect categories={CATEGORIES} value={formData.category} onChange={onChange} />
          <ExpirationSelect
            dateValue={formData.expires_at.split('T')[0] || ''}
            timeValue={expirationTime}
            isInvalid={isExpirationInvalid}
            preset={expirationPreset}
            minDate={minExpirationDate}
            onPresetChange={onExpirationPresetChange}
            onCustomDateChange={onCustomExpirationDateChange}
            onTimeChange={onExpirationTimeChange}
          />
          <SubmitButton label="토픽 만들기" isSubmitting={isSubmitting} />
        </form>
      </div>
    </div>
  );
};

export default CreateTopic;
