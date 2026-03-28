import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  Label,
} from "recharts";

export function APIPieChart({ data = [] }) {
  if (!data || data.length === 0) {
    return <div className="text-gray-400">No data available</div>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <div className="text-gray-400">No meaningful data</div>;
  }

  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded-lg p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <h3 className="text-lg font-semibold text-white mb-4">
        API Status Distribution
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="40%" // 👈 this makes it donut
            outerRadius="70%"
            dataKey="value"
            label={({ name, percent }) =>
              `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
            }
            isAnimationActive
            animationDuration={800}
          >
            {data.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.color} />
            ))}
            <Label value={`Total: ${total}`} position="center" fill="#fff" />
          </Pie>

          <Tooltip
            formatter={(value, name) => [`${value}`, name]}
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "8px",
              color: "#fff",
            }}
          />

          <Legend wrapperStyle={{ color: "#9ca3af" }} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
