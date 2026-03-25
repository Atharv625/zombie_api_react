import React from "react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header>
      <div className="logo">ALIE</div>

      <nav>
        <Link to="/">Dashboard</Link>
        <Link to="/reports">Reports</Link>
        <Link to="/zombie-traps">ZombieTraps</Link>
      </nav>

      <div className="threat-badge">THREAT DETECTED</div>
    </header>
  );
};

export default Header;
