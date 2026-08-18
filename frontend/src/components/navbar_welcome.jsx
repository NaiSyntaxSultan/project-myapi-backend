import { useNavigate } from "react-router-dom";
import logo from "/assets/Chicken-CBC.png";

const NavbarWelcome = () => {
  const navigate = useNavigate(); 
  return (
    <nav className="flex items-center justify-between px-8 h-16 bg-white shadow-sm sticky top-0 z-50">
      <div className="flex items-center">
        <img
          src={logo}
          alt="CBC Medical Logo"
          className="w-16 h-16 object-contain"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-gray-900 tracking-wide font-playfair">
            CBC - VET
          </span>
          <span className="text-[10px] text-gray-400 tracking-wide">
            Avian Blood Cell Classification
          </span>
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <span className="text-base font-medium text-gray-700 tracking-wide">
          Welcome To AvianBlood
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/register")}
          className="border border-[#1b2a3b] text-[#1b2a3b] text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-gray-100 active:scale-95 transition-all duration-150 cursor-pointer tracking-wide"
        >
          Sign up
        </button>
        <button
          onClick={() => navigate("/login")}
          className="bg-[#1b2a3b] text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-[#0f1e2d] active:scale-95 transition-all duration-150 cursor-pointer shadow-sm tracking-wide"
        >
          Sign in
        </button>
      </div>
    </nav>
  );
};

export default NavbarWelcome;