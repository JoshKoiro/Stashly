import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <h1>Stashly</h1>
        </Link>
        <nav className="main-nav">
          <ul>
            <li>
              <Link to="/packages">Packages</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header; 