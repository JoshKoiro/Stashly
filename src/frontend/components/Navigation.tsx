import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Package } from '../../backend/db/schema';

interface NavItem {
  id: string;
  label: string;
  filter?: string;
}

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Set initial active item based on URL search param
  const activeFilter = searchParams.get('location');
  const [activeItem, setActiveItem] = useState(activeFilter || 'all');
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    // Update active item if URL search param changes externally
    const currentFilter = searchParams.get('location');
    setActiveItem(currentFilter || 'all');
  }, [searchParams]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        // Fetch from the new dedicated endpoint
        const response = await fetch('/api/locations');
        if (!response.ok) throw new Error('Failed to fetch locations');
        // The response is now directly an array of strings
        const uniqueLocations: string[] = await response.json();
        setLocations(uniqueLocations);
      } catch (error) {
        console.error('Error fetching locations:', error);
        // Optionally set an error state here to display to the user
      }
    };

    fetchLocations();
  }, []);

  // Only show navigation on the main page
  if (location.pathname !== '/') {
    return null;
  }

  const navItems: NavItem[] = [
    { id: 'all', label: 'All Packages' },
    ...locations.map(loc => ({
      id: loc.toLowerCase().replace(/\s+/g, '-'),
      label: loc,
      filter: loc
    }))
  ];

  const handleNavClick = (item: NavItem) => {
    setActiveItem(item.id);
    if (item.filter) {
      navigate(`/?location=${encodeURIComponent(item.filter)}`);
    } else {
      // Navigate to root path without search params for 'All Packages'
      navigate('/');
    }
  };

  return (
    <nav className="main-nav">
      <div className="container nav-content">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => handleNavClick(item)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
