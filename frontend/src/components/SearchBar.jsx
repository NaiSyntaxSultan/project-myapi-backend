// SearchBar.jsx
//
// Component เดียวใช้กับ 3 หน้า เลือกโหมดผ่าน prop `variant`:
//
//   variant="home"     → หน้า Home
//                         placeholder: "Search by province name and uploader name."
//                         filters: Chicken type, Sort by Date
//
//   variant="profile"  → หน้า Profile
//                         placeholder: "Search for smear ID."
//                         filters: Chicken type, Stain type, Sort by Date
//
//   variant="predict"  → หน้า Predict
//                         placeholder: "Search for smear ID."
//                         filters: Chicken type, Sort by Date
//
// ทุกตัวกรอง (chicken type / stain type / date sort) และ placeholder
// override ได้อิสระผ่าน props เผื่อบางหน้าอยากปรับเพิ่มจาก default
//
// วิธีใช้:
//   <SearchBar variant="home" onSearch={(query) => ...} />
//   <SearchBar variant="profile" onSearch={(result) => ...} />
//   <SearchBar variant="predict" onSearch={(result) => ...} />

import React, { useState, useRef, useEffect } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────
const SearchIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);
const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M3 5L7 9L11 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect
      x="1.5"
      y="2.5"
      width="12"
      height="11"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.3"
    />
    <path
      d="M1.5 6H13.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <path
      d="M5 1V4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <path
      d="M10 1V4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);
const ChevronLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M9 2L4 7L9 12"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path
      d="M5 2L10 7L5 12"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const XSmallIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path
      d="M1 1L9 9M9 1L1 9"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const MapPinIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const BirdIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 7h.01"/>
    <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/>
    <path d="m20 7 2 .5-2 .5"/>
    <path d="M10 18v3"/>
    <path d="M14 17.75V21"/>
    <path d="M7 18a6 6 0 0 0 3.84-10.61"/>
  </svg>
);

const StainIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>
  </svg>
);

// ─── Constants ────────────────────────────────────────────────────────────────
const CHICKEN_TYPES = ["All breeds", "Laying hen", "Native chicken"];
const STAIN_TYPES = ["All types", "Wright Stain", "Giemsa Stain"];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const PROVINCES = [
  "All provinces",
  "Bangkok",
  "Amnat Charoen",
  "Ang Thong",
  "Bueng Kan",
  "Buriram",
  "Chachoengsao",
  "Chai Nat",
  "Chaiyaphum",
  "Chanthaburi",
  "Chiang Mai",
  "Chiang Rai",
  "Chonburi",
  "Chumphon",
  "Kalasin",
  "Kamphaeng Phet",
  "Kanchanaburi",
  "Khon Kaen",
  "Krabi",
  "Lampang",
  "Lamphun",
  "Loei",
  "Lopburi",
  "Mae Hong Son",
  "Maha Sarakham",
  "Mukdahan",
  "Nakhon Nayok",
  "Nakhon Pathom",
  "Nakhon Phanom",
  "Nakhon Ratchasima",
  "Nakhon Sawan",
  "Nakhon Si Thammarat",
  "Nan",
  "Narathiwat",
  "Nong Bua Lamphu",
  "Nong Khai",
  "Nonthaburi",
  "Pathum Thani",
  "Pattani",
  "Phang Nga",
  "Phatthalung",
  "Phayao",
  "Phetchabun",
  "Phetchaburi",
  "Phichit",
  "Phitsanulok",
  "Phrae",
  "Phra Nakhon Si Ayutthaya",
  "Phuket",
  "Prachinburi",
  "Prachuap Khiri Khan",
  "Ranong",
  "Ratchaburi",
  "Rayong",
  "Roi Et",
  "Sa Kaeo",
  "Sakon Nakhon",
  "Samut Prakan",
  "Samut Sakhon",
  "Samut Songkhram",
  "Saraburi",
  "Satun",
  "Sing Buri",
  "Si Sa Ket",
  "Songkhla",
  "Sukhothai",
  "Suphan Buri",
  "Surat Thani",
  "Surin",
  "Tak",
  "Trang",
  "Trat",
  "Ubon Ratchathani",
  "Udon Thani",
  "Uthai Thani",
  "Uttaradit",
  "Yala",
  "Yasothon",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function isSameDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Dropdown (ใช้ร่วมกันทุก variant) ──────────────────────────────────────────
function Dropdown({ options, value, onChange, width = "w-[168px]", icon }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={`relative flex-shrink-0 ${width}`} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center bg-white border border-gray-200 rounded-lg px-3 h-[38px] text-[12.5px] text-gray-600 font-medium cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm w-full"
      >
        {icon && (
          <span className="text-gray-400 mr-1.5 flex items-center shrink-0">
            {icon}
          </span>
        )}

        <span className="truncate max-w-[calc(100%-40px)] text-left">{value}</span>
        <span
          className={`absolute right-3 text-gray-400 flex items-center shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <ChevronDownIcon />
        </span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+5px)] left-0 bg-white rounded-lg min-w-[140px] shadow-lg border border-gray-100 z-50 overflow-hidden">
          <style>{`
            .dd-scroll::-webkit-scrollbar { width: 5px; }
            .dd-scroll::-webkit-scrollbar-track { background: transparent; }
            .dd-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
            .dd-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
            .dd-scroll { scrollbar-width: thin; scrollbar-color: #d1d5db transparent; }
          `}</style>
          <div className="max-h-[300px] overflow-y-auto dd-scroll">
            {options.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`px-3.5 py-1.5 text-[12.5px] cursor-pointer transition-colors ${
                  value === opt
                    ? "text-blue-500 font-semibold bg-blue-50"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-500"
                }`}
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Calendar Picker (ใช้ร่วมกันทุก variant) ───────────────────────────────────
function CalendarPicker({ startDate, endDate, onChange, onApply }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [hovered, setHovered] = useState(null);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const handleDayClick = (day) => {
    const clicked = new Date(viewYear, viewMonth, day);
    if (!startDate || (startDate && endDate)) {
      onChange({ start: clicked, end: null });
    } else {
      if (clicked < startDate) onChange({ start: clicked, end: startDate });
      else onChange({ start: startDate, end: clicked });
    }
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysCount = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) cells.push(d);

  const fmtLabel = (d) =>
    d
      ? `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
      : null;

  return (
    <div className="absolute top-[calc(100%+8px)] right-0 z-[300] w-[272px] bg-white rounded-2xl border border-gray-100 p-4 pb-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.13),0_1px_6px_rgba(0,0,0,0.06)] animate-[calFadeIn_0.14s_ease]">
      <style>{`@keyframes calFadeIn { from { opacity:0; transform:translateY(-5px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-2.5">
        <button
          className="flex items-center text-gray-500 bg-transparent border-none cursor-pointer p-1.5 px-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={prevMonth}
        >
          <ChevronLeftIcon />
        </button>
        <span className="text-[13.5px] font-semibold text-gray-900">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          className="flex items-center text-gray-500 bg-transparent border-none cursor-pointer p-1.5 px-2 rounded-lg hover:bg-gray-100 transition-colors"
          onClick={nextMonth}
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center text-[10.5px] font-semibold text-gray-300 pb-1.5 pt-0.5"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`emp-${i}`} />;
          const date = new Date(viewYear, viewMonth, day);
          const isStart = isSameDay(date, startDate);
          const isEnd = isSameDay(date, endDate);
          const isToday = isSameDay(date, today);
          const hovDate = hovered
            ? new Date(viewYear, viewMonth, hovered)
            : null;
          const rangeEnd = endDate || hovDate;
          const lo =
            startDate && rangeEnd
              ? startDate < rangeEnd
                ? startDate
                : rangeEnd
              : null;
          const hi =
            startDate && rangeEnd
              ? startDate < rangeEnd
                ? rangeEnd
                : startDate
              : null;
          const inRange = lo && hi && date > lo && date < hi;

          return (
            <button
              key={`${viewYear}-${viewMonth}-${day}`}
              className={[
                "aspect-square flex items-center justify-center text-[12px] font-medium border-none cursor-pointer transition-colors duration-100",
                isStart || isEnd
                  ? "bg-blue-500 text-white font-semibold rounded-lg"
                  : inRange
                    ? "bg-blue-100 text-blue-700 rounded-none"
                    : isToday
                      ? "text-blue-500 font-bold bg-transparent rounded-lg hover:bg-blue-50"
                      : "text-gray-700 bg-transparent rounded-lg hover:bg-blue-50 hover:text-blue-500",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => setHovered(day)}
              onMouseLeave={() => setHovered(null)}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <span className="block text-center text-[11px] text-gray-400 mb-2.5 tracking-wide">
          {fmtLabel(startDate) || "Start date"} →{" "}
          {fmtLabel(endDate) || "End date"}
        </span>
        <div className="flex gap-1.5">
          <button
            className="flex-1 h-8 border border-gray-200 bg-transparent rounded-lg font-[inherit] text-xs text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => onChange({ start: null, end: null })}
          >
            Clear
          </button>
          <button
            className="flex-1 h-8 bg-blue-500 border-none rounded-lg font-[inherit] text-xs font-semibold text-white cursor-pointer hover:bg-blue-600 transition-colors disabled:bg-blue-200 disabled:cursor-default"
            onClick={onApply}
            disabled={!startDate}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// ตัวเลือกช่วงวันที่แบบเดียวกับหน้า Home สำหรับนำไปใช้ในหน้าอื่น
export function DateRangeFilter({ onChange, label = "Sort by Date" }) {
  const [showCal, setShowCal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const calRef = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (calRef.current && !calRef.current.contains(event.target)) {
        setShowCal(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fmtShort = (date) =>
    `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  const hasDate = Boolean(dateRange.start);
  const buttonLabel = hasDate
    ? `${fmtShort(dateRange.start)}${
        dateRange.end ? ` – ${fmtShort(dateRange.end)}` : ""
      }`
    : label;

  const handleChange = (range) => {
    setDateRange(range);
    onChange?.(range.start ? range : null);
  };

  const clearDate = (event) => {
    event.stopPropagation();
    handleChange({ start: null, end: null });
    setShowCal(false);
  };

  return (
    <div className="relative flex-shrink-0" ref={calRef}>
      <button
        type="button"
        className={[
          "flex h-[38px] items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 font-[inherit] text-[13.5px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-colors duration-[130ms]",
          hasDate
            ? "border-blue-300 bg-blue-50 text-blue-600"
            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50",
        ].join(" ")}
        onClick={() => setShowCal((visible) => !visible)}
        aria-expanded={showCal}
        aria-label="Filter by date range"
      >
        <span
          className={`flex items-center ${
            hasDate ? "text-blue-400" : "text-gray-400"
          }`}
        >
          <CalendarIcon />
        </span>
        {buttonLabel}
        {hasDate && (
          <span
            className="ml-0.5 flex items-center rounded p-0.5 text-gray-400 transition-colors hover:text-red-500"
            onClick={clearDate}
            role="button"
            aria-label="Clear date range"
          >
            <XSmallIcon />
          </span>
        )}
      </button>

      {showCal && (
        <CalendarPicker
          startDate={dateRange.start}
          endDate={dateRange.end}
          onChange={handleChange}
          onApply={() => setShowCal(false)}
        />
      )}
    </div>
  );
}

// ─── Main SearchBar ───────────────────────────────────────────────────────────
//
// Props:
//  variant             "home" | "profile" | "predict"   เลือก preset ของ filter/placeholder/รูปแบบ callback
//  showChickenType     ซ่อน/แสดง dropdown ชนิดไก่ (default: true ทุก variant)
//  showStainType       ซ่อน/แสดง dropdown Stain    (default: true เฉพาะ variant="profile")
//  showDateSort        ซ่อน/แสดงตัวกรองวันที่       (default: true ทุก variant)
//  placeholder         ข้อความ placeholder ของช่องค้นหา (มี default ต่อ variant)
//  onSearch            callback ตอนกดค้นหา / กด Enter
//                        - variant="home":    onSearch(queryString)
//                        - variant="profile" / "predict": onSearch({ query, chickenType, stainType, dateRange })
//  onFilterChickenType onSortChange   callback ย่อยตามตัวกรองแต่ละตัว (optional, ยิงทันทีตอนเปลี่ยนค่า)
//  className           class เพิ่มเติมของ container นอกสุด
const SearchBar = ({
  variant = "home",
  showChickenType,
  showStainType,
  showDateSort = true,
  placeholder,
  onSearch,
  onChange,
  onFilterProvince,
  onFilterChickenType,
  onFilterStainType,
  onSortChange,
  className = "",
}) => {
  // ── ค่า default ต่อ variant ──────────────────────────────────────────────
  const isHome = variant === "home";
  const resolvedShowChickenType = showChickenType ?? true;
  const resolvedShowStainType = showStainType ?? variant === "profile";
  const resolvedPlaceholder =
    placeholder ??
    (isHome ? "Search by uploader name." : "Search for smear ID.");

  // ── State ────────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("Province");
  const [chickenType, setChickenType] = useState("Chicken breed");
  const [stainType, setStainType] = useState("Stain Type");
  const [showCal, setShowCal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  const calRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (calRef.current && !calRef.current.contains(e.target))
        setShowCal(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (overrideQuery = null, overrideProvince = null) => {
    const currentQuery = overrideQuery !== null ? overrideQuery : query;
    const currentProvince = overrideProvince !== null ? overrideProvince : province;

    const resolvedChickenType =
      chickenType === "Chicken breed" || 
      chickenType === "Chicken type" ||
      chickenType === "All breeds" ||
      chickenType === "All types" ||
      chickenType === "Breed"
        ? null
        : chickenType;

    const resolvedStainType =
      stainType === "Stain Type" || stainType === "All types"
        ? null
        : stainType;

    if (isHome) {
      const resolvedProvince =
        currentProvince === "Province" || currentProvince === "All provinces"
          ? null
          : currentProvince;
      onSearch?.({
        query: currentQuery,
        province: resolvedProvince,
        chickenType: resolvedChickenType,
      });
    } else {
      onSearch?.({
        query: currentQuery,
        chickenType: resolvedChickenType,
        stainType: resolvedStainType,
        dateRange,
      });
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const fmtShort = (d) =>
    `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  const hasDate = !!dateRange.start;
  const dateBtnLabel = hasDate
    ? `${fmtShort(dateRange.start)}${dateRange.end ? ` – ${fmtShort(dateRange.end)}` : ""}`
    : "Sort by Date";

  const handleDateChange = (range) => {
    setDateRange(range);
    onSortChange?.(range.start ? range : null);
  };

  const clearDate = (e) => {
    e.stopPropagation();
    setDateRange({ start: null, end: null });
    onSortChange?.(null);
    setShowCal(false);
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center gap-3 w-full ${
  variant === "profile" ? "" : variant === "home" ? "max-w-5xl" : "max-w-4xl"
} ${className}`}
    >
      {/* Search Input + Button */}
      <div className="flex flex-1 w-full items-center gap-2">
        <div className="flex flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="flex items-center pl-4 text-gray-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={query}
            onChange={
              (e) => {
                const val = e.target.value;
                setQuery(val); 
                onChange?.(val);
                handleSearch(val);
              }
            }
            onKeyDown={handleKeyDown}
            placeholder={resolvedPlaceholder}
            className="flex-1 px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
          />
        </div>
        <button
          onClick={handleSearch}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 text-sm font-medium rounded-lg shadow-sm transition-colors duration-150 shrink-0"
        >
          Search
        </button>
      </div>

      {/* Province Filter — เฉพาะหน้า Home */}
      {isHome && (
        <Dropdown
        icon={<MapPinIcon />}
          options={PROVINCES}
          value={province}
          onChange={(val) => {
            setProvince(val);
            const resolvedProv = (val === "All provinces" || val === "Province") ? null : val;
            onFilterProvince?.(resolvedProv);
            handleSearch(query, val);
          }}
        />
      )}

      {/* Chicken Type Filter */}
      {resolvedShowChickenType && (
        <Dropdown
        icon={<BirdIcon />}
          options={CHICKEN_TYPES}
          value={chickenType}
          onChange={(val) => {
            setChickenType(val);
            onFilterChickenType?.(val);
          }}
        />
      )}

      {/* Stain Type Filter (variant="profile") */}
      {resolvedShowStainType && (
        <Dropdown
        icon={<StainIcon />}
          options={STAIN_TYPES}
          value={stainType}
          onChange={(val) => {
            setStainType(val);
            onFilterStainType?.(val);
          }}
        />
      )}

      {/* Date Picker — Calendar Popup */}
      {showDateSort && (
        <div className="relative flex-shrink-0" ref={calRef}>
          <button
            className={[
              "flex items-center gap-1.5 border rounded-lg px-3 h-[38px] font-[inherit] text-[13.5px] font-medium cursor-pointer whitespace-nowrap transition-colors duration-[130ms] shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
              hasDate
                ? "bg-blue-50 border-blue-300 text-blue-600"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50",
            ].join(" ")}
            onClick={() => setShowCal((v) => !v)}
          >
            <span
              className={`flex items-center ${hasDate ? "text-blue-400" : "text-gray-400"}`}
            >
              <CalendarIcon />
            </span>
            {dateBtnLabel}
            {hasDate && (
              <span
                className="flex items-center p-0.5 ml-0.5 rounded text-gray-400 hover:text-red-500 transition-colors"
                onClick={clearDate}
              >
                <XSmallIcon />
              </span>
            )}
          </button>

          {showCal && (
            <CalendarPicker
              startDate={dateRange.start}
              endDate={dateRange.end}
              onChange={handleDateChange}
              onApply={() => setShowCal(false)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
