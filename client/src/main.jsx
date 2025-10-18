import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Login from './Login.jsx';
import AdminDash from './AdminDash.jsx';
import AdminStore from './AdminStore.jsx';
import AdminStaff from './AdminStaff.jsx';
import AdminInventory from './AdminInventory.jsx';
import AdminReport from './AdminReport.jsx';
import ManagerDash from './ManagerDash.jsx';
import ManagerSalePos from './ManagerSalePos.jsx';
import ManagerInventory from './ManagerInventory.jsx';
import ManagerStaffManage from './ManagerStaffManage.jsx';
import ManagerReport from './ManagerReport.jsx';
import StaffDash from './StaffDash.jsx';
import './index.css';
import { LogoutProvider } from './components/LogoutProvider.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LogoutProvider>
        <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<AdminDash />} />
        <Route path="/admin/store" element={<AdminStore />} />
        <Route path="/admin/staff" element={<AdminStaff />} />
        <Route path="/admin/inventory" element={<AdminInventory />} />
        <Route path="/admin/reports" element={<AdminReport />} />
        <Route path="/manager" element={<ManagerDash />} />
        <Route path="/manager/sales" element={<ManagerSalePos />} />
        <Route path="/manager/inventory" element={<ManagerInventory />} />
        <Route path="/manager/staff" element={<ManagerStaffManage />} />
        <Route path="/manager/reports" element={<ManagerReport />} />
        <Route path="/staff" element={<StaffDash />} />
        </Routes>
      </LogoutProvider>
    </BrowserRouter>
  </React.StrictMode>
);
