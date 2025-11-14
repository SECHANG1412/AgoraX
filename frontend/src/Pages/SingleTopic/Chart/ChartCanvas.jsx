import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const ChartCanvas = ({ data, metric, options, colors }) => {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" tick={{ fontSize: 12 }} interval={Math.ceil((data?.length || 0) / 6)} minTickGap={50} />
        <YAxis
          tick={{ fontSize: 12 }}
          domain={metric === 'percent' ? [0, 100] : ['auto', 'auto']}
          tickFormatter={(v) => (metric === 'percent' ? `${v}%` : v)}
        />
        <Tooltip
          formatter={(value, name) => {
            const index = name.split('_')[1];
            return [metric === 'percent' ? `${value}%` : value, options[index]];
          }}
        />
        {options.map((_, i) => (
          <Line
            key={i}
            type={'monotone'}
            dataKey={`${metric}_${i}`}
            name={`option_${i}`}
            stroke={colors[i]}
            strokeWidth={2}
            dot={false}
            connectNulls
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ChartCanvas;
