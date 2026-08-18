import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getImageUrl } from "../services/api";
import { formatCardDate } from "../utils/formatters";

const CELL_COLORS = {
  Basophil: "#9b5de5",
  Eosinophil: "#f15bb5",
  Heterophil: "#00bbf9",
  Lymphocyte: "#06b6a2",
  Monocyte: "#ca8a04",
  Thrombocyte: "#fb5607",
};

const CELL_ORDER = [
  "Basophil",
  "Eosinophil",
  "Heterophil",
  "Lymphocyte",
  "Monocyte",
  "Thrombocyte",
];

// draws the image letterboxed inside the canvas + bounding boxes on top
// `detections` is the flat array from the API: [{ bbox: {x1,y1,x2,y2,width,height}, class_name, confidence }, ...]
const drawBoundingBoxes = (canvas, img, detections, width, height) => {
  if (!canvas || !img || !img.naturalWidth || !width || !height) return;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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

  if (!detections || detections.length === 0) return;

  const scaleX = drawW / img.naturalWidth;
  const scaleY = drawH / img.naturalHeight;

  detections.forEach(({ bbox, class_name, confidence }) => {
    const color = CELL_COLORS[class_name] || "#999999";
    const { x1, y1, width, height } = bbox;
    const rx = drawX + x1 * scaleX;
    const ry = drawY + y1 * scaleY;
    const rw = width * scaleX;
    const rh = height * scaleY;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);

    const label = `${class_name} ${(confidence * 100).toFixed(1)}%`;
    ctx.font = "bold 11px sans-serif";
    const textW = ctx.measureText(label).width;
    let labelY = ry - 16;
    if (labelY < 0) labelY = ry + rh + 2;

    ctx.fillStyle = color;
    ctx.fillRect(rx, labelY, textW + 6, 16);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, rx + 3, labelY + 12);
  });
};

export default function BloodCellDetailModal({
  data,
  onClose,
  initialThumbIndex = 0,
  onProfileClick,
}) {
  const [activeThumb, setActiveThumb] = useState(initialThumbIndex);
  const [thumbStart, setThumbStart] = useState(() =>
    Math.max(0, initialThumbIndex - 3),
  );

  const info = data || {};
  const smearId = info.smearId || info.issueId;
  const doctorName = info.doctorName || info.uploaderName;
  const doctorId = info.doctorId || info.uploaderId || info.userId || null;
  // The API can provide a URL string or an image object ({ image_path },
  // { image_url }, { url }). Normalize both formats before rendering.
  const thumbnails = (info.thumbnails || info.images || info.data || [])
    .map((image) => {
      const path =
        typeof image === "string"
          ? image
          : image?.url ||
            image?.image_url ||
            image?.image_path ||
            image?.path ||
            image?.filename;

      if (!path) return null;
      return /^https?:\/\//i.test(path) ? path : getImageUrl(path);
    })
    .filter(Boolean);
  const description =
    info.description && info.description !== "-"
      ? info.description
      : info.title && info.title !== "-"
        ? info.title
        : "";

  const rawDate =
    info.doctorDate || info.uploaderDate || info.predictedAt || "";
  const doctorDate = formatCardDate(rawDate);

  const doctorAvatarPath =
    info.doctorAvatar ||
    info.uploaderAvatar ||
    info.avatarUrl ||
    info.profile_image ||
    info.profileImage ||
    info.owner?.profile_image ||
    null;
  const doctorAvatar = doctorAvatarPath
    ? /^https?:\/\//i.test(doctorAvatarPath)
      ? doctorAvatarPath
      : getImageUrl(doctorAvatarPath)
    : null;
  const imageDetails = info.imageDetails || info.data || [];
  const activePrediction =
    imageDetails[activeThumb]?.prediction || imageDetails[activeThumb] || null;

  const activeWbcCounts = activePrediction?.cell_counts || {};
  const activeWbcTotal = [
    "Basophil",
    "Eosinophil",
    "Heterophil",
    "Lymphocyte",
    "Monocyte",
  ].reduce((sum, key) => sum + (activeWbcCounts[key] || 0), 0);

  const total = activePrediction
    ? Object.values(activePrediction.cell_counts || {}).reduce(
        (sum, c) => sum + c,
        0,
      )
    : (info.total ?? 0);

  const distribution = activePrediction
    ? CELL_ORDER.map((label) => {
        const classObj =
          activePrediction.classes?.[label] ||
          activePrediction.prediction?.classes?.[label];
        const count =
          classObj?.count ?? activePrediction.cell_counts?.[label] ?? 0;

        // 5 เม็ดเลือดขาวคิดสัดส่วน 100% จาก activeWbcTotal
        const percent =
          classObj?.percentage ??
          (activeWbcTotal > 0
            ? Number(((count / activeWbcTotal) * 100).toFixed(2))
            : 0);

        return {
          label,
          count,
          percent,
          color: CELL_COLORS[label] || "#94a3b8",
        };
      })
    : CELL_ORDER.map((label) => ({
        label,
        count: 0,
        percent: 0,
        color: CELL_COLORS[label] || "#94a3b8",
      }));

  const aggregatedCounts = imageDetails.reduce((acc, img) => {
    const countsObj =
      img?.classes ||
      img?.prediction?.classes ||
      img?.prediction?.cell_counts ||
      {};
    Object.entries(countsObj).forEach(([label, val]) => {
      const count = typeof val === "object" ? val?.count || 0 : val || 0;
      acc[label] = (acc[label] || 0) + count;
    });
    return acc;
  }, {});

  const aggregatedTotal =
    info.summary?.total_detections ??
    info.total_detections ??
    Object.values(aggregatedCounts).reduce((sum, c) => sum + c, 0);

  const summaryClasses = info.summary?.classes || info.classes || null;

  

  const postWbcTotal = ["Basophil", "Eosinophil", "Heterophil", "Lymphocyte", "Monocyte"]
    .reduce((sum, key) => sum + (aggregatedCounts[key] || 0), 0);

  const aggregatedDistribution = CELL_ORDER.map((label) => {
    const classObj = summaryClasses?.[label];
    const count = classObj?.count ?? aggregatedCounts[label] ?? 0;
    const percent =
      classObj?.percentage ??
      (postWbcTotal > 0
        ? Number(((count / postWbcTotal) * 100).toFixed(2))
        : 0);
    return {
      label,
      count,
      percent,
      color: CELL_COLORS[label] || "#94a3b8",
    };
  });

  const thrombocyteSummaryCount = aggregatedCounts.Thrombocyte || 0;
  const thrombocyteRatio =
    summaryClasses?.Thrombocyte?.percentage !== undefined && summaryClasses.Thrombocyte.percentage > 0
      ? Number(summaryClasses.Thrombocyte.percentage).toFixed(2)
      : postWbcTotal > 0
        ? ((thrombocyteSummaryCount * 100) / postWbcTotal).toFixed(2)
        : "0.00";

  const heterophilCount = aggregatedCounts.Heterophil || 0;
  const lymphocyteCount = aggregatedCounts.Lymphocyte || 0;
  const hlRatio =
    lymphocyteCount > 0 ? (heterophilCount / lymphocyteCount).toFixed(2) : "-";

  const rawAge = info.age;
  const age =
    rawAge === undefined || rawAge === null || rawAge === ""
      ? rawAge
      : /week/i.test(String(rawAge))
        ? rawAge
        : `${rawAge} weeks`;

  useEffect(() => {
    setActiveThumb(initialThumbIndex);
    setThumbStart(Math.max(0, initialThumbIndex - 3));
  }, [info.smearId, initialThumbIndex]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        handlePrevThumb();
      } else if (e.key === "ArrowRight") {
        handleNextThumb();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [thumbnails.length]);

  const moveThumb = (delta) => {
    setActiveThumb((prev) => {
      const clamped = Math.max(
        0,
        Math.min(thumbnails.length - 1, prev + delta),
      );
      setThumbStart((prevStart) => {
        if (clamped < prevStart) return clamped;
        if (clamped > prevStart + 3) return clamped - 3;
        return prevStart;
      });
      return clamped;
    });
  };

  const updateActiveThumb = (newIndex) => {
    setActiveThumb((prev) => {
      const clamped = Math.max(0, Math.min(thumbnails.length - 1, newIndex));
      setThumbStart((prevStart) => {
        if (clamped < prevStart) return clamped;
        if (clamped > prevStart + 3) return clamped - 3;
        return prevStart;
      });
      return clamped;
    });
  };

  const handlePrevThumb = () => moveThumb(-1);
  const handleNextThumb = () => moveThumb(1);

  const navigate = useNavigate();
  const handleProfileClick = () => {
    if (!doctorId) return;
    if (typeof onProfileClick === "function") {
      onProfileClick(doctorId, info);
    }
    onClose();
    navigate(`/profile/${doctorId}`);
  };

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const outerRef = useRef(null);
  const [boxSize, setBoxSize] = useState(null);
  const MAX_HEIGHT = 420;

  const draw = () => {
    const img = imageRef.current;
    const outer = outerRef.current;
    if (img && img.naturalWidth && outer) {
      const aspect = img.naturalWidth / img.naturalHeight;
      const containerWidth = outer.offsetWidth;
      let w = MAX_HEIGHT * aspect;
      let h = MAX_HEIGHT;
      if (w > containerWidth) {
        w = containerWidth;
        h = containerWidth / aspect;
      }
      setBoxSize({ width: w, height: h });
      drawBoundingBoxes(
        canvasRef.current,
        img,
        activePrediction?.detections,
        w,
        h,
      );
    }
  };

  useEffect(() => {
    const img = imageRef.current;
    if (img && img.complete && img.naturalWidth) {
      draw();
    }
  }, [activeThumb]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 overflow-hidden"
        style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          {description ? (
            <h2 className="text-base font-semibold text-slate-700 tracking-wide">
              {description}
            </h2>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors ml-auto text-slate-500 hover:text-slate-700"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex gap-1 p-8">
          {/* Left: post-level summary (aggregated across every image) */}
          <div className="flex flex-col w-64 flex-shrink-0">
            <div className="rounded-lg overflow-hidden border border-blue-100 shadow-sm h-full flex flex-col">
              <div className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500">
                <p className="text-white text-sm font-bold">Post Summary</p>
                <p className="text-blue-100 text-[11px] mt-0.5">
                  By cell type · {imageDetails.length || thumbnails.length}{" "}
                  images
                </p>
              </div>

              <div className="p-4 flex flex-col flex-1">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="border border-gray-200 rounded-lg py-1 text-center">
                    <p className="text-xl font-bold text-slate-800">
                      {aggregatedTotal}
                    </p>
                    <p className="text-xs text-slate-400">Total cells</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg py-1 text-center">
                    <p className="text-xl font-bold text-slate-800">
                      {imageDetails.length || thumbnails.length}
                    </p>
                    <p className="text-xs text-slate-400">Images</p>
                  </div>
                </div>

                {aggregatedDistribution.map((cell) => {
                  if (cell.label === "Thrombocyte") {
                    return (
                      <div
                        key={cell.label}
                        className="mb-2 pt-1 border-t border-dashed border-gray-200"
                      >
                        {/* บรรทัดแรก: แสดงแค่จำนวนเซลล์ */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: cell.color }}
                            />
                            <span className="text-sm font-medium text-gray-700">
                              {cell.label}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-gray-700">
                            {cell.count}{" "}
                            <span className="text-xs font-normal text-gray-400">
                              cells
                            </span>
                          </span>
                        </div>

                        {/* บรรทัดที่สอง: แสดงค่า Thrombocyte / 100 WBC จากหลังบ้าน */}
                        <div className="flex items-center justify-between text-[11px] text-gray-500 bg-orange-50/70 rounded-md px-2 py-0.5 border border-orange-100">
                          <span>Thrombocyte per 100 WBC</span>
                          <span className="font-bold text-orange-600">
                            {thrombocyteRatio}%
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={cell.label} className="mb-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: cell.color }}
                          />
                          <span className="text-sm text-gray-700">
                            {cell.label}
                          </span>
                        </div>
                        <span className="text-sm">
                          <span className="font-semibold text-gray-500">
                            {cell.count}
                          </span>{" "}
                          <span className="font-normal text-gray-400">
                            ({cell.percent}%)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{
                            width: `${cell.percent}%`,
                            background: cell.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="mt-auto pt-2 border-t border-dashed border-gray-200">
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Totals across all images in this post.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* Middle: image section */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {/* Main image with bounding box canvas (static, no zoom/pan) */}

            <div
              ref={outerRef}
              className="w-full flex justify-center items-center"
              style={{ minHeight: MAX_HEIGHT }}
            >
              <div
                className="relative rounded-lg overflow-hidden border border-slate-100 transition-all duration-150"
                style={{
                  background: "#f1f5f9",
                  ...(boxSize
                    ? { width: boxSize.width, height: boxSize.height }
                    : { width: 0, height: 0 }),
                }}
              >
                <img
                  ref={imageRef}
                  src={thumbnails[activeThumb] || info.mainImage}
                  alt="blood smear"
                  style={{ display: "none" }}
                  onLoad={draw}
                  onError={(e) => {
                    e.target.src =
                      "https://placehold.co/400x300/f3e8ff/a855f7?text=Blood+Smear";
                  }}
                />
                <canvas ref={canvasRef} className="w-full h-full" />
              </div>
            </div>

            {/* Thumbnails */}
            <div className="flex items-center gap-2 max-w-xl mx-auto">
              <button
                onClick={handlePrevThumb}
                disabled={activeThumb === 0}
                className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M15 18l-6-6 6-6"
                    stroke="#64748b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <div className="flex gap-2 flex-1 justify-center overflow-hidden">
                {thumbnails.slice(thumbStart, thumbStart + 4).map((src, i) => (
                  <button
                    key={i + thumbStart}
                    onClick={() => updateActiveThumb(i + thumbStart)}
                    className={`w-28 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                      activeThumb === i + thumbStart
                        ? "border-blue-400 shadow-md"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={src}
                      alt={`thumb-${i}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = `https://placehold.co/100x60/f3e8ff/a855f7?text=${i + 1}`;
                      }}
                    />
                  </button>
                ))}
              </div>

              <button
                onClick={handleNextThumb}
                disabled={activeThumb >= thumbnails.length - 1}
                className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="#64748b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Right: info section */}
          <div className="flex flex-col gap-4 w-60 flex-shrink-0">
            {/* Doctor info */}
            <div className="flex items-center gap-3 rounded-lg -m-1 p-1">
              {doctorAvatar ? (
                <img
                  src={doctorAvatar}
                  alt="doctor"
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: "#b8d4e8", color: "#1a3a5c" }}
                >
                  {(() => {
                    const parts = doctorName
                      ? doctorName.trim().split(/\s+/)
                      : [];
                    if (parts.length === 0) return "Dr";
                    return parts.length >= 2
                      ? (parts[0][0] || "") + (parts[parts.length - 1][0] || "")
                      : parts[0][0] || "";
                  })()}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-slate-800">{doctorName}</p>
                {doctorDate && (
                  <p className="text-xs text-slate-400">{doctorDate}</p>
                )}
              </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-col gap-1.5 text-sm text-slate-600">
              {[
                ["Smear ID", smearId],
                ["Chicken type", info.chickenType],
                ["Province", info.province],
                ["Age", age],
                ["Sex", info.sex || "-"],
                ["Stain type", info.stainType],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between items-start gap-2"
                >
                  <span className="text-slate-700 text-xs font-semibold whitespace-nowrap">
                    {label} :
                  </span>
                  <span className="text-slate-400 text-xs text-right font-medium">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Cell Distribution */}
            <div className="rounded-lg overflow-hidden border border-blue-100 shadow-sm flex-1 flex flex-col">
              <div className="px-4 py-2 bg-blue-500">
                <p className="text-white text-sm font-bold">
                  Prediction Results
                </p>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-center">
                {distribution.map((cell) => {
                  if (cell.label === "Thrombocyte") {
                    return (
                      <div
                        key={cell.label}
                        className="mb-2 pt-1 border-t border-dashed border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: cell.color }}
                            />
                            <span className="text-xs font-medium text-gray-700">
                              {cell.label}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-gray-700">
                            {cell.count}{" "}
                            <span className="text-[10px] font-normal text-gray-400">
                              cells
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={cell.label} className="mb-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: cell.color }}
                          />
                          <span className="text-xs text-gray-700">
                            {cell.label}
                          </span>
                        </div>
                        <span className="text-xs">
                          <span className="font-semibold text-gray-500">
                            {cell.count}
                          </span>{" "}
                          <span className="font-normal text-gray-400">
                            ({cell.percent}%)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full transition-all duration-700"
                          style={{
                            width: `${cell.percent}%`,
                            background: cell.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="mx-4 mb-4 mt-auto flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-500">Total cells</span>
                <span className="text-sm font-medium text-gray-700">
                  {total}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
