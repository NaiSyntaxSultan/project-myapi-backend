import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { getPendingBatches } from "../services/Prediction";
import { getImageUrl } from "../services/api";
import Searchbar from "../components/SearchBar";

// แปลง Date object -> string "YYYY-MM-DD" ตามฟอร์แมตที่ backend ต้องการ
const formatDate = (d) => {
  if (!d) return undefined;
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return undefined;

  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

function SampleCardSkeleton() {
  return (
    <div className="bg-white rounded-md shadow-sm border border-gray-100 overflow-hidden mb-3 p-3 animate-pulse">
      <div className="flex items-center gap-6">
        {/* Skeleton รูปภาพ */}
        <div className="flex-shrink-0 w-[146px] h-[120px] bg-gray-200 rounded-md" />
        {/* Skeleton รายละเอียด */}
        <div className="flex-1 space-y-2 py-1">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
          <div className="h-3 bg-gray-200 rounded w-1/5" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/5" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
        {/* Skeleton ป้ายจำนวนรูป */}
        <div className="flex-shrink-0">
          <div className="h-6 w-20 bg-gray-200 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function SampleCard({ sample, onClick }) {
  const firstImage = sample.images?.[0];
  const imageUrl = firstImage ? getImageUrl(firstImage.image_path) : null;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-md shadow-sm border border-gray-100 hover:border-gray-300 transition-all duration-150 overflow-hidden mb-3 cursor-pointer"
    >
      <div className="flex items-center gap-6 px-3 py-3">
        <div className="flex-shrink-0 w-[146px] h-[120px] bg-gray-200 rounded-md overflow-hidden relative flex items-center justify-center">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={firstImage.image_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm mb-1">
            {sample.smear_id}
          </p>
          <p className="text-sm text-gray-600">
            Chicken breed : {sample.chicken_type}
          </p>
          <p className="text-sm text-gray-600">Age : {sample.age} weeks</p>
          <p className="text-sm text-gray-600">Sex : {sample.sex || "-"}</p>
          <p className="text-sm text-gray-600">Province : {sample.province}</p>
          <p className="text-sm text-gray-600">
            Stain type : {sample.stain_type}
          </p>
          <p className="text-sm text-gray-600">
            Date :{" "}
            {new Date(sample.created_at).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex-shrink-0">
          <span className="bg-gray-500 text-white text-xs font-medium px-3 py-1 rounded-full">
            {sample.images.length} Images
          </span>
        </div>
      </div>
    </div>
  );
}

const Prediction = () => {
  const [activeTab, setActiveTab] = useState(
    () => sessionStorage.getItem("prediction_active_tab") || "Wright",
  );
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchChickenType, setSearchChickenType] = useState("All breeds");
  const [searchDateRange, setSearchDateRange] = useState({
    start: null,
    end: null,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ดึงข้อมูล Batch จาก API ตามประเภทการย้อมสีและหน้าปัจจุบัน
  useEffect(() => {
    const fetchBatches = async () => {
      setLoading(true);
        setBatches([]);
        
        const minLoadingTime = new Promise((resolve) => setTimeout(resolve, 500));
      try {
        
        
        const apiCall = getPendingBatches(activeTab, currentPage, {
          smear_id: debouncedQuery || undefined,
          chicken_type:
            searchChickenType &&
            searchChickenType !== "Chicken type" &&
            searchChickenType !== "Chicken breed" &&
            searchChickenType !== "Breed" &&
            searchChickenType !== "All breeds" &&
            searchChickenType !== "All types" &&
            searchChickenType !== "All"
              ? searchChickenType
              : undefined,
          startDate: formatDate(searchDateRange.start),
          endDate: formatDate(searchDateRange.end || searchDateRange.start),
        });

        const [result] = await Promise.all([apiCall, minLoadingTime]);
        
        setBatches(result.data);
        setTotalPages(result.meta.total_pages);
      } catch (err) {
        await minLoadingTime;
        if (err.response && err.response.status === 404) {
          setBatches([]);
          setTotalPages(1);
        } else {
          console.error("API Error:", err.message);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, [activeTab, currentPage, debouncedQuery, searchChickenType, searchDateRange]);

  useEffect(() => {
    sessionStorage.setItem("prediction_active_tab", activeTab);
  }, [activeTab]);

  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) return [1, 2, 3, "...", totalPages];
    if (currentPage >= totalPages - 2)
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    return [
      1,
      "...",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "...",
      totalPages,
    ];
  };

  return (
    <>
      <Navbar activePage="Prediction" />
      <div
        className="flex flex-col"
        style={{
          minHeight: "calc(100vh - 64px)",
          backgroundImage: "url('/assets/VerifyUsers.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "scroll",
        }}
      >
        {/* Search Bar */}
        <div className="w-full flex justify-end px-4 pt-4">
          <Searchbar
            variant="predict"
            onSearch={({ query }) => {
              setSearchQuery(query);
              setCurrentPage(1);
            }}
            onChange={(val) => {
              let query = "";
              if (typeof val === "string") {
                query = val;
              } else if (val?.target?.value !== undefined) {
                query = val.target.value;
              } else if (val?.query !== undefined) {
                query = val.query;
              }
              setSearchQuery(query || "");
              setCurrentPage(1);
            }}
            onFilterChickenType={(val) => {
              setSearchChickenType(val);
              setCurrentPage(1);
            }}
            onSortChange={(range) => {
              setSearchDateRange(range || { start: null, end: null });
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="max-w-4xl mx-auto px-2 py-10 flex-1 w-full">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Prediction
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              Upload a blood smear image to analyze chicken blood cells
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-5">
            <div className="inline-flex bg-white rounded-md border border-gray-200 p-1 gap-1">
              {[
                { key: "Wright", label: "Wright Stain" },
                { key: "Giemsa", label: "Giemsa Stain" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`px-6 py-2.5 text-sm font-semibold transition-colors duration-150 relative ${
                    activeTab === tab.key
                      ? "text-gray-800 bg-white"
                      : "text-gray-400 bg-gray-50 hover:text-gray-600"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gray-700 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <SampleCardSkeleton key={idx} />
            ))
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-gray-700 font-semibold text-base">
                No {activeTab === "Wright" ? "Wright Stain" : "Giemsa Stain"}{" "}
                data available
              </p>
            </div>
          ) : (
            batches.map((sample) => (
              <SampleCard
                key={sample.batch_id}
                sample={sample}
                onClick={() =>
                  navigate(`/prediction/${sample.batch_id}`, {
                    state: { smear: sample },
                  })
                }
              />
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && !loading && (
            <div className="flex items-center justify-center gap-1 mt-6">
              <button
                onClick={() => setCurrentPage((p) => p - 1)}
                disabled={currentPage === 1}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-2xl"
              >
                ‹
              </button>
              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span
                    key={`dot-${idx}`}
                    className="w-9 h-9 flex items-center justify-center text-gray-400 text-sm"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium border transition-colors duration-150 ${
                      currentPage === page
                        ? "bg-gray-700 text-white border-gray-700"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ),
              )}
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage === totalPages}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-2xl"
              >
                ›
              </button>
            </div>
          )}
        </div>
        <div className="mt-auto">
          <Footer />
        </div>
      </div>
    </>
  );
};

export default Prediction;