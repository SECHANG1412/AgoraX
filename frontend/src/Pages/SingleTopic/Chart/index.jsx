import React, { useCallback, useEffect, useState } from 'react';
import { useVote } from '../../../hooks/useVote';
import ChartHeader from './ChartHeader';
import ChartCanvas from './ChartCanvas';
import { voteColors } from '../../../constants/voteColors';
import TimeFrameButtons from "./TimeFrameButtons";

const timeFrames = ['1H', '6H', '1D', '1W', '1M', 'ALL'];

const Chart = ({ topicId, voteOptions }) => {
  const { getTopicVotes } = useVote();
  const [selectedTimeFrame, setSelectedTimeFrame] = useState('ALL');
  const [chartMetric, setChartMetric] = useState('count');
  const [loading, SetLoading] = useState(false);
  const [voteData, setVoteData] = useState([]);

  const fetchTopicVotes = useCallback(
    async (frame) => {
      if (!topicId) return;
      SetLoading(true);

      const tmpVoteData = await getTopicVotes(topicId, frame);
      if (tmpVoteData) {
        const chartData = Object.entries(tmpVoteData).map(([_, d]) => ({
          time: d.formattedTime,
          ...Object.entries(d).reduce(
            (acc, [k, v]) =>
              typeof v === 'object'
                ? {
                    ...acc,
                    [`count_${k}`]: v.count || 0,
                    [`percent_${k}`]: v.percent || 0,
                  }
                : acc,
            {}
          ),
        }));

        setVoteData(chartData);
      }

      SetLoading(false);
    },
    [topicId, getTopicVotes]
  );

  useEffect(() => {
    fetchTopicVotes('ALL');
  }, []);

  const onTimeFrameChage = (frame) => {
    if (frame !== selectedTimeFrame) {
      setSelectedTimeFrame(frame);
      fetchTopicVotes(frame);
    }
  };

  return (
    <div className="bg-gray-100 rounded-lg p-5 shadow-inner mb-6 relative">
      <ChartHeader chartMetric={chartMetric} setChartMetric={setChartMetric} loading={loading} />
      <ChartCanvas data={voteData} metric={chartMetric} options={voteOptions} colors={voteColors[voteOptions.length]} />
      <TimeFrameButtons
        selected={selectedTimeFrame}
        onChange={onTimeFrameChage}
        loading={loading}
        options={timeFrames}
      />
    </div>
  );
};

export default Chart;
