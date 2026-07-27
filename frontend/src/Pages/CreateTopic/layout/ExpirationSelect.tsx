import { formatExpirationDateTime } from '../expiration';

type ExpirationPreset = '1d' | '3d' | '7d' | '14d' | 'custom';

type ExpirationSelectProps = {
  dateValue: string;
  timeValue: string;
  isInvalid: boolean;
  preset: ExpirationPreset;
  minDate: string;
  onPresetChange: (preset: ExpirationPreset) => void;
  onCustomDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
};

const PRESET_OPTIONS: { label: string; value: ExpirationPreset }[] = [
  { label: '1일', value: '1d' },
  { label: '3일', value: '3d' },
  { label: '7일', value: '7d' },
  { label: '14일', value: '14d' },
  { label: '직접 설정', value: 'custom' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

const ExpirationSelect = ({
  dateValue,
  timeValue,
  isInvalid,
  preset,
  minDate,
  onPresetChange,
  onCustomDateChange,
  onTimeChange,
}: ExpirationSelectProps) => {
  const [selectedHour = '23', selectedMinute = '59'] = timeValue.split(':');
  const onHourChange = (hour: string) => onTimeChange(`${hour}:${selectedMinute}`);
  const onMinuteChange = (minute: string) => onTimeChange(`${selectedHour}:${minute}`);
  const formattedExpiration = formatExpirationDateTime(`${dateValue}T${timeValue}`);

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        마감 시간 <span className="text-red-500">*</span>
      </label>

      <div className="flex flex-wrap gap-2">
        {PRESET_OPTIONS.map((option) => {
          const isSelected = preset === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onPresetChange(option.value)}
              className={`min-h-10 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                isSelected
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {preset === 'custom' && (
        <div className="mt-3">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">마감 날짜</label>
          <input
            type="date"
            value={dateValue}
            min={minDate}
            onChange={(event) => onCustomDateChange(event.target.value)}
            required
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
      )}

      <div className="mt-3">
        <p className="mb-1.5 text-xs font-semibold text-slate-600">마감 시각</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="sr-only" htmlFor="expiration-hour">마감 시</label>
          <select
            id="expiration-hour"
            value={selectedHour}
            onChange={(event) => onHourChange(event.target.value)}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {HOUR_OPTIONS.map((hour) => (
              <option key={hour} value={hour}>
                {hour}시
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="expiration-minute">마감 분</label>
          <select
            id="expiration-minute"
            value={selectedMinute}
            onChange={(event) => onMinuteChange(event.target.value)}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {MINUTE_OPTIONS.map((minute) => (
              <option key={minute} value={minute}>
                {minute}분
              </option>
            ))}
          </select>
        </div>
      </div>

      {formattedExpiration && (
        <div
          aria-live={'polite'}
          className={`mt-3 rounded-lg border px-3 py-3 sm:px-4 ${
            isInvalid ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <p className={`text-xs font-semibold ${isInvalid ? 'text-red-600' : 'text-slate-500'}`}>
            마감 예정
          </p>
          <p className={`mt-1 break-keep text-sm font-semibold leading-6 ${isInvalid ? 'text-red-700' : 'text-slate-900'}`}>
            {formattedExpiration}
          </p>
          {isInvalid && (
            <p className={'mt-1.5 text-xs font-medium text-red-600'}>
              현재 시각 이후로 마감 일시를 선택해 주세요.
            </p>
          )}
        </div>
      )}

      <p className="mt-1.5 text-xs text-slate-500">
        마감 후에는 추가로 투표할 수 없으며 결과만 확인할 수 있습니다.
      </p>
    </div>
  );
};

export default ExpirationSelect;
export type { ExpirationPreset };
