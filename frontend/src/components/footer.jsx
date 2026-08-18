const Footer = ({ className = "mt-16" }) => {
  return (
    <footer className={`${className} border-t border-gray-200 bg-white px-8 py-6`}>
      <div className="flex flex-col md:flex-row md:justify-between gap-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-500">CBC - VET</h3>
          <p className="mt-1.5 max-w-[280px] text-xs text-gray-400 leading-relaxed">
            An artificial intelligence (AI) blood cell analysis tool
            developed for research and education in avian health.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500">Disclaimer</h3>
          <p className="mt-1.5 max-w-[380px] text-xs text-gray-400 leading-relaxed">
            Results are for diagnostic support only and must be verified
            through expert clinical judgment before any decision is made. The
            developer assumes no responsibility for use without such
            verification.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-500">Development team</h3>
          <p className="mt-1.5 max-w-[230px] text-xs text-gray-400 leading-relaxed">
            B.Eng. student, Computer Engineering, Walailak University
          </p>
        </div>

      </div>

      <hr className="mt-6 border-gray-200" />

      <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        <span className="text-xs text-gray-400">
          ©2026 Avian Blood. All rights reserved.
        </span>
        <span className="text-xs text-gray-400">
          Prediction results are for educational purposes only.
        </span>
      </div>
    </footer>
  );
};

export default Footer;