import { useState, useRef, useEffect } from "react";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import { fetchImageBlob, predictBatch } from "../services/Prediction";
import { getImageUrl } from "../services/api";
import { useNavigate, useLocation } from "react-router-dom";

function PredictionDetail() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const smear = state?.smear;
  // เก็บรายการรูปภาพที่ผู้ใช้เลือกสำหรับนำไปทำนายผล
  const [selectedImages, setSelectedImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef(null);

  if (!smear) return <div>Not found</div>;

  const images = smear.images || [];

  // map path -> image_id (ใช้จับคู่กับผลการทำนายที่ backend ส่งกลับมา)
  const pathToIdMap = images.reduce((acc, img) => {
    acc[img.image_path] = img.image_id;
    return acc;
  }, {});

  const toggleSelectAll = () => {
    if (selectedImages.length === images.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(images.map((img) => img.image_path));
    }
  };
  // เลือกหรือยกเลิกการเลือกรูปภาพทีละรายการ
  const toggleImage = (path) => {
    setSelectedImages((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    );
  };

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const handlePredict = async () => {
    if (selectedImages.length === 0) return;
    setIsLoading(true);
    setProgress(5);

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) return prev + Math.floor(Math.random() * 8) + 4;
        if (prev < 75) return prev + Math.floor(Math.random() * 5) + 2;
        if (prev < 92) return prev + 1;
        return prev;
      });
    }, 250);

    try {
      const formData = new FormData();
      formData.append("mode", smear.stain_type.toLowerCase());
      const blobs = await Promise.all(
        selectedImages.map((path) => fetchImageBlob(path)),
      );

      selectedImages.forEach((path, i) => {
        const storedFileName = path.split(/[\\/]/).pop();
        formData.append("images", blobs[i], storedFileName);
      });
      const predictionResult = await predictBatch(formData);

      // สร้าง mapping image_id -> path จริง เพื่อส่งไปให้หน้าแสดงผลจับคู่รูปกับผลทำนาย
      const imagePathMap = selectedImages.reduce((acc, path) => {
        const id = pathToIdMap[path];
        if (id != null) acc[id] = path;
        return acc;
      }, {});

      clearInterval(progressIntervalRef.current);
      setProgress(100);

      setTimeout(() => {
        navigate("/prediction/output", {
          state: { smear, selectedImages, imagePathMap, predictionResult },
        });
      }, 400);
    } catch (err) {
      clearInterval(progressIntervalRef.current);
      console.error(err);
      alert("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setIsLoading(false);
      setProgress(0);
    }
  };

  return (
    <>
      <Navbar activePage="Prediction" />

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 mx-4 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col items-center">
            {/* หัวข้อและตัวเลขเปอร์เซ็นต์ */}
            <div className="w-full flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span>
                <h4 className="text-base font-bold text-gray-800">
                  AI Analyzing Blood Cells...
                </h4>
              </div>
              <span className="text-sm font-bold text-blue-600 font-mono">
                {progress}%
              </span>
            </div>

            {/* หลอด Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-3.5 p-0.5 overflow-hidden shadow-inner mb-3">
              <div
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* ข้อความบอกสถานะตามระดับ % */}
            <p className="text-xs text-gray-500 text-center animate-pulse">
              {progress < 40
                ? `Preparing ${selectedImages.length} image(s)...`
                : progress < 90
                ? "Running cell detection & classification..."
                : "Finalizing predictions and counts..."}
            </p>
          </div>
        </div>
      )}

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
        <div className="max-w-5xl mx-auto px-2 pt-12 pb-16 flex-1 w-full">
          {/* Main card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[600px]">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate(-1)}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5 text-gray-600"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </button>
              <span className="bg-gray-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                {images.length} Images
              </span>
            </div>

            <div className="flex gap-6">
              {/* Left: Info panel */}
              <div className="bg-gray-100 rounded-lg p-4 pt-10 min-w-[260px] w-[260px] min-h-[496px] flex flex-col">
                <p className="font-bold text-sm mb-3">{smear.smear_id}</p>
                <hr className="border-gray-300 mb-3" />

                <div className="flex flex-col gap-2 mb-4">
                  {[
                    { label: "Chicken breed", value: smear.chicken_type },
                    {
                      label: "Age",
                      value: smear.age ? `${smear.age} weeks` : null,
                    },
                    { label: "Sex", value: smear.sex },
                    { label: "Province", value: smear.province },
                    { label: "Stain type", value: smear.stain_type },
                    {
                      label: "Date",
                      value: smear.created_at
                        ? new Date(smear.created_at).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : null,
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold text-gray-800 text-right">
                        {value ?? "-"}
                      </span>
                    </div>
                  ))}
                </div>

                <hr className="border-gray-300 mb-3" />

                <div className="flex justify-between items-center text-sm mb-4">
                  <span className="text-gray-500">Selected</span>
                  <span className="font-semibold text-gray-800">
                    {selectedImages.length} / {images.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={
                      selectedImages.length === images.length &&
                      images.length > 0
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-gray-700">
                    SELECT ALL
                  </span>
                </div>

                <button
                  onClick={handlePredict}
                  disabled={isLoading || selectedImages.length === 0}
                  className="w-full mt-auto bg-white hover:bg-gray-50 disabled:opacity-50
                    text-gray-800 font-semibold py-2.5 rounded-xl text-sm
                    border border-gray-200 transition-colors"
                >
                  {isLoading
                    ? "Predicting..."
                    : `Predict (${selectedImages.length})`}
                </button>
              </div>

              {/* Right: Images grid */}

              <div className="flex-1">
                <div className="grid grid-cols-3 overflow-y-auto pr-1 max-h-[500px]">
                  {images.map((img) => {
                    const url = getImageUrl(img.image_path);
                    const isSelected = selectedImages.includes(img.image_path);
                    return (
                      <div
                        key={img.image_path}
                        className="flex flex-col items-center cursor-pointer"
                        onClick={() => toggleImage(img.image_path)}
                      >
                        <div className="w-[200px] h-[157px] rounded-lg bg-gray-100 relative overflow-hidden">
                          <img
                            src={url}
                            alt={img.image_name}
                            className="w-full h-full object-cover"
                          />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-3 h-3 text-gray-600"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414L8.414 15 3.293 9.879a1 1 0 111.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 mt-1 max-w-[140px] truncate">
                          {img.image_name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <Footer />
        </div>
      </div>
    </>
  );
}
export default PredictionDetail;
