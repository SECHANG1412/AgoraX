import { FaChartBar, FaShieldAlt, FaTag } from 'react-icons/fa';

type InfoBarProps = {
  totalVotes: number;
  category: string;
};

const getInfoItems = (totalVotes: number, category: string) => [
  {
    icon: <FaChartBar className="h-4 w-4 text-blue-600" />,
    label: '총 투표수',
    value: `${totalVotes}표`,
  },
  {
    icon: <FaShieldAlt className="h-4 w-4 text-blue-600" />,
    label: '투표 규칙',
    value: '한 번만 투표 가능',
  },
  {
    icon: <FaTag className="h-4 w-4 text-blue-600" />,
    label: '카테고리',
    value: category || '카테고리 없음',
  },
];

const InfoBar = ({ totalVotes, category }: InfoBarProps) => {
  const items = getInfoItems(totalVotes, category);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50">
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-500">{item.label}</span>
              <span className="block break-words text-sm font-bold leading-snug text-slate-800">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default InfoBar;
