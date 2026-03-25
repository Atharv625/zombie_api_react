import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

const Dashboard = () => {
  const navigate = useNavigate();
  const [apis, setApis] = useState([]);

  useEffect(() => {
    // simulate your script.js data
    const data = [
      { id: 1, endpoint: "/api/v1/users", status: "active", risk: 20 },
      { id: 2, endpoint: "/api/legacy/payments", status: "zombie", risk: 92 },
    ];
    setApis(data);
  }, []);

  const openDetails = (api) => {
    sessionStorage.setItem("selectedApi", JSON.stringify(api));
    navigate("/reports");
  };

  return (
    <div>
      <Header />

      <main className="page-wrapper">
        <p className="section-title">API Registry</p>

        <div className="panel">
          <table>
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {apis.map((api) => (
                <tr key={api.id}>
                  <td>{api.endpoint}</td>
                  <td>{api.status}</td>
                  <td>{api.risk}</td>
                  <td>
                    <button
                      className="btn btn-primary"
                      onClick={() => openDetails(api)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
