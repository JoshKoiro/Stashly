import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Navigation from './components/Navigation';
import PackageList from './components/PackageList';
import PackageDetail from './components/PackageDetail';
import QRCodePrinting from './components/QRCodePrinting';

const App: React.FC = () => {
  return (
    <div className="app">
      <Header />
      <Navigation />
      <main className="container">
        <Routes>
          <Route path="/" element={<PackageList />} />
          <Route path="/packages/:id" element={<PackageDetail />} />
          <Route path="/print-qr" element={<QRCodePrinting />} />
        </Routes>
      </main>
    </div>
  );
};

export default App; 