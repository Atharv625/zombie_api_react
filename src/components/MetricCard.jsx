import React from "react";

const MetricCard = ({ title, value, color }) => {
  return (
    <div className={`metric-card ${color}`}>
      <div className="card-label">{title}</div>
      <div className="card-value">{value}</div>
      <div className="card-sub">Live data</div>
    </div>
  );
};

export default MetricCard;
