import { useNavigate, useLocation } from "react-router-dom";
import logo from "/assets/Chicken-CBC.png";

const API_BASE_URL = "http://localhost/api";

function resolveProfileImage(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

// ── สร้างตัวย่อจากชื่อที่สมัคร ──────────────────────────────
// "Somchai Jaidee" → "SJ" | "Dr.strang" → "DS" | "Alice" → "AL"
function getInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  const clean = name.replace(/[^a-zA-Zก-๙]/g, "");
  return clean.slice(0, 2).toUpperCase();
}

// ── Avatar: ถ้าไม่มีรูปจะแสดงตัวย่อชื่อแทน ──────────────────
function Avatar({ name, profileImage }) {
  if (profileImage) {
    return (
      <img src={profileImage} alt={name} className="w-8 h-8 rounded-full object-cover" />
    );
  }
  return (
    <div
      className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold select-none"
      style={{ background: "#b8d4e8", color: "#1a3a5c" }}
    >
      {getInitials(name)}
    </div>
  );
}

// ── Nav links + route ────────────────────────────────────────
const NAV_LINKS = [
  { label: "My Cases", path: "/profile" },
  { label: "Upload", path: "/upload" },
  { label: "Prediction", path: "/prediction" },
  { label: "Case Library", path: "/case-library" },
];

// ── Navbar Component ─────────────────────────────────────────
const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ดึง user จาก localStorage ที่ Login/Register save ไว้
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const handleNav = (path) => {
    navigate(path); // เปลี่ยนหน้า
  };

  const handleSignOut = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <nav className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="flex items-center justify-between h-16 px-8 relative">
        {/* ── ซ้าย: Logo + Brand ── */}
        <div
          className="flex items-center cursor-pointer"
          onClick={() => handleNav("/profile")}
        >
          <img
            src={logo}
            alt="CBC Medical Logo"
            className="w-16 h-16 object-contain"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-gray-900 tracking-wide">
              CBC - VET
            </span>
            <span className="text-[10px] text-gray-400 tracking-wide">
              Avian Blood Cell Classification
            </span>
          </div>
        </div>

        {/* ── กลาง: Nav Links ── */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-10">
          {NAV_LINKS.map(({ label, path }) => (
            <button
              key={label}
              onClick={() => handleNav(path)}
              className={`text-sm font-medium transition-colors duration-150 ${
                location.pathname === path
                  ? "text-blue-500"
                  : "text-gray-600 hover:text-blue-400"
              }`}
            >
              {label}
            </button>
          ))}
          {/* Admin จะเห็นก็ต่อเมื่อ role เป็น admin เท่านั้น */}
          {user?.role === "admin" && (
            <button
              onClick={() => handleNav("/admin")}
              className={`text-sm font-medium transition-colors duration-150 ${
                location.pathname.startsWith("/admin")
                  ? "text-blue-500"
                  : "text-gray-600 hover:text-blue-400"
              }`}
            >
              Admin
            </button>
          )}
        </div>

        {/* ── ขวา: Globe + User ── */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => handleNav("/profile")}
              >
                <Avatar
                  name={user.name}
                  profileImage={resolveProfileImage(user.profileImage)}
                />
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold text-gray-800">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-gray-400">{user.role}</span>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-300" />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1 rounded-full border border-gray-300 bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign out
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Not logged in</span>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
