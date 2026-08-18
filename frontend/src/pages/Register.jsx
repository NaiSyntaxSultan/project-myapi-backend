import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard";
import InputField from "../components/InputField";
import { registerVet } from "../services/Register";

const RegisterIcon = () => (
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
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);

export default function Register() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    isVet: false,
    licenseNumber: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
    if (!passwordRegex.test(form.password)) {
      setError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const result = await registerVet({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
      confirmPassword: form.confirmPassword,
      veterinaryLicense: form.isVet ? form.licenseNumber : "",
    });

    if (result.success) {
      setNotification(true);
      setTimeout(() => {
        navigate("/login");
      }, 4000);
    } else {
      setError(result.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center py-8"
      style={{ backgroundImage: "url('/assets/Background.png')" }}
    >
      {/* Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 max-w-sm bg-white border border-gray-300 shadow-lg rounded-xl px-5 py-4 flex items-start gap-3">
          <div className="text-green-500 mt-0.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-700">
              Registration Successful!
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Please wait for account verification.
              <br />
              You will receive an email notification once your account has been verified.
            </p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="ml-auto text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}
      <AuthCard
        icon={<RegisterIcon />}
        title="Sign up with email"
        subtitle={
          <>
            Create your account and start exploring smarter
            <br />
            blood analysis.
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <InputField
                icon="user"
                type="text"
                name="firstName"
                placeholder="First Name"
                value={form.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="min-w-0 flex-1">
              <InputField
                icon="user"
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>
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
          <InputField
            icon="lock"
            type="password"
            name="confirmPassword"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          {/* Veterinary Professional Toggle */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setForm((p) => ({ ...p, isVet: !p.isVet }))}
                className={`relative w-10 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 cursor-pointer ${
                  form.isVet ? "bg-blue-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    form.isVet ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
              <span className="text-sm font-medium text-blue-600">
                I am a Veterinary Professional
              </span>
            </label>

            {form.isVet && (
              <div>
                <input
                  type="text"
                  name="licenseNumber"
                  placeholder="Veterinary license number"
                  value={form.licenseNumber}
                  onChange={handleChange}
                  className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-300 transition-all"
                />
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-xs text-center pt-1">{error}</p>}

          <button
            type="submit"
            className="w-full bg-gray-900 hover:bg-gray-700 active:scale-[0.98] text-white font-semibold text-sm rounded-xl py-2 transition-all duration-150 mt-2"
          >
            Create Account
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-5">
          Already have account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-blue-500 font-medium hover:underline"
          >
            Sign in
          </button>
        </p>
      </AuthCard>
    </div>
  );
}
