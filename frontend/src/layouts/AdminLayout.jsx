import { Outlet } from "react-router-dom";
import SideBarAdmin from "../components/SideBarAdmin";
import Navbar from "../components/navbar";

/**
 * Layout กลางของทุก route ฝั่ง admin
 * Navbar และ Sidebar ใช้ร่วมกันทุกหน้า ส่วน Outlet คือพื้นที่ที่ React Router
 * นำ Dashboard, Verify User, User Management หรือ Data Management มาแสดง
 */
function AdminLayout() {
  return (
    <div className="min-h-screen bg-[url('/assets/Background.png')] bg-cover">
      <Navbar />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <SideBarAdmin />
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
