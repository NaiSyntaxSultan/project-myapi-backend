export default function AuthCard({ icon, title, subtitle, children }) {
  return (
      <div className="bg-gradient-to-b from-blue-300/90 to-white/95 backdrop-blur-md rounded-3xl shadow-xl px-10 py-10 w-full max-w-[360px] mx-4">

        {/* Icon */}
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 bg-white rounded-2xl shadow flex items-center justify-center text-gray-800">
            {icon}
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-center text-2xl font-bold text-gray-900 mb-1">{title}</h1>
        <p className="text-center text-xs text-gray-500 mb-4 leading-relaxed">{subtitle}</p>

        {children}
      </div>
  );
}