import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Welcome from "./pages/welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Prediction from "./pages/Prediction";
import Profile from "./pages/Profile";
import PredictionLogsPage from "./pages/PredictionOutput";
import PredictionDetail from "./pages/PredictionDetail";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUserManagement from "./pages/admin/UserManagement";
import AdminVerifyUser from "./pages/admin/VerifyUser";
import AdminDataManagement from "./pages/admin/DataManagement";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/case-library" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="/prediction" element={<ProtectedRoute><Prediction /></ProtectedRoute>} />
        <Route path="/prediction/output" element={<ProtectedRoute><PredictionLogsPage /></ProtectedRoute>} />

        {/*ชั่วคราว */}
        <Route path="/prediction/:id" element={<ProtectedRoute><PredictionDetail /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users-management" element={<AdminUserManagement />} />
          <Route path="verify-users" element={<AdminVerifyUser />} />
          <Route path="data-management" element={<AdminDataManagement />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
