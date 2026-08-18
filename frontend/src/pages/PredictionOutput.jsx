import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { getImageUrl } from "../services/api";
import { savePrediction } from "../services/Prediction";

const CELL_COLOR_MAP = {
  Basophil: "#9b5de5",
  Eosinophil: "#f15bb5",
  Heterophil: "#00bbf9",
  Lymphocyte: "#06b6a2",
  Monocyte: "#ca8a04",
  Thrombocyte: "#fb5607",
};

const ALL_CLASSES = [
  "Basophil",
  "Eosinophil",
  "Heterophil",
  "Lymphocyte",
  "Monocyte",
  "Thrombocyte",
];

const MIN_SCALE = 1;
const MAX_SCALE = 5;

const clampOffset = (newOffset, newScale, containerW, containerH) => {
  const maxX = (containerW * (newScale - 1)) / 2;
  const maxY = (containerH * (newScale - 1)) / 2;
  return {
    x: Math.min(maxX, Math.max(-maxX, newOffset.x)),
    y: Math.min(maxY, Math.max(-maxY, newOffset.y)),
  };
};

function ImagePlaceholder({ size = "sm" }) {
  const cls = size === "sm" ? "w-10 h-10" : "w-full h-full";
  return (
    <div
      className={`${cls} bg-blue-100 rounded-lg flex items-center justify-center`}
    >
      <svg
        className="text-blue-300 w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
        <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          d="M21 15l-5-5L5 21"
        />
      </svg>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const FullscreenCanvas = ({ imageUrl, classes, onClose }) => {
  const [scale, setScale] = useState(1);
  const [fitSize, setFitSize] = useState({ width: 0, height: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container) return;

    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    const ctx = canvas.getContext("2d");

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const canvasAspect = canvas.width / canvas.height;
    let drawW, drawH, drawX, drawY;
    if (imgAspect > canvasAspect) {
      drawW = canvas.width;
      drawH = canvas.width / imgAspect;
    } else {
      drawH = canvas.height;
      drawW = canvas.height * imgAspect;
    }
    drawX = (canvas.width - drawW) / 2;
    drawY = (canvas.height - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    const scaleX = drawW / img.naturalWidth;
    const scaleY = drawH / img.naturalHeight;

    Object.entries(classes).forEach(([className, classData]) => {
      const color = CELL_COLOR_MAP[className] || "#999999";
      classData.detections.forEach(({ confidence, bbox }) => {
        const { x1, y1, width, height } = bbox;
        const rx = drawX + x1 * scaleX;
        const ry = drawY + y1 * scaleY;
        const rw = width * scaleX;
        const rh = height * scaleY;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, rw, rh);

        const label = `${className} ${(confidence * 100).toFixed(1)}%`;
        ctx.font = "bold 11px sans-serif";
        const textW = ctx.measureText(label).width;
        ctx.fillStyle = color;
        ctx.fillRect(rx, ry - 16, textW + 6, 16);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, rx + 3, ry - 3);
      });
    });
  };

  useEffect(() => {
    const timer = setTimeout(draw, 50);
    return () => clearTimeout(timer);
  }, [fitSize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      setScale((prevScale) => {
        const newScale = Math.min(
          Math.max(prevScale - e.deltaY * 0.001, MIN_SCALE),
          MAX_SCALE,
        );
        setOffset((prevOffset) =>
          clampOffset(
            prevOffset,
            newScale,
            container.offsetWidth,
            container.offsetHeight,
          ),
        );
        return newScale;
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div
      className="relative rounded-md shadow-2xl overflow-hidden"
      style={{
        width: fitSize.width || "90vw",
        height: fitSize.height || "90vh",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        ref={containerRef}
        className="relative w-full h-full"
        onMouseDown={(e) => {
          setDragging(true);
          setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
        }}
        onMouseMove={(e) => {
          if (!dragging) return;
          const container = containerRef.current;
          if (!container) return;
          const newOffset = {
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
          };
          const clamped = clampOffset(
            newOffset,
            scale,
            container.offsetWidth,
            container.offsetHeight,
          );
          setOffset(clamped);
        }}
        onMouseUp={() => setDragging(false)}
        onMouseLeave={() => setDragging(false)}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="hidden"
          style={{ display: "none" }}
          onLoad={(e) => {
            const img = e.target;
            const maxW = window.innerWidth * 0.9;
            const maxH = window.innerHeight * 0.9;
            const aspect = img.naturalWidth / img.naturalHeight;
            let w = maxW;
            let h = maxW / aspect;
            if (h > maxH) {
              h = maxH;
              w = maxH * aspect;
            }
            setFitSize({ width: w, height: h });
          }}
        />
        <div className="w-full h-full flex items-center justify-center">
          <canvas
            ref={canvasRef}
            style={{
              display: "block",
              maxWidth: "100%",
              maxHeight: "100%",
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              transformOrigin: "center center",
              cursor: dragging ? "grabbing" : "grab",
            }}
          />
        </div>
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button
            onClick={() => {
              const newScale = Math.min(scale + 0.2, MAX_SCALE);
              const container = containerRef.current;
              if (!container) return;
              const clamped = clampOffset(
                offset,
                newScale,
                container.offsetWidth,
                container.offsetHeight,
              );
              setScale(newScale);
              setOffset(clamped);
            }}
            className="bg-white/80 rounded px-2 py-1 text-xs font-bold shadow cursor-pointer flex items-center"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button
            onClick={() => {
              const newScale = Math.max(scale - 0.2, MIN_SCALE);
              const container = containerRef.current;
              if (!container) return;
              const clamped = clampOffset(
                offset,
                newScale,
                container.offsetWidth,
                container.offsetHeight,
              );
              setScale(newScale);
              setOffset(clamped);
            }}
            className="bg-white/80 rounded px-2 py-1 text-xs font-bold shadow cursor-pointer flex items-center"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
          <button
            onClick={() => {
              setScale(1);
              setOffset({ x: 0, y: 0 });
            }}
            className="bg-white/80 rounded px-2 py-1 text-xs font-bold shadow cursor-pointer"
          >
            ↺
          </button>
        </div>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/80 rounded-full p-2 shadow cursor-pointer z-10"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default function PredictionLogsPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { smear, selectedImages, imagePathMap, predictionResult } = state || {};

  const imageList = predictionResult?.data ?? [];
  const summaryData = predictionResult?.summary ?? {};

  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedData = imageList[selectedIndex];

  const cellCounts = selectedData?.classes ?? {};
  const grandTotal = selectedData?.total_detections ?? 0;

  const caseTotal = summaryData?.total_detections ?? 0;
  const totalImagesInCase =
    summaryData?.total_images_processed ?? imageList.length;
  const summaryClasses = summaryData?.classes ?? {};

  const getImagePathByImageId = (imageId) => {
    if (imageId == null || !imagePathMap) return null;
    return imagePathMap[imageId] ?? null;
  };

  const selectedImagePath = getImagePathByImageId(selectedData?.image_id);

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const thumbRefs = useRef([]);
  const [imgAspectRatio, setImgAspectRatio] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleImageLoad = () => {
    const img = imageRef.current;
    if (img && img.naturalWidth && img.naturalHeight) {
      setImgAspectRatio(img.naturalWidth / img.naturalHeight);
    }
    drawBoundingBoxes(selectedData?.classes ?? {});
  };

  const drawBoundingBoxes = (classes) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container || !img.naturalWidth) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0);

    const displayScale = img.naturalWidth / canvas.offsetWidth;

    Object.entries(classes).forEach(([className, classData]) => {
      const color = CELL_COLOR_MAP[className] || "#999999";
      classData.detections.forEach(({ confidence, bbox }) => {
        const { x1, y1, width, height } = bbox;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * displayScale;
        ctx.strokeRect(x1, y1, width, height);

        const label = `${className} ${(confidence * 100).toFixed(1)}%`;
        ctx.font = `bold ${Math.round(11 * displayScale)}px sans-serif`;
        const textW = ctx.measureText(label).width;

        let labelX = x1;
        const labelH = 16 * displayScale;
        let labelY = y1 - labelH;
        if (labelY < 0) labelY = y1 + height + 2;
        if (labelX + textW + 6 * displayScale > canvas.width)
          labelX = canvas.width - textW - 6 * displayScale;
        if (labelX < 0) labelX = 0;

        ctx.fillStyle = color;
        ctx.fillRect(labelX, labelY, textW + 6 * displayScale, labelH);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(
          label,
          labelX + 3 * displayScale,
          labelY + 13 * displayScale,
        );
      });
    });
  };

  useEffect(() => {
    if (!selectedData) return;
    setTimeout(() => drawBoundingBoxes(selectedData.classes), 100);
  }, [selectedIndex, selectedData]);
  useEffect(() => {
    setImgAspectRatio(null);
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [selectedIndex]);

  useEffect(() => {
    const el = thumbRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        setSelectedIndex((i) =>
          Math.min((selectedImages?.length ?? 1) - 1, i + 1),
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      setScale((prevScale) => {
        const newScale = Math.min(
          Math.max(prevScale - e.deltaY * 0.001, MIN_SCALE),
          MAX_SCALE,
        );
        setOffset((prevOffset) =>
          clampOffset(
            prevOffset,
            newScale,
            container.offsetWidth,
            container.offsetHeight,
          ),
        );
        return newScale;
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [selectedImagePath]);

  const colorPalette = [
    { bar: "bg-gray-700", dot: "bg-gray-700" },
    { bar: "bg-orange-400", dot: "bg-orange-400" },
    { bar: "bg-purple-400", dot: "bg-purple-400" },
    { bar: "bg-blue-400", dot: "bg-blue-400" },
    { bar: "bg-green-400", dot: "bg-green-400" },
    { bar: "bg-red-400", dot: "bg-red-400" },
  ];
  const [description, setDescription] = useState("");
  const [resultTab, setResultTab] = useState("perImage");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleSave = async () => {
    try {
      const payload = {
        description,
        message: predictionResult?.message ?? "",
        mode: predictionResult?.mode ?? "",
        total_images_processed: predictionResult?.total_images_processed ?? 0,
        data: predictionResult?.data ?? [],
      };
      await savePrediction(payload);
      setToast({ message: "Saved successfully!", type: "success" });
      setTimeout(() => navigate("/prediction"), 1000); // รอ toast โชว์แป๊บนึงก่อนเปลี่ยนหน้า
    } catch (err) {
      setToast({ message: "Failed to save: " + err.message, type: "error" });
    }
  };

  return (
    <>
      <Navbar />
      <div className="bg-gradient-to-br from-slate-100 to-blue-50 p-4 min-h-[calc(100vh-88px)] flex flex-col justify-center items-center">
        <div className="flex gap-4 h-[calc(100vh-160px)] w-full max-w-[1220px] justify-center">
          {/* ── Column 1: Image list ── */}
          <div className="w-[340px] shrink-0 bg-white/80  backdrop-blur rounded-xl shadow-sm border border-blue-100 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-blue-50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-500 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <h2 className="font-bold text-gray-700">Image</h2>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {imageList.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={`w-full text-left rounded-xl p-2 flex items-center gap-3 border-2 transition-all ${
                    selectedIndex === i
                      ? "border-blue-400 bg-blue-50"
                      : "border-transparent bg-white hover:bg-blue-50/50"
                  }`}
                >
                  <div className="rounded-md overflow-hidden shrink-0 bg-blue-100 w-28 h-24">
                    {getImagePathByImageId(item.image_id) ? (
                      <img
                        src={getImageUrl(getImagePathByImageId(item.image_id))}
                        className="block w-full h-full object-cover"
                      />
                    ) : (
                      <ImagePlaceholder size="sm" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-700 truncate">
                      {item.image_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Detections: {item.total_detections}
                    </p>
                    <p className="text-xs text-gray-500 break-words">
                      Classes: {item.classes_found.join(", ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Column 2: Example / Preview ── */}
          <div className="w-[600px] shrink-0 bg-white/80  backdrop-blur rounded-xl shadow-sm border border-blue-100 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-blue-50">
              <h2 className="font-bold text-gray-700">
                Example
                {selectedData && (
                  <span className="ml-2 text-blue-500 font-normal text-sm">
                    {selectedData.image_name}
                  </span>
                )}
              </h2>
            </div>

            {/* Main preview */}
            <div className="flex items-center justify-center gap-3 px-4 py-4 flex-1">
              <button
                onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
                disabled={selectedIndex === 0}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-500 transition-colors shrink-0 disabled:opacity-40 disabled:hover:bg-gray-100 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div
                ref={containerRef}
                className="bg-gray-200 rounded-lg overflow-hidden relative flex items-center justify-center"
                style={{
                  width: imgAspectRatio
                    ? imgAspectRatio >= 420 / 340
                      ? "420px"
                      : `${340 * imgAspectRatio}px`
                    : "420px",
                  height: imgAspectRatio
                    ? imgAspectRatio >= 420 / 340
                      ? `${420 / imgAspectRatio}px`
                      : "340px"
                    : "340px",
                  transition: "width 0.2s ease, height 0.2s ease",
                }}
                onMouseDown={(e) => {
                  setDragging(true);
                  setDragStart({
                    x: e.clientX - offset.x,
                    y: e.clientY - offset.y,
                  });
                }}
                onMouseMove={(e) => {
                  if (!dragging) return;
                  const container = containerRef.current;
                  if (!container) return;
                  const newOffset = {
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y,
                  };
                  const clamped = clampOffset(
                    newOffset,
                    scale,
                    container.offsetWidth,
                    container.offsetHeight,
                  );
                  setOffset(clamped);
                }}
                onMouseUp={() => setDragging(false)}
                onMouseLeave={() => setDragging(false)}
              >
                {selectedImagePath ? (
                  <>
                    <img
                      ref={imageRef}
                      src={getImageUrl(selectedImagePath)}
                      crossOrigin="anonymous"
                      style={{ display: "none" }}
                      onLoad={handleImageLoad}
                    />
                    <canvas
                      ref={canvasRef}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "auto",
                        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                        transformOrigin: "center center",
                        cursor: dragging ? "grabbing" : "grab",
                      }}
                    />
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <button
                        onClick={() => {
                          const newScale = Math.min(scale + 0.2, MAX_SCALE);
                          const container = containerRef.current;
                          if (!container) return;
                          const clamped = clampOffset(
                            offset,
                            newScale,
                            container.offsetWidth,
                            container.offsetHeight,
                          );
                          setScale(newScale);
                          setOffset(clamped);
                        }}
                        className="bg-white/80 rounded px-1.5 py-1 text-xs font-bold shadow cursor-pointer flex items-center"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          <line x1="11" y1="8" x2="11" y2="14" />
                          <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          const newScale = Math.max(scale - 0.2, MIN_SCALE);
                          const container = containerRef.current;
                          if (!container) return;
                          const clamped = clampOffset(
                            offset,
                            newScale,
                            container.offsetWidth,
                            container.offsetHeight,
                          );
                          setScale(newScale);
                          setOffset(clamped);
                        }}
                        className="bg-white/80 rounded px-1.5 py-1 text-xs font-bold shadow cursor-pointer flex items-center"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          <line x1="8" y1="11" x2="14" y2="11" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setScale(1);
                          setOffset({ x: 0, y: 0 });
                        }}
                        className="bg-white/80 rounded px-1.5 py-1 text-[10px] font-bold shadow cursor-pointer"
                      >
                        ↺
                      </button>
                      <button
                        onClick={() => setIsFullscreen(true)}
                        className="bg-white/80 rounded px-1.5 py-1 text-xs font-bold shadow cursor-pointer flex items-center"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="15 3 21 3 21 9" />
                          <polyline points="9 21 3 21 3 15" />
                          <line x1="21" y1="3" x2="14" y2="10" />
                          <line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                      </button>
                    </div>
                  </>
                ) : (
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                      strokeWidth="1"
                    />
                    <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1"
                      d="M21 15l-5-5L5 21"
                    />
                  </svg>
                )}
              </div>
              <button
                onClick={() =>
                  setSelectedIndex((i) => Math.min(imageList.length - 1, i + 1))
                }
                disabled={selectedIndex === imageList.length - 1}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-500 transition-colors shrink-0 disabled:opacity-40 disabled:hover:bg-gray-100 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Thumbnail strip */}
            <div className="pb-4 flex justify-center">
              <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent max-w-[480px] pb-3">
                {imageList.map((item, i) => {
                  const imgPath = getImagePathByImageId(item.image_id);
                  if (!imgPath) return null;
                  return (
                    <button
                      key={i}
                      ref={(el) => (thumbRefs.current[i] = el)}
                      onClick={() => setSelectedIndex(i)}
                      className={`w-28 h-24 shrink-0 rounded-md overflow-hidden border-2 transition-colors duration-150 cursor-pointer ${
                        selectedIndex === i
                          ? "border-blue-500 ring-2 ring-blue-300 opacity-100 shadow-md"
                          : "border-transparent opacity-70 hover:opacity-100 hover:border-blue-400"
                      }`}
                    >
                      <img
                        src={getImageUrl(imgPath)}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Column 3: Detail panel ── */}
          <div className="w-[300px] shrink-0 flex flex-col gap-3 h-full [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            {/* Description card */}
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-blue-100 overflow-hidden shrink-0">
              <div className="flex items-center px-4 py-2 bg-blue-500 rounded-t-lg">
                <h3 className="font-bold text-white text-sm">Description</h3>
              </div>
              <div className="p-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description..."
                  className="w-full text-sm text-gray-700 bg-blue-50 rounded-lg p-2 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  rows={4}
                />
              </div>
            </div>

            {/* Cell Distribution card */}
            <div className="bg-white/80 backdrop-blur rounded-xl shadow-sm border border-blue-100 overflow-hidden flex flex-col flex-1">
              <div className="flex bg-blue-500 rounded-t-lg overflow-hidden shrink-0">
                <button
                  onClick={() => setResultTab("perImage")}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${resultTab === "perImage" ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-blue-600/50"}`}
                >
                  Image results
                </button>
                <button
                  onClick={() => setResultTab("wholeCase")}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors ${resultTab === "wholeCase" ? "bg-blue-600 text-white" : "text-blue-100 hover:bg-blue-600/50"}`}
                >
                  Overall results
                </button>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                {resultTab === "perImage" && (
                  <>
                    <div className="p-4 pt-6">
                      {ALL_CLASSES.map((cls) => {
                        const val = cellCounts[cls];
                        const count = val?.count ?? 0;
                        const pct = val?.percentage ?? 0; //val?.percentage ? Number(val.percentage).toFixed(1) : "0.0";
                        const color = CELL_COLOR_MAP[cls];

                        if (cls === "Thrombocyte") {
                          return (
                            <div
                              key={cls}
                              className="mb-2.5 pt-1.5 border-t border-dashed border-gray-200"
                            >
                              {/* บรรทัดแรก: แสดงจำนวนเซลล์ */}
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ background: color }}
                                  />
                                  <span className="text-sm font-medium text-gray-700">
                                    {cls}
                                  </span>
                                </div>
                                <span className="text-sm font-bold text-gray-700">
                                  {count}{" "}
                                  <span className="text-xs font-normal text-gray-400">
                                    cells
                                  </span>
                                </span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={cls} className="mb-2">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ background: color }}
                                />
                                <span className="text-sm text-gray-700">
                                  {cls}
                                </span>
                              </div>
                              <span className="text-sm">
                                <span className="font-semibold text-gray-500">
                                  {count}
                                </span>{" "}
                                <span className="font-normal text-gray-400">
                                  ({pct}%)
                                </span>
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, background: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Total */}
                    <div className="mx-4 mb-2 mt-auto flex items-center justify-between pt-2 border-t border-gray-200">
                      <span className="text-base text-gray-500">
                        Total cells
                      </span>
                      <span className="text-base font-semibold text-gray-800">
                        {grandTotal}
                      </span>
                    </div>
                  </>
                )}

                {resultTab === "wholeCase" && (
                  <div>
                    <div className="px-4 pt-3 pb-4 grid grid-cols-2 gap-2">
                      <div className="border border-gray-200 rounded-lg py-1 text-center">
                        <p className="text-md font-bold text-gray-800">
                          {caseTotal}
                        </p>
                        <p className="text-xs text-gray-500">Total cells</p>
                      </div>
                      <div className="border border-gray-200 rounded-lg py-1 text-center">
                        <p className="text-md font-bold text-gray-800">
                          {totalImagesInCase}
                        </p>
                        <p className="text-xs text-gray-500">Images</p>
                      </div>
                    </div>
                    <div className="p-4 pt-1">
                      {ALL_CLASSES.map((cls) => {
                        const val = summaryClasses[cls];
                        const count = val?.count ?? 0;
                        const pct = val?.percentage ?? 0; //val?.percentage ? Math.round(val.percentage) : 0;
                        const color = CELL_COLOR_MAP[cls];

                        if (cls === "Thrombocyte") {
                          return (
                            <div
                              key={cls}
                              className="mb-2.5 pt-1.5 border-t border-dashed border-gray-200"
                            >
                              {/* บรรทัดแรก: แสดงจำนวนเซลล์รวม */}
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ background: color }}
                                  />
                                  <span className="text-sm font-medium text-gray-700">
                                    {cls}
                                  </span>
                                </div>
                                <span className="text-sm font-bold text-gray-700">
                                  {count}{" "}
                                  <span className="text-xs font-normal text-gray-400">
                                    cells
                                  </span>
                                </span>
                              </div>

                              {/* บรรทัดที่สอง: แสดงค่าอัตราส่วนรวมที่หลังบ้านคำนวณส่งมา */}
                              <div className="flex items-center justify-between text-xs text-gray-500 bg-orange-50/70 rounded-md px-2.5 py-1 border border-orange-100">
                                <span>Thrombocyte per 100 WBC</span>
                                <span className="font-bold text-orange-600">
                                  {pct}%
                                </span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={cls} className="mb-2">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ background: color }}
                                />
                                <span className="text-sm text-gray-700">
                                  {cls}
                                </span>
                              </div>
                              <span className="text-sm">
                                <span className="font-semibold text-gray-500">
                                  {count}
                                </span>{" "}
                                <span className="font-normal text-gray-400">
                                  ({pct}%)
                                </span>
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, background: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Save button */}
              <div className="px-4 pb-3 pt-2 shrink-0 bg-white/95 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-green-400 hover:bg-green-500 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95 text-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  Save data to database.
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer className="mt-0" />

      {isFullscreen &&
        selectedData &&
        selectedImagePath &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center"
            onClick={() => setIsFullscreen(false)}
          >
            <FullscreenCanvas
              imageUrl={getImageUrl(selectedImagePath)}
              classes={selectedData.classes}
              onClose={() => setIsFullscreen(false)}
            />
          </div>,
          document.body,
        )}

      {toast &&
        createPortal(
          <div
            className={`fixed top-4 right-4 z-[10000] px-4 py-3 rounded-lg shadow-lg border border-white text-sm font-medium bg-white transition-all animate-[fadeIn_0.2s_ease] ${
              toast.type === "error"
                ? "border-red-300 text-red-600"
                : "border-green-300 text-green-600"
            }`}
          >
            {toast.message}
          </div>,
          document.body,
        )}
    </>
  );
}
