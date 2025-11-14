import React from 'react';

const ChartHeader = ({ chartMetric, setChartMetric, loading }) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-semibold text-gray-700">📊 투표 트렌드</h2>
      <select
        value={chartMetric}
        onChange={(e) => setChartMetric(e.target.value)}
        className="px-3 py-1 border rounded-md text-sm"
        disabled={loading}
      >
        <option value="count">투표 수</option>
        <option value="percent">백분율 (%)</option>
      </select>
    </div>
  );
};

export default ChartHeader;
