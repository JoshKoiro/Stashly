import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import components
import Header from './components/Header';

// Placeholder pages
const PackageListPage: React.FC = () => <div>Package List Page</div>;
const PackageDetailPage: React.FC = () => <div>Package Detail Page</div>;
const NotFoundPage: React.FC = () => <div>404 - Page Not Found</div>;

const App: React.FC = () => {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/packages" replace />} />
          <Route path="/packages" element={<PackageListPage />} />
          <Route path="/packages/:id" element={<PackageDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App; 