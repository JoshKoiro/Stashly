import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import PackageListPage from './pages/PackageListPage';
import PackageDetailPage from './pages/PackageDetailPage';
import CreatePackagePage from './pages/CreatePackagePage';
import CategoryPage from './pages/CategoryPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

// Simple health check component
const HealthCheck: React.FC = () => {
  return <div style={{ display: 'none' }}>OK</div>;
};

// Index component that redirects to packages
const IndexRedirect: React.FC = () => {
  return <Navigate to="/packages" replace />;
};

const App: React.FC = () => {
  return (
    <Router basename="/">
      <div className="app">
        <header className="app-header">
          <div className="app-logo">
            <h1>Stashly</h1>
          </div>
          <nav className="app-nav">
            <ul>
              <li>
                <Link to="/packages">Packages</Link>
              </li>
              <li>
                <Link to="/packages/new">New Package</Link>
              </li>
              <li>
                <Link to="/categories">Categories</Link>
              </li>
            </ul>
          </nav>
        </header>
        
        <main className="app-content">
          <Routes>
            <Route path="/" element={<IndexRedirect />} />
            <Route path="/index.html" element={<IndexRedirect />} />
            <Route path="/packages" element={<PackageListPage />} />
            <Route path="/packages/new" element={<CreatePackagePage />} />
            <Route path="/packages/:id" element={<PackageDetailPage />} />
            <Route path="/categories" element={<CategoryPage />} />
            <Route path="/health" element={<HealthCheck />} />
            <Route path="/health/index.json" element={<HealthCheck />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        
        <footer className="app-footer">
          <p>&copy; {new Date().getFullYear()} Stashly - Package Management System</p>
        </footer>
      </div>
    </Router>
  );
};

export default App; 