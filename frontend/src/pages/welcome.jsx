import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import NavbarWelcome from "../components/navbar_welcome";
import Footer from "../components/footer";
import { TestTube2 } from "lucide-react";
import {
  predictBloodCell9k,
  predictBloodCell4kr,
} from "../services/predict.js";

const CELLS = [
  // --- Wright's Stain ---
  {
    title: "Heterophil",
    image: "/assets/Heterophil-w.jpg",
    stain: "Wright's stain",
    features: [
      "<strong>Morphology:</strong> Round cells with a diameter about 9.07 μm.",
      "<strong>Nucleus:</strong> Bi-lobed (occasionally, 3 lobes), purple-stained nucleus, pushed toward the cell periphery by dense granules.",
      "<strong>Cytoplasm and Granules:</strong> Cytoplasm is light grey to colorless, containing spindle-shaped, dark eosinophilic granules.",
    ],
  },
  {
    title: "Eosinophil",
    image: "/assets/Eosinophil-w.jpg",
    stain: "Wright's stain",
    features: [
      "<strong>Morphology:</strong> Round cells with a diameter about 9.21 μm.",
      "<strong>Nucleus:</strong> Segmented (2 - 3 lobes), purple-stained nucleus, pushed toward the cell periphery by dense granules.",
      "<strong>Cytoplasm and Granules:</strong> Cytoplasm is light grey to colorless, containing round-shaped, bright eosinophilic granules.",
    ],
  },
  {
    title: "Basophil",
    image: "/assets/Basophil-w.jpg",
    stain: "Wright's stain",
    features: [
      "<strong>Morphology:</strong> Round cells with a diameter about 9.38 μm.",
      "<strong>Nucleus:</strong> Round, purple-stained nucleus, often obscured by dense granules.",
      "<strong>Cytoplasm and Granules:</strong> Cytoplasm contains small round-shaped, basophilic granules.",
    ],
  },
  {
    title: "Lymphocyte",
    image: "/assets/Lymphocyte-w.jpg",
    stain: "Wright's stain",
    features: [
      "<strong>Morphology:</strong> Round cells with a diameter ranging from 5.80 to 10.92 μm.",
      "<strong>Nucleus:</strong> Round, purple-stained nucleus, located eccentrically.",
      "<strong>Cytoplasm and Granules:</strong> Light blue without granules.",
    ],
  },
  {
    title: "Monocyte",
    image: "/assets/Monocyte-w.jpg",
    stain: "Wright's stain",
    features: [
      "<strong>Morphology:</strong> Round cells with a diameter about 11.83 μm.",
      "<strong>Nucleus:</strong> Round to oval or irregularly shaped, purple-stained nucleus.",
      "<strong>Cytoplasm and Granules:</strong> Gray-blue, without granules, sometimes containing several vacuoles.",
    ],
  },
  {
    title: "Thrombocyte",
    image: "/assets/Thrombocyte-w.jpg",
    stain: "Wright's stain",
    features: [
      "<strong>Morphology:</strong> Round to oval cells with a diameter about 4.89 μm.",
      "<strong>Nucleus:</strong> Round to oval, purple-stained nucleus.",
      "<strong>Cytoplasm and Granules:</strong> Colorless, containing azurophilic granules and vacuoles.",
    ],
  },

  // --- Giemsa Stain ---
  {
    title: "Heterophil",
    image: "/assets/Heterophil-G.jpg",
    stain: "Giemsa stain",
    features: [
      "<strong>Morphology:</strong> Round cells with a diameter about 9.07 μm.",
      "<strong>Nucleus:</strong> Bi-lobed (occasionally, 3 lobes), purple-stained nucleus, pushed toward the cell periphery by dense granules.",
      "<strong>Cytoplasm and Granules:</strong> Cytoplasm is light gray to colorless, with granules not visible due to the staining process.",
    ],
  },
  {
    title: "Eosinophil",
    image: "/assets/Eosinophil-G.jpg",
    stain: "Giemsa stain",
    features: [
      "<strong>Morphology:</strong> Round cells with a diameter about 9.21 μm.",
      "<strong>Nucleus:</strong> Segmented (2 - 3 lobes), purple-stained nucleus, pushed toward the cell periphery by dense granules.",
      "<strong>Cytoplasm and Granules:</strong> Cytoplasm is light gray to colorless, with indistinct granules.",
    ],
  },
  {
    title: "Basophil",
    image: "/assets/Basophil-G.jpg",
    stain: "Giemsa stain",
    features: [
      "<strong>Morphology:</strong> Round cells with a diameter about 9.38 μm.",
      "<strong>Nucleus:</strong> Round, purple-stained nucleus.",
      "<strong>Cytoplasm and Granules:</strong> Cytoplasm has no granules, not due to the staining process.",
    ],
  },
  {
    title: "Lymphocyte",
    image: "/assets/Lymphocyte-G.jpg",
    stain: "Giemsa stain",
    features: [
      "<strong>Morphology:</strong> Round cells with a diameter ranging from 5.80 to 10.92 μm.",
      "<strong>Nucleus:</strong> Round, purple-stained nucleus, located eccentrically.",
      "<strong>Cytoplasm and Granules:</strong> Deep blue without granules.",
    ],
  },
  {
    title: "Monocyte",
    image: "/assets/Monocyte-G.jpg",
    stain: "Giemsa stain",
    features: [
      "<strong>Morphology:</strong> Round cells with a diameter about 11.83 μm.",
      "<strong>Nucleus:</strong> Round to oval or irregularly shaped, purple-stained nucleus.",
      "<strong>Cytoplasm and Granules:</strong> Deep purple-blue, without granules, sometimes containing several vacuoles.",
    ],
  },
  {
    title: "Thrombocyte",
    image: "/assets/Thrombocyte-G.jpg",
    stain: "Giemsa stain",
    features: [
      "<strong>Morphology:</strong> Round to oval cells with a diameter about 4.89 μm.",
      "<strong>Nucleus:</strong> Round to oval, purple-stained nucleus.",
      "<strong>Cytoplasm and Granules:</strong> Purple-stained, containing vacuoles.",
    ],
  },
];

const CELL_COLOR_MAP = {
  Basophil: "#9b5de5",
  Eosinophil: "#f15bb5",
  Heterophil: "#00bbf9",
  Lymphocyte: "#06b6a2",
  Monocyte: "#ca8a04",
  Thrombocyte: "#fb5607",
};

const CellCard = ({ title, image, features, stain }) => (
  <div className="bg-white rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col h-full">
    <div className="p-2">
      <div className="w-full h-44 overflow-hidden rounded-xl border-2 border-gray-200 shadow-inner">
        <img src={image} alt={title} className="w-full h-full object-cover " />
      </div>
    </div>
    <div className="px-5 py-3 flex-1 flex flex-col">
      <div className="flex items-center gap-2 mb-0.5">
        <div className="w-1 h-4 rounded-full bg-blue-500 flex-shrink-0" />
        <h3 className="font-playfair text-[16px] font-bold text-blue-600">
          {title}
        </h3>
      </div>
      <p className="text-[13px] text-gray-400 ml-3 mb-2">{stain}</p>
      <ul className="list-none space-y-1.5 ml-3 flex-1">
        {features.map((f, i) => (
          <li
            key={i}
            className="text-[12px] text-gray-600 leading-normal text-left"
            dangerouslySetInnerHTML={{ __html: f }}
          />
        ))}
      </ul>
    </div>
  </div>
);

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

const FullscreenCanvas = ({ predictURL, rawResponse, onClose }) => {
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

    Object.entries(rawResponse.classes).forEach(([className, classData]) => {
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
        onWheel={(e) => {
          e.preventDefault();
          const newScale = Math.min(
            Math.max(scale - e.deltaY * 0.001, MIN_SCALE),
            MAX_SCALE,
          );
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
          src={predictURL}
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

const Welcome = () => {
  const [stainType, setStainType] = useState("wright");
  const [cardIndex, setCardIndex] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [previewAspect, setPreviewAspect] = useState(1);
  const [dragOver, setDragOver] = useState(false);
  const [predictionResults, setPredictionResults] = useState([]);
  const [isPredicted, setIsPredicted] = useState(false);
  const [predictURL, setPredictURL] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rawResponse, setRawResponse] = useState(null);
  const [selectedStain, setSelectedStain] = useState("Wright's stain");
  const fileInputRef = useRef();
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const filteredCells = selectedStain
    ? CELLS.filter((c) => c.stain === selectedStain)
    : CELLS;
  const totalCells = predictionResults.reduce((sum, row) => sum + row.count, 0);

  const visibleCards = filteredCells;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (previewURL) URL.revokeObjectURL(previewURL);
      if (predictURL) URL.revokeObjectURL(predictURL);
      setUploadedFile(file);
      setPreviewURL(URL.createObjectURL(file));
      setPreviewAspect(1);
      setPredictionResults([]);
      setIsPredicted(false);
      setPredictURL(null);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (previewURL) URL.revokeObjectURL(previewURL);
      if (predictURL) URL.revokeObjectURL(predictURL);
      setUploadedFile(file);
      setPreviewURL(URL.createObjectURL(file));
      setPreviewAspect(1);
      setPredictionResults([]);
      setIsPredicted(false);
      setPredictURL(null);
      setScale(1);
      setOffset({ x: 0, y: 0 });
    }
  };
  // วาดผลการตรวจจับเซลล์เม็ดเลือดลงบน Canvas
  const drawBoundingBoxes = (response) => {
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

    Object.entries(response.classes).forEach(([className, classData]) => {
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
  // ส่งภาพไปยัง API เพื่อวิเคราะห์และรับผลการทำนาย
  const handlePredict = async () => {
    if (!uploadedFile) return;
    try {
      const response =
        stainType === "wright"
          ? await predictBloodCell9k(uploadedFile, stainType)
          : await predictBloodCell4kr(uploadedFile, stainType);

      const CELL_TYPES = [
        "Basophil",
        "Eosinophil",
        "Heterophil",
        "Lymphocyte",
        "Monocyte",
        "Thrombocyte",
      ];

      const results = CELL_TYPES.map((type) => {
        const data = response.classes[type];
        return {
          type,
          count: data ? data.count : 0,
          color: CELL_COLOR_MAP[type] || "#999999",
        };
      });
      setPredictURL(previewURL);
      setPredictionResults(results);
      setIsPredicted(true);
      setPreviewURL(null);
      setUploadedFile(null);
      setRawResponse(response);
      setTimeout(() => drawBoundingBoxes(response), 100);
    } catch (err) {
      console.error(err);
      alert("An error has occurred. Please try again.");
    }
  };

  useEffect(() => {
    if (rawResponse) {
      const timer = setTimeout(() => drawBoundingBoxes(rawResponse), 150);
      return () => clearTimeout(timer);
    }
  }, [isFullscreen, rawResponse]);

  return (
    <div className="min-h-screen">
      <NavbarWelcome />

      <section
        className="text-center px-6 pt-16 pb-16 bg-cover bg-center relative min-h-[400px] flex flex-col justify-center"
        style={{ backgroundImage: "url('/assets/Back01.jpg')" }}
      >
        <h1 className="font-playfair text-5xl font-extrabold mb-5 tracking-tight">
          <span className="text-black">Avian</span>{" "}
          <span className="text-blue-500">Blood</span>
        </h1>

        <p className="text-[16px] md:text-[18px] text-gray-600 max-w-3xl mx-auto leading-relaxed">
          The smart, collaborative workspace for avian diagnostics. Upload blood
          smears for instant AI analysis or save them for later, track your
          diagnostic history over time, and explore a shared library of cases
          and results from a global community of professionals.
        </p>
      </section>

      <div
        className="w-full bg-cover bg-center"
        style={{ backgroundImage: "url('/assets/VerifyUsers.png')" }}
      >
        <section className="flex gap-10 px-8 pt-20 pb-20 max-w-7xl mx-auto items-start">
          <div className="flex-1 bg-white rounded-2xl shadow-md p-4 flex flex-col gap-3 h-[720px]">
            <p className="text-[18px] font-semibold text-gray-700 tracking-wide">
              Select Stain Type
            </p>
            <div className="flex gap-3 mb-3">
              {[
                { key: "wright", label: "Wright Stain", color: "#3b9eff" },
                { key: "giemsa", label: "Giemsa Stain", color: "#c678b8" },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setStainType(key)}
                  className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-[15px] font-semibold transition-all duration-150 cursor-pointer
                  ${stainType === key ? "border-[#3b9eff] bg-blue-50 text-[#1a3c6e]" : "border-gray-200 bg-white text-gray-500 hover:border-blue-200"}`}
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 2 C10 2 4 9 4 13 a6 6 0 0 0 12 0 C16 9 10 2 10 2Z"
                      fill={color}
                    />
                  </svg>
                  {label}
                </button>
              ))}
            </div>

            <div
              onClick={() => fileInputRef.current.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 mb-2 overflow-hidden
     ${previewURL ? "" : "min-h-[460px] p-4"}
    ${dragOver ? "border-[#3b9eff] bg-blue-50" : "border-gray-300 bg-gray-50 hover:border-[#3b9eff] hover:bg-blue-50"}`}
            >
              {previewURL ? (
                <div className="w-full flex flex-col items-center">
                  <div
                    className="flex-shrink-0 overflow-hidden rounded-t-[10px] bg-gray-100 flex items-center justify-center"
                    style={{
                      aspectRatio: previewAspect,
                      width: "100%",
                    }}
                  >
                    <img
                      src={previewURL}
                      alt="preview"
                      className="w-full h-full object-contain object-center"
                      onLoad={(e) => {
                        const img = e.target;
                        if (img.naturalWidth && img.naturalHeight) {
                          setPreviewAspect(
                            img.naturalWidth / img.naturalHeight,
                          );
                        }
                      }}
                    />
                  </div>
                  <p className="text-sm font-semibold text-gray-700 text-center break-all px-2 pt-2">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-gray-400 pb-3">
                    แตะเพื่อเปลี่ยนภาพ
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                      <path
                        d="M12 16V8M8 12l4-4 4 4"
                        stroke="#3b9eff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    Upload Image
                  </p>
                  <p className="text-xs text-gray-400">
                    Support: .jpg, .png (max 1 MB)
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <button
              onClick={handlePredict}
              className={`w-full py-4 text-white font-bold text-lg rounded-xl tracking-widest transition-colors duration-200 cursor-pointer mt-auto
    ${uploadedFile ? "bg-blue-500 hover:bg-blue-600" : "bg-gray-400 hover:bg-gray-500"}`}
            >
              Predict
            </button>
          </div>

          <div className="flex-[1.4] bg-white rounded-2xl shadow-md p-4 flex flex-col gap-3 h-[720px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-playfair text-lg font-bold text-gray-900">
                  Prediction results
                </h3>
                {predictionResults.length > 0 && (
                  <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-3 py-0.5 rounded-full border border-blue-200">
                    {stainType === "wright" ? "Wright Stain" : "Giemsa Stain"}
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  if (previewURL) URL.revokeObjectURL(previewURL);
                  if (predictURL) URL.revokeObjectURL(predictURL);
                  setUploadedFile(null);
                  setPreviewURL(null);
                  setPredictionResults([]);
                  setIsPredicted(false);
                  setPredictURL(null);
                  setScale(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="flex items-center gap-0.5 bg-[#3b9eff] hover:bg-[#1a80e0] text-white text-[11px] font-semibold px-1 py-1 rounded-full transition-colors duration-200 cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    fill="white"
                    fillOpacity="0.3"
                  />
                  <polygon points="10,8 10,16 17,12" fill="white" />
                </svg>
                New Analysis
              </button>
            </div>

            {/* Image area */}
            <div
              ref={containerRef}
              className="w-full rounded-xl bg-gray-100 relative"
              style={{ height: "360px", overflow: "hidden" }}
              onWheel={(e) => {
                e.preventDefault();
                const newScale = Math.min(
                  Math.max(scale - e.deltaY * 0.001, MIN_SCALE),
                  MAX_SCALE,
                );
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
              {predictionResults.length > 0 && predictURL ? (
                <>
                  <img
                    ref={imageRef}
                    src={predictURL}
                    alt="hidden"
                    style={{ display: "none" }}
                  />
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
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
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                      stroke="white"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="8.5"
                      cy="8.5"
                      r="1.5"
                      stroke="white"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M3 16l5-5 4 4 3-3 6 6"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
              {predictionResults.length > 0 && (
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
                  <button
                    onClick={() => setIsFullscreen(true)}
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
                      <polyline points="15 3 21 3 21 9" />
                      <polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Empty state */}
              {predictionResults.length === 0 && (
                <div className="h-full min-h-[250px] flex items-center justify-center bg-gray-50 rounded-xl">
                  <p className="text-gray-400 text-sm font-medium">
                    There are currently no prediction results.
                  </p>
                </div>
              )}

              {/* Table */}
              {predictionResults.length > 0 && (
                <table className="w-5/6 text-sm table-fixed mx-auto">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs text-gray-400 font-semibold uppercase tracking-wider w-1/2">
                        Cell Type
                      </th>
                      <th className="text-right py-2 px-3 text-xs text-gray-400 font-semibold uppercase tracking-wider w-1/2">
                        Count
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictionResults.map((row) => (
                      <tr
                        key={row.type}
                        className="border-b border-gray-50 hover:bg-blue-50/40 transition-colors"
                      >
                        <td
                          className="py-1.5 px-3 font-semibold text-[13px] w-1/2"
                          style={{ color: row.color }}
                        >
                          {row.type}
                        </td>
                        <td className="py-1.5 px-3 text-gray-600 text-[13px] w-1/2 text-right">
                          {row.count}
                        </td>
                      </tr>
                    ))}

                    <tr className="border-t-2 border-gray-300">
                      <td className="py-2 px-3 font-semibold text-[13px] text-gray-800 w-1/2">
                        Total cells
                      </td>
                      <td className="py-2 px-3 font-semibold text-[13px] text-gray-800 w-1/2 text-right">
                        {totalCells}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="px-8 pb-16 pt-28 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Blood cell</h2>
          <div className="flex gap-1.5">
            {[
              { label: "Wright", value: "Wright's stain" },
              { label: "Giemsa", value: "Giemsa stain" },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setSelectedStain(value)}
                className={`px-3.5 py-1 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  selectedStain === value
                    ? "bg-blue-500 text-white shadow-sm"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {visibleCards.map((cell, i) => (
            <CellCard key={`${cell.title}-${cell.stain}-${i}`} {...cell} />
          ))}
        </div>
      </section>

      <Footer />

      {isFullscreen &&
        rawResponse &&
        predictURL &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center"
            onClick={() => setIsFullscreen(false)}
          >
            <FullscreenCanvas
              predictURL={predictURL}
              rawResponse={rawResponse}
              onClose={() => setIsFullscreen(false)}
            />
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Welcome;
