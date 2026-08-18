import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import BloodCellCard from "../components/BloodCellCard";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import logo from "/assets/Chicken-CBC.png";
import BloodCellDetailModal from "../components/BloodCellDetailModal";
import { uploadClient, getImageUrl } from "../services/api";
import { formatCardDate } from "../utils/formatters";

// ─── Skeleton Component (สำหรับโหลดรอข้อมูลแบบสมูทๆ) ─────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm animate-pulse flex flex-col gap-3">
      {/* ส่วนจำลองรูปภาพ (อัตราส่วน 1:1) */}
      <div className="w-full aspect-square bg-gray-200 rounded-xl" />
      {/* ส่วนจำลองข้อความหัวข้อ */}
      <div className="flex flex-col gap-1.5 px-1">
        <div className="h-3.5 bg-gray-200 rounded-md w-3/4" />
        <div className="h-3 bg-gray-100 rounded-md w-1/2" />
      </div>
      {/* ส่วนจำลองข้อมูลคนอัปโหลดด้านล่าง */}
      <div className="flex items-center gap-2 mt-1 px-1 pt-2 border-t border-gray-50">
        <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />
        <div className="flex flex-col gap-1 flex-1">
          <div className="h-2.5 bg-gray-200 rounded w-20" />
          <div className="h-2 bg-gray-100 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

const CELL_LABELS = [
  "Heterophil",
  "Eosinophil",
  "Basophil",
  "Lymphocyte",
  "Monocyte",
  "Thrombocyte",
];

const transformPrediction = (prediction) => {
  if (!prediction) return null;
  const classes = prediction.classes || {};

  const cell_counts = {};
  const cell_percentages = {};
  CELL_LABELS.forEach((label) => {
    cell_counts[label] = classes[label]?.count ?? 0;
    cell_percentages[label] = classes[label]?.percentage ?? 0;
  });

  const detections = (prediction.detections ?? []).map((d) => ({
    bbox: d.bbox ? d.bbox : {
      x1: d.x1,
      y1: d.y1,
      x2: d.x2,
      y2: d.y2,
      width: d.width ?? d.x2 - d.x1,
      height: d.height ?? d.y2 - d.y1,
    },
    class_name: d.class_name,
    confidence: d.confidence,
  }));

  return { cell_counts, cell_percentages, detections };
};

const mapCardFromApi = (item) => {
  const images = item.images ?? [];

  return {
    id: item.batch_id,
    smearId: item.smear_id,
    images: images.map((img) => getImageUrl(img.image_path)),
    imageDetails: images.map((img) => ({
      url: getImageUrl(img.image_path),
      totalCells: img.total_cells_in_image ?? null,
      prediction: transformPrediction(img.prediction),
    })),
    title: item.description ?? "",
    status: item.status ?? "",
    chickenType: item.chicken_type ?? "",
    province: item.province ?? "",
    age: item.age ?? "",
    sex: item.sex ?? "",
    stainType: item.stain_type ?? "",
    description: item.description ?? "",
    predictedAt: item.predicted_at ?? "",
    uploaderName: item.owner
      ? `${item.owner.first_name ?? ""} ${item.owner.last_name ?? ""}`.trim()
      : "",
    uploaderAvatar: item.owner?.profile_image
      ? getImageUrl(item.owner.profile_image)
      : null,
    uploaderId: item.owner?.id ?? item.owner?.user_id ?? null,
  };
};

// ─── HeroSection ─────────────────────────────────────────────────────────────
const HeroSection = ({
  onSearch,
  onFilterChickenType,
  onFilterProvince,
  onSortChange,
}) => (
  <section className="flex flex-col items-center justify-center pt-4 pb-24 px-4 bg-gradient-to-b from-sky-100 to-white">
    <div className="w-full flex justify-end mb-4">
      <SearchBar
        variant="home"
        onSearch={onSearch}
        onFilterChickenType={onFilterChickenType}
        onFilterProvince={onFilterProvince}
        onSortChange={onSortChange}
      />
    </div>

    {/* Logo */}
    <div className="mb-5 mt-8">
      <img
        src={logo}
        alt="CBC Medical Logo"
        className="w-28 h-28 object-contain"
      />
    </div>

    {/* Hero Text */}
    <h1 className="text-xl font-bold text-gray-800 mb-3 text-center">
      We bring intelligence to avian diagnostics.
    </h1>
    <p className="text-sm text-gray-500 text-center max-w-lg leading-relaxed">
      Detect abnormalities in seconds and enhance flock health with advanced
      deep-learning analysis of chicken blood cells.
    </p>
  </section>
);

// ─── CardGrid ────────────────────────────────────────────────────────────────
const CardGrid = ({ cards, loading, error, onCardClick }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(8)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-20 text-red-400">
        <p className="text-sm">เกิดข้อผิดพลาด: {error}</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-sm">No records found</p>
      </div>
    );
  }

  return (
    //  Responsive grid: 1 col on mobile, 2 on tablet, 4 on desktop
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => (
        <BloodCellCard
          key={card.id}
          images={card.images}
          title={card.title}
          status={card.status}
          issueId={card.smearId}
          chickenType={card.chickenType}
          province={card.province}
          age={card.age}
          sex={card.sex}
          stainType={card.stainType}
          uploaderName={card.uploaderName}
          uploaderDate={formatCardDate(card.predictedAt)}
          avatarUrl={card.uploaderAvatar}
          onClick={(idx) => onCardClick?.(card, idx)}
        />
      ))}
    </div>
  );
};

const Pagination = ({ meta, onPageChange }) => {
  if (!meta || meta.total_pages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 mt-8">
      <button
        onClick={() => onPageChange(meta.current_page - 1)}
        disabled={meta.current_page <= 1}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
      >
        ก่อนหน้า
      </button>
      <span className="text-sm text-gray-600">
        หน้า {meta.current_page} / {meta.total_pages}
      </span>
      <button
        onClick={() => onPageChange(meta.current_page + 1)}
        disabled={meta.current_page >= meta.total_pages}
        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100"
      >
        ถัดไป
      </button>
    </div>
  );
};

// ─── HomePage ────────────────────────────────────────────────────────────────
const HomePage = () => {
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedThumbIndex, setSelectedThumbIndex] = useState(0);

  const [cards, setCards] = useState([]);
  const [meta, setMeta] = useState({
    total_items: 0,
    current_page: 1,
    per_page: 20,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    province: null,
    chickenType: "All breeds",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 20,
  });
  const debounceRef = useRef(null);

  const abortRef = useRef(null);

  const fetchCards = useCallback(async (f) => {
    if (abortRef.current) abortRef.current.abort(); // ยกเลิก request เก่าที่ยังค้าง
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = { page: f.page, limit: f.limit };

      if (f.search) params.search = f.search;
      if (f.province && f.province !== "All provinces") {
        params.province = f.province; 
      }

      if (f.chickenType && f.chickenType !== "All breeds") {
        params.chicken_type = f.chickenType;
      }
      if (f.startDate) params.startDate = f.startDate;
      if (f.endDate) params.endDate = f.endDate;

      const [apiResponse] = await Promise.all([
        uploadClient.get("/home/cards", { params, signal: controller.signal }), // เพิ่ม signal
        new Promise((resolve) => setTimeout(resolve, 300)),
      ]);

      const json = apiResponse.data;
      
      const mapped = (json.data ?? []).map(mapCardFromApi);
      setCards(mapped);
      setMeta(
        json.meta ?? {
          total_items: mapped.length,
          current_page: f.page,
          per_page: f.limit,
          total_pages: 1,
        },
      );
    } catch (err) {
      if (err.name === "CanceledError" || err.name === "AbortError") return; // ถูกยกเลิกเอง ไม่ใช่ error จริง ไม่ต้อง setError
      setError(
        err.response?.data?.message || err.message || "ไม่สามารถดึงข้อมูลได้",
      );
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCards(filters);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters, fetchCards]);

  const handleSearch = ({ query, province, chickenType }) => {
    setFilters((prev) => ({
      ...prev,
      search: query ?? prev.search,
      province: province ?? prev.province,
      chickenType: chickenType ?? prev.chickenType,
      page: 1,
    }));
  };

  const handleFilterChickenType = (type) => {
    setFilters((prev) => ({ ...prev, chickenType: type, page: 1 }));
  };

  const handleFilterProvince = (prov) => {
    setFilters((prev) => ({
      ...prev,
      province: prov && prov !== "All provinces" ? prov : null,
      page: 1,
    }));
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleSortChange = (range) => {
    if (!range || (!range.start && !range.end)) {
      setFilters((prev) => ({ ...prev, startDate: "", endDate: "", page: 1 }));
      return;
    }
    
    const formatToYYYYMMDD = (date) => {
      if (!date) return "";
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    setFilters((prev) => ({
      ...prev,
      startDate: formatToYYYYMMDD(range.start),
      endDate: formatToYYYYMMDD(range.end || range.start),
      page: 1,
    }));
  };

  const handleCardClick = (card, idx = 0) => {
    setSelectedCard(card);
    setSelectedThumbIndex(idx);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar activePage="Home" />

      <main className="flex-1">
        <HeroSection
          onSearch={handleSearch}
          onFilterChickenType={handleFilterChickenType}
          onFilterProvince={handleFilterProvince}
          onSortChange={handleSortChange}
        />
        {/* ความกว้างสูงสุด 1400px, centered, padding รอบ */}
        <section className="w-full px-4 pb-16 max-w-[1400px] mx-auto">
          <CardGrid
            cards={cards}
            loading={loading}
            error={error}
            onCardClick={handleCardClick}
          />
          <Pagination meta={meta} onPageChange={handlePageChange} />
        </section>
      </main>

      <Footer />

      {selectedCard && (
        <BloodCellDetailModal
          data={selectedCard}
          initialThumbIndex={selectedThumbIndex}
          onClose={() => setSelectedCard(null)}
          onProfileClick={(doctorId) => navigate(`/profile/${doctorId}`)}
        />
      )}
    </div>
  );
};

export default HomePage;
