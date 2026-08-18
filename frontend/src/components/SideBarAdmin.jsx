import { NavLink } from "react-router-dom";
import { Database, LayoutDashboard, ShieldCheck, Users } from "lucide-react";

// แหล่งข้อมูลเมนู admin: path ใช้เปลี่ยน route และ icon ใช้แสดงข้างชื่อเมนู
const ADMIN_SIDEBAR_OPTIONS = [
  {
    label: "Dashboard",
    path: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Verify User",
    path: "/admin/verify-users",
    icon: ShieldCheck,
  },
  {
    label: "User Management",
    path: "/admin/users-management",
    icon: Users,
  },
  {
    label: "Data Management",
    path: "/admin/data-management",
    icon: Database,
  },
];

/**
 * Sidebar สำหรับส่วนผู้ดูแลระบบ
 * รับ options เพิ่มได้เพื่อใช้ทดสอบหรือปรับรายการเมนู
 * แต่ค่าปกติจะใช้เมนู admin ที่ประกาศไว้ด้านบน
 */
const SideBarAdmin = ({ options = ADMIN_SIDEBAR_OPTIONS }) => {
  return (
    <aside className="sticky top-16 flex h-[calc(100vh-4rem)] w-72 shrink-0 self-start flex-col overflow-y-auto border-r border-slate-200/80 bg-slate-50/95 shadow-[4px_0_18px_rgba(15,23,42,0.03)]">
      <div className="px-6 pb-3 pt-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
          Admin menu
        </p>
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-2">
        {/* NavLink เติม style ของเมนู active ตาม URL ปัจจุบันโดยอัตโนมัติ */}
        {options.map(({ label, path, icon }) => {
          const SidebarIcon = icon;

          return (
            // Dashboard ใช้ `end` เพื่อให้ active เฉพาะ /admin ไม่รวม route ลูก
            <NavLink
              key={path}
              to={path}
              end={path === "/admin"}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl border-l-4 px-4 py-3 text-sm font-semibold transition-all duration-200",
                  isActive
                    ? "border-blue-600 bg-white text-blue-600 shadow-sm"
                    : "border-transparent text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm",
                ].join(" ")
              }
            >
              <SidebarIcon
                className="h-[19px] w-[19px] shrink-0"
                aria-hidden="true"
              />
              <span className="truncate">{label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Administrator
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
          Chicken Blood Cell
        </p>
      </div>
    </aside>
  );
};

export default SideBarAdmin;
