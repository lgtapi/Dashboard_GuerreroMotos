"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function CompareBarChart({
  title,
  data,
  labelA,
  labelB,
}: {
  title: string;
  data: { name: string; a: number; b: number }[];
  labelA: string;
  labelB: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
      <h3 className="mb-4 font-display text-sm uppercase tracking-wide text-paper/70">{title}</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" />
            <XAxis
              dataKey="name"
              stroke="#a3a3a3"
              tick={{ fontSize: 11, fill: "#a3a3a3" }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} />
            <Tooltip
              contentStyle={{
                background: "#161616",
                border: "1px solid #2c2c2c",
                borderRadius: 10,
                color: "#f7f7f5",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#a3a3a3" }} />
            <Bar dataKey="a" name={labelA} fill="#ff5803" radius={[4, 4, 0, 0]} />
            <Bar dataKey="b" name={labelB} fill="#3fd6c6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
