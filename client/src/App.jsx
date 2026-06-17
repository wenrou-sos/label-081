import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Stores from './pages/Stores.jsx'
import Services from './pages/Services.jsx'
import MemberLevels from './pages/MemberLevels.jsx'
import Members from './pages/Members.jsx'
import MemberAnalysis from './pages/MemberAnalysis.jsx'
import Inventory from './pages/Inventory.jsx'
import EmployeePerformance from './pages/EmployeePerformance.jsx'
import Employees from './pages/Employees.jsx'
import Orders from './pages/Orders.jsx'
import ShiftReports from './pages/ShiftReports.jsx'
import ShiftReportDetail from './pages/ShiftReportDetail.jsx'
import { getToken } from './services/api.js'

function ProtectedRoute({ children }) {
  const token = getToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="stores" element={<Stores />} />
        <Route path="services" element={<Services />} />
        <Route path="member-levels" element={<MemberLevels />} />
        <Route path="members" element={<Members />} />
        <Route path="member-analysis" element={<MemberAnalysis />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="employee-performance" element={<EmployeePerformance />} />
        <Route path="employees" element={<Employees />} />
        <Route path="orders" element={<Orders />} />
        <Route path="shift-reports" element={<ShiftReports />} />
        <Route path="shift-reports/:id" element={<ShiftReportDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
