import { useCallback, useEffect, useState } from 'react';
import { useVote } from '../../../hooks/useVote';
import ChartHeader from './ChartHeader';
import ChartCanvas from './ChartCanvas';
import ChartLegend from './ChartLegend';
import { voteColors } from '../../../constants/voteColors';
import TimeFrameButtons from './TimeFrameButtons';
import type { VoteChartPoint } from '../../../types';

export type TimeFrame = '1H' | '6H' | '1D' | '1W' | 'ALL';
type VoteColorKey = keyof typeof voteColors;

const TIME_FRAMES: TimeFrame[] = ['1H', '6H', '1D', '1W', 'ALL'];

type ChartProps = {
  topicId: number | string;
  voteOptions: string[];
};

const Chart = ({ topicId, voteOptions }: ChartProps) => {
  const { getTopicVotes } = useVote();
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('1D');
  const [loading, setLoading] = useState(false);
  const [voteData, setVoteData] = useState<VoteChartPoint[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const colors = voteColors[voteOptions.length as VoteColorKey] || [];
  const chartMetric = 'percent';

  const fetchTopicVotes = useCallback(
    async (frame: TimeFrame) => {
      if (!topicId) return;
      setLoading(true);

      try {
        const nextVoteData = await getTopicVotes(topicId, frame);
        setVoteData(nextVoteData || []);
      } finally {
        setHasLoaded(true);
        setLoading(false);
      }
    },
    [topicId, getTopicVotes]
  );

  useEffect(() => {
    fetchTopicVotes('1D');
  }, [fetchTopicVotes]);

  const onTimeFrameChange = (frame: TimeFrame) => {
    if (frame !== selectedTimeFrame) {
      setSelectedTimeFrame(frame);
      fetchTopicVotes(frame);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
      <ChartHeader />
      <ChartLegend options={voteOptions} colors={colors} />
      <div className="mt-3 overflow-hidden rounded-md sm:mt-4">
        {loading ? (
          <div className="flex h-[180px] items-center justify-center text-sm text-slate-500 sm:h-[300px]">
            투표 트렌드를 불러오는 중입니다.
          </div>
        ) : voteData.length === 0 && hasLoaded ? (
          <div className="flex h-[180px] items-center justify-center text-sm text-slate-500 sm:h-[300px]">
            표시할 투표 트렌드가 아직 없습니다.
          </div>
        ) : (
          <div className="h-[180px] w-full sm:h-[300px]">
            <ChartCanvas
              data={voteData}
              metric={chartMetric}
              options={voteOptions}
              colors={colors}
              timeFrame={selectedTimeFrame}
            />
          </div>
        )}
      </div>
      <TimeFrameButtons
        selected={selectedTimeFrame}
        onChange={onTimeFrameChange}
        loading={loading}
        options={TIME_FRAMES}
      />
    </section>
  );
};

export default Chart;
