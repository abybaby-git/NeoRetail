import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Login from './Login.jsx';
import AdminDash from './AdminDash.jsx';
import AdminStore from './AdminStore.jsx';
import AdminStaff from './AdminStaff.jsx';
import ManagerDash from './ManagerDash.jsx';
import StaffDash from './StaffDash.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDash />} />
        <Route path="/admin/store" element={<AdminStore />} />
        <Route path="/admin/staff" element={<AdminStaff />} />
        <Route path="/manager" element={<ManagerDash />} />
        <Route path="/staff" element={<StaffDash />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
