import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import InputField from "../components/InputField";
import { loginUser } from "../services/Login";
import { jwtDecode } from "jwt-decode";

const LoginIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-7 h-7"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginUser(form.email, form.password);

      //เก็บ token
      localStorage.setItem("access_token", data.access_token);

      const decodedToken = jwtDecode(data.access_token);

      //เก็บ user สำหรับแสดงใน Navbar
      localStorage.setItem(
        "user",
        JSON.stringify({
          name: decodedToken.first_name + " " + decodedToken.last_name,
          role: decodedToken.role,
          profileImage: decodedToken.profile_image ?? null,
          email: decodedToken.email,
        }),
      );

      navigate("/profile");
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Email, password incorrect or identity not yet verified.");
      } else {
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center py-8"
      style={{ backgroundImage: "url('/assets/Background.png')" }}
    >
      <AuthCard
        icon={<LoginIcon />}
        title="Sign in with email"
        subtitle={
          <>
            Your smart lab assistant for analyzing chicken blood
            <br />
            powered by deep learning.
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            icon="email"
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <InputField
            icon="lock"
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          {/* แสดง error */}
          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-700 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm rounded-xl py-2 transition-all duration-150 mt-2"
          >
            {loading ? "Signing in..." : "Get Started"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          Don&apos;t have an account?{" "}
          <button
            onClick={() => navigate("/register")}
            className="text-blue-500 font-medium hover:underline"
          >
            Sign up
          </button>
        </p>
      </AuthCard>
    </div>
  );
}
