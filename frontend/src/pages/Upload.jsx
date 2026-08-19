import { useState, useRef, useEffect } from "react";
import Select from "react-select";
import toast, { Toaster } from "react-hot-toast";
import Navbar from "../components/navbar";
import { useNavigate } from "react-router-dom";
import Footer from "../components/footer";
import { uploadBatch } from "../services/uploade";

function StainButton({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all duration-200 cursor-pointer w-full justify-center
        ${
          active
            ? "border-blue-500 bg-white text-gray-800 shadow-sm"
            : "border-gray-200 bg-white text-gray-500 hover:border-blue-300"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ImageThumbnail({ image, onRemove, onSelect, selected }) {
  return (
    <div
      onClick={() => onSelect(image.id)}
      className="relative cursor-pointer transition-all duration-150 group flex flex-col"
    >
      <div
        className={`w-full aspect-square min-h-[80px] rounded-md overflow-hidden border-2
      ${selected ? "border-gray-400" : "border-transparent"}`}
      >
        <img
          src={image.preview}
          alt={image.name}
          className="w-full h-full object-cover block"
        />
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(image.id);
        }}
        className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow text-gray-400 hover:text-red-500 text-[10px] font-bold leading-none"
      >
        ×
      </button>
      <div className="bg-white text-[9px] text-gray-500 text-center truncate px-1 py-0.5 leading-tight">
        {image.name}
      </div>
    </div>
  );
}

// ── ส่วน Upload Page ────────────────────────────
const thaiProvinces = [
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

const chickenTypes = ["Laying hen", "Native chicken"];
const chickenSexOptions = ["Male", "Female"];

const selectMenuPortalStyle = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};
const selectClassNames = (hasError) => ({
  control: (state) =>
    `!min-h-[38px] !rounded-lg !border !text-xs !cursor-pointer !shadow-none !px-1
    ${hasError ? "!border-red-400 !bg-red-50" : state.isFocused ? "!border-blue-400 !bg-white" : "!border-gray-300 !bg-white"}`,
  valueContainer: () => "!px-2",
  indicatorSeparator: () => "!hidden",
  dropdownIndicator: () => "!text-gray-400 !px-2",
  menu: () =>
    "!mt-2 !rounded-lg !overflow-hidden !border !border-gray-200 !shadow-lg !z-50 !w-full !min-w-full !bg-white",
  menuList: () => "!max-h-[252px] !py-1 !bg-white",
  option: (state) =>
    `!text-sm !cursor-pointer !px-3 !py-2 !rounded-none
    ${state.isSelected ? "!bg-gray-100 !font-semibold !text-gray-800" : state.isFocused ? "!bg-blue-50 !text-gray-600" : "!bg-white !text-gray-600"}`,
  placeholder: () => "!text-gray-400 !px-1",
  singleValue: () => "!text-gray-700 !px-1",
  input: () => "!text-gray-700 !px-1",
});

const Upload = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [stain, setStain] = useState("wright");
  const [images, setImages] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [fields, setFields] = useState({
    smearId: "",
    chickenType: "",
    province: "",
    age: "",
    sex: "",
  });

  const selectedIds = images.filter((i) => i.selected).map((i) => i.id);
  const handleRemove = (id) => {
    const img = images.find((i) => i.id === id);
    if (img?.preview) URL.revokeObjectURL(img.preview);
    setImages((p) => p.filter((img) => img.id !== id));
  };
  const handleSelect = (id) =>
    setImages((p) =>
      p.map((img) =>
        img.id === id ? { ...img, selected: !img.selected } : img,
      ),
    );
  const handleDeleteSelected = () => {
    images
      .filter((i) => i.selected)
      .forEach((i) => {
        if (i.preview) URL.revokeObjectURL(i.preview);
      });
    setImages((p) => p.filter((img) => !img.selected));
  };

  // เก็บข้อมูลไฟล์ที่ผู้ใช้อัปโหลดพร้อมสร้าง URL สำหรับ Preview ภาพ
  const addFiles = (files) => {
    const oversized = Array.from(files).filter((f) => f.size > 1024 * 1024);
    if (oversized.length > 0) {
      toast.error(`${oversized.length} file(s) exceed 1MB and were skipped.`);
    }
    const newImgs = Array.from(files)
      .filter((f) => f.size <= 1024 * 1024)
      .slice(0, 100 - images.length)
      .map((f, idx) => ({
        id: Date.now() + idx,
        name: f.name,
        file: f,
        preview: URL.createObjectURL(f), // สร้าง URL สำหรับแสดงภาพตัวอย่าง
        selected: false,
      }));
    setImages((p) => [...p, ...newImgs]);
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!fields.smearId.trim()) newErrors.smearId = true;
    if (!fields.chickenType.trim()) newErrors.chickenType = true;
    if (!fields.province.trim()) newErrors.province = true;
    if (!fields.age) newErrors.age = true;
    if (!fields.sex.trim()) newErrors.sex = true;
    if (images.length === 0) newErrors.images = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all required fields before proceeding.");
      return;
    }
    setErrors({});

    try {
      setLoading(true);

      // ส่งข้อมูล Metadata และชุดรูปภาพไปยัง API เพื่อบันทึกลงระบบ
      const result = await uploadBatch({
        smear_id: fields.smearId.trim(),
        chicken_type: fields.chickenType.trim(),
        province: fields.province.trim(),
        age: Number(fields.age),
        sex: fields.sex.trim(),
        stain_type: stain === "wright" ? "Wright" : "Giemsa",
        files: images.map((img) => img.file),
      });
      toast.success(
        `${result.message}\nNumber of images: ${result.total_images} File`,
        {
          duration: 5000,
          style: {
            borderRadius: "12px",
            fontSize: "13px",
            padding: "12px 16px",
            whiteSpace: "pre-line",
          },
        },
      );
      setFields({
        smearId: "",
        chickenType: "",
        province: "",
        age: "",
        sex: "",
        description: "",
      });
      setImages([]);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "An error occurred. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    images.forEach((img) => {
      if (img.preview) URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    setFields({ smearId: "", chickenType: "", province: "", age: "", sex: "" });
    setStain("wright");
    setErrors({});
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          error: {
            icon: null,
            style: {
              borderRadius: "12px",
              fontSize: "13px",
              padding: "12px 16px",
            },
          },
        }}
      />
      <Navbar activePage="Upload" />
      <div
        className="flex flex-col min-h-[calc(100vh-64px)] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/assets/VerifyUsers.png')" }}
      >
        <div className="flex-1 flex flex-col items-center px-4 pt-4 pb-32">
          <div className="text-center py-16">
            <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight mb-2">
              Blood Smear Image Save
            </h1>
            <p className="text-sm text-gray-500">
              Used for uploading and storing blood smear images of chicken
              blood.
            </p>
          </div>

          <div className="w-full max-w-5xl flex gap-5 items-stretch relative min-h-[600px]">
            {/* LEFT PANEL */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              <div className="bg-white/95 backdrop-blur rounded-2xl p-5 shadow-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">
                      Smear ID <span className="text-red-500">*</span>
                    </p>
                    <input
                      className={`bg-white rounded-lg px-3 py-2 text-sm text-gray-700 w-full outline-none border ${errors.smearId ? "border-red-400 bg-red-50" : "border-gray-300 focus:border-blue-400"}`}
                      value={fields.smearId}
                      onChange={(e) => {
                        setFields((p) => ({ ...p, smearId: e.target.value }));
                        setErrors((p) => ({ ...p, smearId: false }));
                      }}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">
                      Chicken breed <span className="text-red-500">*</span>
                    </p>
                    <Select
                      unstyled
                      options={chickenTypes.map((type) => ({
                        value: type,
                        label: type,
                      }))}
                      value={
                        fields.chickenType
                          ? {
                              value: fields.chickenType,
                              label: fields.chickenType,
                            }
                          : null
                      }
                      onChange={(opt) => {
                        setFields((p) => ({ ...p, chickenType: opt.value }));
                        setErrors((p) => ({ ...p, chickenType: false }));
                      }}
                      placeholder="-- Select chicken type --"
                      classNames={selectClassNames(errors.chickenType)}
                      styles={selectMenuPortalStyle}
                      menuPortalTarget={document.body}
                      menuPlacement="bottom"
                      isSearchable={false}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">
                      Province <span className="text-red-500">*</span>
                    </p>
                    <Select
                      unstyled
                      options={thaiProvinces.map((prov) => ({
                        value: prov,
                        label: prov,
                      }))}
                      value={
                        fields.province
                          ? { value: fields.province, label: fields.province }
                          : null
                      }
                      onChange={(opt) => {
                        setFields((p) => ({ ...p, province: opt.value }));
                        setErrors((p) => ({ ...p, province: false }));
                      }}
                      placeholder="-- Select province --"
                      classNames={selectClassNames(errors.province)}
                      styles={selectMenuPortalStyle}
                      menuPortalTarget={document.body}
                      menuPlacement="bottom"
                      isSearchable={false}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">
                        Age (week) <span className="text-red-500">*</span>
                      </p>
                      <input
                        type="number"
                        min="1"
                        className={`bg-white rounded-lg px-3 py-2 text-sm text-gray-700 w-full outline-none border ${errors.age ? "border-red-400 bg-red-50" : "border-gray-300 focus:border-blue-400"}`}
                        value={fields.age}
                        onChange={(e) => {
                          setFields((p) => ({ ...p, age: e.target.value }));
                          setErrors((p) => ({ ...p, age: false }));
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">
                        Sex <span className="text-red-500">*</span>
                      </p>
                      <Select
                        unstyled
                        options={chickenSexOptions.map((s) => ({
                          value: s,
                          label: s,
                        }))}
                        value={
                          fields.sex
                            ? { value: fields.sex, label: fields.sex }
                            : null
                        }
                        onChange={(opt) => {
                          setFields((p) => ({ ...p, sex: opt.value }));
                          setErrors((p) => ({ ...p, sex: false }));
                        }}
                        classNames={selectClassNames(errors.sex)}
                        styles={selectMenuPortalStyle}
                        menuPortalTarget={document.body}
                        menuPlacement="bottom"
                        isSearchable={false}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 bg-white backdrop-blur rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-3">
                    Select Stain Type
                  </p>
                  <div className="flex gap-3">
                    <StainButton
                      icon={
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M10 2 C10 2 4 9 4 13 a6 6 0 0 0 12 0 C16 9 10 2 10 2Z"
                            fill="#3b9eff"
                          />
                        </svg>
                      }
                      label="Wright Stain"
                      active={stain === "wright"}
                      onClick={() => setStain("wright")}
                    />
                    <StainButton
                      icon={
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M10 2 C10 2 4 9 4 13 a6 6 0 0 0 12 0 C16 9 10 2 10 2Z"
                            fill="#c678b8"
                          />
                        </svg>
                      }
                      label="Giemsa Stain"
                      active={stain === "giemsa"}
                      onClick={() => setStain("giemsa")}
                    />
                  </div>
                </div>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    addFiles(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 py-8 cursor-pointer transition-all duration-200
                    ${dragging ? "border-blue-500 bg-blue-100" : "border-blue-300 hover:bg-blue-50"}`}
                >
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-300 mb-1">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    Upload Image
                  </p>
                  <p className="text-xs text-gray-400">
                    Support: .jpg, .png (max 1 MB)
                  </p>
                  <p className="text-xs text-gray-400">Max 100 images</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    multiple
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="flex-1 flex flex-col bg-white backdrop-blur rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
                <span className="text-base font-bold text-gray-700">
                  Uploaded Results
                </span>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.length === 0}
                  className="text-sm bg-gray-600 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg font-semibold transition-colors duration-150"
                >
                  Delete selected
                </button>
              </div>
              <div
                className="overflow-y-auto px-3 pb-2 relative scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
                style={{ height: "480px" }}
              >
                {images.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-sm gap-1">
                    <span>No images uploaded yet</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 content-start">
                    {images.map((img) => (
                      <ImageThumbnail
                        key={img.id}
                        image={img}
                        onRemove={handleRemove}
                        onSelect={handleSelect}
                        selected={img.selected}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200 mx-3 shrink-0" />
              <div className="flex gap-2 px-3 py-3 shrink-0">
                <button
                  onClick={handleCancel}
                  className="flex-1 py-2 rounded-xl bg-gray-500 hover:bg-gray-600 text-white text-sm font-semibold transition-colors duration-150"
                >
                  cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-2 rounded-xl bg-gray-700 hover:bg-gray-900 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors duration-150"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  save
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Upload;
