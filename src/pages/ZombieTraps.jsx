import React from "react";
import Header from "../components/Header";

const ZombieTraps = () => {
  return (
    <div>
      <Header />

      <main className="page-wrapper">
        <p className="section-title">Zombie Traps</p>

        <div className="panel">
          <h3>Active Traps: 12</h3>
          <p>Monitoring malicious API access</p>
        </div>
      </main>
    </div>
  );
};

export default ZombieTraps;
