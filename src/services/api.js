// src/services/api.js

export const fetchMetrics = async () => {
  return {
    total: 120,
    active: 95,
    zombie: 15,
    highRisk: 10,
    traffic: [
      { time: "1", requests: 40, sanitized: 30 },
      { time: "2", requests: 60, sanitized: 45 }
    ]
  };
};