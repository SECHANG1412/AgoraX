import type { TimeFrame } from '.';

type TimeFrameButtonsProps = {
  selected: TimeFrame;
  onChange: (frame: TimeFrame) => void;
  loading: boolean;
  options: TimeFrame[];
};

function TimeFrameButtons({ selected, onChange, loading, options }: TimeFrameButtonsProps) {
  return (
    <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:pb-0">
      {options.map((frame) => (
        <button
          key={frame}
          onClick={() => onChange(frame)}
          disabled={loading}
          className={`min-h-10 min-w-[58px] shrink-0 rounded-lg border px-3 py-2 text-sm font-bold transition-all duration-200 ${
            selected === frame
              ? 'border-blue-600 bg-blue-600 text-white shadow-md'
              : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
          }`}
        >
          {frame}
        </button>
      ))}
    </div>
  );
}

export default TimeFrameButtons;
