import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  Database,
  Eye,
  LoaderCircle,
  Search,
} from "lucide-react";
import Pagination from "../../components/Pagination";
import { DateRangeFilter } from "../../components/SearchBar";
import {
  SkeletonValue,
  TableSkeletonRows,
} from "../../components/AdminSkeleton";
import BloodCellDetailModal from "../../components/BloodCellDetailModal";
import { getImageUrl } from "../../services/api";
import {
  getAllDatasets,
  getDatasetById,
  suspendDatasetById,
} from "../../services/admin/DataManagement";
import { formatAdminDate } from "../../utils/adminDate";
import { formatCompactNumber } from "../../utils/formatCompactNumber";

// ค่าเริ่มต้นของการ์ดสถิติ ป้องกัน undefined ระหว่างรอ API
const emptyStatistics = {
  total_images: 0,
  total_batches: 0,
  total_wright: 0,
  total_giemsa: 0,
};

// helper ชุดนี้รองรับชื่อ field หลายแบบ โดยเลือกค่าที่พบตามลำดับ
const getId = (item) =>
  item.batch_id ?? item.dataset_id ?? item.id ?? item.data_id;

const getName = (item) =>
  item.smear_id ??
  item.batch_name ??
  item.dataset_name ??
  item.title ??
  item.name ??
  `Dataset #${getId(item) ?? "-"}`;

const getEmail = (item) =>
  item.user?.email ??
  item.email ??
  item.user_email ??
  item.uploader_email ??
  "-";

const getStain = (item) =>
  item.stain_type ?? item.stainType ?? item.stain ?? "-";

const getImageCount = (item) =>
  item.total_images ??
  item.image_count ??
  item.images_count ??
  item.number_of_images ??
  (Array.isArray(item.images) ? item.images.length : 0);

const getStatus = (item) =>
  item.status ??
  item.prediction_status ??
  item.predict_status ??
  // หากไม่มี status ระดับ dataset จะประเมินจากสถานะของ images เป็น fallback
  (Array.isArray(item.images) && item.images.length > 0
    ? item.images.every((image) =>
        ["complete", "completed", "predicted", "success"].includes(
          String(image.image_status ?? image.status).toLowerCase(),
        ),
      )
      ? "completed"
      : item.images.some((image) =>
            ["processing", "in_progress"].includes(
              String(image.image_status ?? image.status).toLowerCase(),
            ),
          )
        ? "processing"
        : "pending"
    : "pending");

const getCreatedAt = (item) =>
  item.created_at ?? item.createdAt ?? item.uploaded_at ?? item.date;

// แปลงสถานะเป็นชุดสี badge: suspended, completed หรือสถานะที่ยังไม่เสร็จ
const statusStyle = (status) => {
  const normalized = String(status).toLowerCase();
  if (["suspend", "suspended"].includes(normalized)) {
    return "bg-red-100 text-red-600";
  }

  return ["complete", "completed", "predicted", "success"].includes(normalized)
    ? "bg-emerald-50 text-emerald-700"
    : "bg-amber-50 text-amber-700";
};

// mapping ชื่อเซลล์ใน UI กับชื่อ field แบบเดิมของ prediction response
const cellCountFields = {
  Heterophil: "numOfHeterophils",
  Eosinophil: "numOfEosinophils",
  Basophil: "numOfBasophils",
  Lymphocyte: "numOfLymphocytes",
  Monocyte: "numOfMonocytes",
  Thrombocyte: "numOfThrombocytes",
};

/**
 * ทำให้ prediction จาก backend มีโครงสร้างมาตรฐานสำหรับ BloodCellDetailModal
 * รองรับ JSON string, รูปแบบใหม่ที่มี cell_counts และรูปแบบเดิมที่แยก count เป็น field
 */
const normalizePrediction = (prediction) => {
  if (!prediction) return null;

  // prediction บางรายการถูกบันทึกเป็น JSON string จึงต้อง parse ก่อนอ่าน field
  let parsedPrediction = prediction;
  if (typeof prediction === "string") {
    try {
      parsedPrediction = JSON.parse(prediction);
    } catch {
      return null;
    }
  }

  // รูปแบบใหม่พร้อมใช้แล้ว จึงไม่คำนวณทับค่าที่ backend ส่งมา
  if (parsedPrediction.cell_counts || parsedPrediction.cell_percentages) {
    return parsedPrediction;
  }

  // รูปแบบเก่า: รวม count ของเซลล์ทั้งหกชนิดไว้ใต้ cell_counts
  const cellCounts = Object.fromEntries(
    Object.entries(cellCountFields).map(([label, field]) => [
      label,
      Number(parsedPrediction[field] ?? 0),
    ]),
  );

  // คำนวณ percentage เป็น fallback เมื่อ response แบบเก่าไม่มีค่าให้
  const totalCells = Object.values(cellCounts).reduce(
    (total, count) => total + count,
    0,
  );
  const cellPercentages = Object.fromEntries(
    Object.entries(cellCounts).map(([label, count]) => [
      label,
      totalCells > 0 ? (count / totalCells) * 100 : 0,
    ]),
  );

  // ทำให้ทุก detection อ่านพิกัดผ่าน bbox ได้ ทั้งรูปแบบ nested และ flat
  const detections = Array.isArray(parsedPrediction.detections)
    ? parsedPrediction.detections.map((detection) => ({
        ...detection,
        bbox: detection.bbox ?? {
          x1: detection.x1,
          y1: detection.y1,
          x2: detection.x2,
          y2: detection.y2,
          width: detection.width,
          height: detection.height,
        },
      }))
    : [];

  return {
    cell_counts: cellCounts,
    cell_percentages: cellPercentages,
    detections,
  };
};

/**
 * แปลง dataset จาก API เป็น props ที่ modal รายละเอียดต้องการ
 * รวมข้อมูลเจ้าของ รูปภาพ prediction และ metadata ไว้ในโครงสร้างเดียว
 */
const toModalData = (item) => {
  const images = Array.isArray(item.images) ? item.images : [];
  const user = item.user ?? item.owner ?? {};
  const uploaderName =
    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();

  return {
    id: getId(item),
    smearId: getName(item),
    images: images.map((image) => getImageUrl(image.image_path)),
    imageDetails: images.map((image) => ({
      url: getImageUrl(image.image_path),
      totalCells: image.total_cells_in_image ?? null,
      prediction: normalizePrediction(image.prediction),
    })),
    title: item.description ?? "",
    description: item.description ?? "",
    status: getStatus(item),
    chickenType: item.chicken_type ?? "",
    province: item.province ?? "",
    age: item.age ?? "",
    sex: item.sex ?? "",
    stainType: getStain(item),
    predictedAt: item.predicted_at ?? item.created_at ?? "",
    summary: item.summary ?? null,
    classes: item.summary?.classes ?? null,
    uploaderName: uploaderName || getEmail(item),
    uploaderAvatar: user.profile_image ? getImageUrl(user.profile_image) : null,
    uploaderId: user.user_id ?? user.id ?? null,
  };
};

function AdminDataManagement() {
  // datasets คือข้อมูลตารางปัจจุบัน ส่วน statistics/meta มาจาก endpoint รายการ
  const [datasets, setDatasets] = useState([]);
  const [statistics, setStatistics] = useState(emptyStatistics);
  const [meta, setMeta] = useState({
    total_items: 0,
    current_page: 1,
    per_page: 10,
    total_pages: 0,
  });
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [stainFilter, setStainFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suspendingId, setSuspendingId] = useState(null);

  // selectedDataset เปิด detail modal; suspendCandidate เปิด modal ยืนยัน
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [suspendCandidate, setSuspendCandidate] = useState(null);

  const loadDatasets = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // endpoint รายการเป็นแหล่งข้อมูลหลักของตาราง สถิติ และ pagination
      const data = await getAllDatasets({
        page,
        limit: 10,
        email: search,
        startDate,
        endDate,
        stainType: stainFilter,
        status: statusFilter,
      });
      const tableData = Array.isArray(data?.table_data) ? data.table_data : [];

      // เติมรายละเอียดรายตัวเฉพาะแถวที่ข้อมูลสำหรับ modal ยังไม่ครบ
      const enrichedDatasets = await Promise.all(
        tableData.map(async (item) => {
          const id = getId(item);
          if (id === undefined || id === null) {
            return item;
          }

          // หากมี images และข้อมูลเจ้าของแล้ว ไม่ต้องยิง request รายละเอียดซ้ำ
          const hasModalDetail =
            Array.isArray(item.images) &&
            item.images.length > 0 &&
            item.user?.email;
          if (hasModalDetail) return item;

          try {
            const detailResponse = await getDatasetById(id);
            const detail =
              detailResponse?.batch ??
              detailResponse?.dataset ??
              detailResponse?.data ??
              detailResponse;

            return detail && typeof detail === "object"
              ? { ...item, ...detail }
              : item;
          } catch {
            return item;
          }
        }),
      );

      // statistics/meta เป็นค่าจาก backend ไม่ได้นับเฉพาะแถวในหน้าปัจจุบัน
      setDatasets(enrichedDatasets);
      setStatistics({ ...emptyStatistics, ...data?.statistics });
      setMeta((current) => ({ ...current, ...data?.meta }));
    } catch (err) {
      setError(err.response?.data?.message ?? "Unable to retrieve dataset data");
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  }, [endDate, page, search, stainFilter, startDate, statusFilter]);

  useEffect(() => {
    // debounce การค้นหา และโหลดใหม่เมื่อ page หรือ search เปลี่ยน
    const timeoutId = window.setTimeout(loadDatasets, 300);
    return () => window.clearTimeout(timeoutId);
  }, [loadDatasets]);

  // ระงับ dataset หลังยืนยัน และถ้าหน้าปัจจุบันว่างให้ย้อนกลับหนึ่งหน้า
  const handleSuspend = async () => {
    const item = suspendCandidate;
    if (!item) return;

    const id = getId(item);
    if (id === undefined || id === null) {
      setError("Dataset ID not found");
      return;
    }

    setSuspendingId(id);
    setError("");
    try {
      await suspendDatasetById(id);
      if (datasets.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        await loadDatasets();
      }
    } catch (err) {
      setError(err.response?.data?.message ?? "Unable to suspend the dataset");
    } finally {
      setSuspendingId(null);
      setSuspendCandidate(null);
    }
  };

  // ไม่ให้ปิด modal ระหว่าง request suspend เพื่อกัน action ซ้ำ
  const closeSuspendModal = () => {
    if (suspendingId !== null) return;
    setSuspendCandidate(null);
  };

  const totalPages = Number(meta.total_pages) || 0;
  const currentPage = Number(meta.current_page) || page;
  const updateFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const handleDateFilterChange = (range) => {
    const toApiDate = (date) => {
      if (!date) return "";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    setStartDate(toApiDate(range?.start));
    setEndDate(toApiDate(range?.end || range?.start));
    setPage(1);
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="mt-1 text-3xl font-bold text-slate-950">
          Data Management
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Organize uploaded datasets and inspect prediction results.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Images", statistics.total_images, "text-slate-950"],
          ["Datasets", statistics.total_batches, "text-cyan-600"],
          ["Wright Stain", statistics.total_wright, "text-blue-600"],
          ["Giemsa Stain", statistics.total_giemsa, "text-violet-600"],
        ].map(([label, value, color]) => (
          <article
            key={label}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-lg font-medium text-slate-500">{label}</p>
            <p className={`mt-3 text-3xl font-bold ${color}`}>
              {loading ? (
                <SkeletonValue className="mt-0" />
              ) : (
                formatCompactNumber(value)
              )}
            </p>
          </article>
        ))}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-950">Datasets</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <label className="flex h-[38px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search by email"
                value={search}
                onChange={updateFilter(setSearch)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 sm:w-56"
              />
            </label>

            <label>
              <select
                value={stainFilter}
                onChange={updateFilter(setStainFilter)}
                className="h-[38px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                aria-label="Filter by stain type"
              >
                <option value="">All stain types</option>
                <option value="Wright">Wright</option>
                <option value="Giemsa">Giemsa</option>
              </select>
            </label>

            <label>
              <select
                value={statusFilter}
                onChange={updateFilter(setStatusFilter)}
                className="h-[38px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                aria-label="Filter by dataset status"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>

            <DateRangeFilter
              onChange={handleDateFilterChange}
              label="Sort by Date"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">Dataset</th>
                <th className="px-6 py-3 font-semibold">Stain</th>
                <th className="px-6 py-3 font-semibold">Images</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Created at</th>
                <th className="px-6 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <TableSkeletonRows columns={6} />}
              {!loading && datasets.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    No dataset records found
                  </td>
                </tr>
              )}
              {!loading &&
                datasets.map((item, index) => {
                  const id = getId(item);
                  const status = getStatus(item);
                  const isSuspended = ["suspend", "suspended"].includes(
                    String(status).toLowerCase(),
                  );
                  return (
                    <tr
                      key={id ?? `${getName(item)}-${index}`}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-950">
                          {getName(item)}
                        </p>
                        <p className="text-slate-500">{getEmail(item)}</p>
                      </td>
                      <td className="px-6 py-4 capitalize text-slate-700">
                        {getStain(item)}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {Number(getImageCount(item) || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle(status)}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatAdminDate(getCreatedAt(item))}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedDataset(toModalData(item))
                            }
                            disabled={id === undefined || id === null}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={`View ${getName(item)}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {!isSuspended && (
                            <button
                              type="button"
                              onClick={() => setSuspendCandidate(item)}
                              disabled={suspendingId === id}
                              className="rounded-lg border border-rose-200 p-2 text-rose-500 transition hover:bg-rose-50 disabled:cursor-wait disabled:opacity-50"
                              aria-label={`Suspend ${getName(item)}`}
                            >
                              {suspendingId === id ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <Ban className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

      </section>

      {!loading && Number(meta.total_items) > 0 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.max(totalPages, 1)}
            onPageChange={setPage}
          />
        </div>
      )}

      {selectedDataset && (
        <BloodCellDetailModal
          data={selectedDataset}
          onClose={() => setSelectedDataset(null)}
        />
      )}

      {suspendCandidate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
          role="presentation"
          onMouseDown={closeSuspendModal}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dataset-suspend-confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <Ban className="h-5 w-5" />
              </div>
              <h3
                id="dataset-suspend-confirm-title"
                className="text-lg font-bold text-slate-950"
              >
                Confirm Suspension
              </h3>
            </div>

            <div className="mt-4">
              <p className="text-sm text-slate-500">
                Suspend this dataset and prevent it from being used?
              </p>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-950">
                  Smear ID: {getName(suspendCandidate)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {getEmail(suspendCandidate)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeSuspendModal}
                disabled={suspendingId === getId(suspendCandidate)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspend}
                disabled={suspendingId === getId(suspendCandidate)}
                className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-600 focus:outline-none focus:ring-4 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {suspendingId === getId(suspendCandidate)
                  ? "Processing..."
                  : "Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminDataManagement;
