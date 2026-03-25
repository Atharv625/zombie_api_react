import React, { useEffect, useState } from "react";
import Header from "../components/Header";

const Reports = () => {
  const [api, setApi] = useState(null);

  useEffect(() => {
    const data = sessionStorage.getItem("selectedApi");

    if (data) {
      setApi(JSON.parse(data));
    }
  }, []);

  if (!api) return <div>No API selected</div>;

  return (
    <div>
      <Header />

      <main className="page-wrapper">
        <div className="panel">
          <h2>{api.endpoint}</h2>
          <p>Status: {api.status}</p>
          <p>Risk Score: {api.risk}</p>
        </div>

        <div className="panel">
          <h3>AI Recommendation</h3>
          <p>This API is risky. Consider blocking or adding authentication.</p>
        </div>
      </main>
    </div>
  );
};

export default Reports;
