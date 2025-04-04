import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Header: React.FC = () => {
  const [searchParams] = useSearchParams();
  // Initialize search input state from URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      params.set('search', searchQuery.trim());
    } else {
      params.delete('search');
    }
    // Reset page to 1 when performing a new search
    params.set('page', '1');
    navigate(`/?${params.toString()}`);
  };

  // Sync input field if user navigates back/forward
  React.useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  return (
    <header>
      <div className="container header-content">
        <Link to="/" className="logo">
          {/* <i className="fas fa-box"></i> */}
          <img src="/src/frontend/assets/logo.png" alt="Stashly Logo" className="logo-image" />
          Stashly
        </Link>
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search packages or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" aria-label="Search">
            <i className="fas fa-search"></i>
          </button>
        </form>
        <div className="user-actions">
          {/* Theme Toggle Button */}
          <button onClick={toggleTheme} className="theme-toggle-btn" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
            <i className={theme === 'light' ? 'fas fa-moon' : 'fas fa-sun'}></i>
          </button>
          {/* <button>
            <i className="fas fa-bell"></i>
          </button>
          <button>
            <i className="fas fa-cog"></i>
          </button> */}
          <Link to="/print-qr" className="add-btn">
            <i className="fas fa-qrcode"></i>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header; 