import { createElement, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Clock3,
  Hourglass,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getDashboardUsers } from "../../services/admin/Dashboard";
import { formatAdminDate } from "../../utils/adminDate";
import { formatCompactNumber } from "../../utils/formatCompactNumber";
import {
  SkeletonValue,
  TableSkeletonRows,
} from "../../components/AdminSkeleton";

// รองรับชื่อ field วันที่หลายรูปแบบ เผื่อ response แต่ละเวอร์ชันใช้ key ต่างกัน
const submittedAt = (user) =>
  user.created_at ?? user.createdAt ?? user.submitted_at ?? user.submittedAt;

// สร้างชื่อเต็ม และ fallback เป็น name/email เมื่อชื่อหรือนามสกุลไม่มีข้อมูล
const nameOf = (user) =>
  `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
  user.name ||
  user.email ||
  "-";

// config ของการ์ดสถิติ ช่วยให้ render การ์ดทั้งสี่ใบจากโครงสร้างเดียวกัน
const statCards = [
  ["Total Users", "totalUsers", Users, "text-blue-600", "bg-blue-50"],
  [
    "Pending Verification",
    "pendingVerification",
    ShieldCheck,
    "text-amber-600",
    "bg-amber-50",
  ],
  [
    "Completed Predictions",
    "completedPredictions",
    Activity,
    "text-emerald-600",
    "bg-emerald-50",
  ],
  [
    "Pending Prediction",
    "pendingPredictions",
    Hourglass,
    "text-orange-600",
    "bg-orange-50",
  ],
];

/**
 * เลือกค่าตัวเลขตัวแรกที่ backend ส่งมาและแปลงเป็น Number
 * ใช้รองรับ response หลายรูปแบบ หากทุกค่าไม่ถูกต้องจะคืน 0
 */
const numberFrom = (...values) => {
  const value = values.find(
    (item) => item !== undefined && item !== null && item !== "",
  );
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

/**
 * ทำงานคล้าย numberFrom แต่คืน null เมื่อไม่มีค่า
 * null ใช้แยก "backend ไม่ส่ง field" ออกจาก "ค่าจริงเป็น 0"
 */
const optionalNumberFrom = (...values) => {
  const value = values.find(
    (item) => item !== undefined && item !== null && item !== "",
  );
  if (value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/**
 * วาด donut chart สถานะ prediction ด้วย CSS conic-gradient
 * completed และ pending อาจเป็นจำนวนหรือเปอร์เซ็นต์ แต่ต้องเป็นหน่วยเดียวกัน
 * component จะคำนวณสัดส่วนและตำแหน่ง label จากสองค่านี้
 */
function PredictionStatusChart({ completed, pending }) {
  // ป้องกันค่าติดลบหรือค่าที่แปลงเป็นตัวเลขไม่ได้ก่อนคำนวณกราฟ
  const completedValue = Math.max(numberFrom(completed), 0);
  const pendingValue = Math.max(numberFrom(pending), 0);
  const total = completedValue + pendingValue;
  const completedPercent = total > 0 ? (completedValue / total) * 100 : 0;
  const pendingPercent = total > 0 ? (pendingValue / total) * 100 : 0;
  const formatPercent = (value) =>
    Number.isInteger(value) ? value : value.toFixed(1);

  // แปลงเปอร์เซ็นต์เป็นมุมรอบวงกลม แล้วหาพิกัด label รอบ donut
  const labelPosition = (percent) => {
    const angle = (percent / 100) * Math.PI * 2;
    const radius = 50;

    return {
      left: `${50 + Math.sin(angle) * radius}%`,
      top: `${50 - Math.cos(angle) * radius}%`,
    };
  };
  const completedLabelPosition = labelPosition(
    total > 0 ? pendingPercent + completedPercent / 2 : 75,
  );
  const pendingLabelPosition = labelPosition(
    total > 0 ? pendingPercent / 2 : 25,
  );

  // ครอบคลุมกรณีไม่มีข้อมูล มีสถานะเดียว และมีทั้งสองสถานะ
  const chartBackground =
    total === 0
      ? "#e2e8f0"
      : completedValue === 0
        ? "#fb923c"
        : pendingValue === 0
          ? "#4ade80"
          : `conic-gradient(
          #fb923c 0% ${pendingPercent}%,
          #4ade80 ${pendingPercent}% 100%
        )`;

  return (
    <div
      className="relative mx-auto mt-8 aspect-square w-full max-w-80"
      aria-label={`Prediction status: completed ${completedPercent} percent, pending ${pendingPercent} percent`}
    >
      <div
        className="absolute z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl border border-emerald-100 bg-white/95 px-3 py-2 text-center text-sm font-semibold text-emerald-600 backdrop-blur transition-all duration-500"
        style={completedLabelPosition}
      >
        <p>Completed</p>
        <p className="mt-0.5 text-base font-bold">
          {formatPercent(completedPercent)}%
        </p>
      </div>

      <div
        className="absolute inset-[18%] rounded-full border-[6px] border-white transition-all duration-500"
        style={{
          background: chartBackground,
        }}
        role="img"
      >
        <div className="absolute inset-[27%] rounded-full border border-slate-100 bg-white" />
      </div>

      <div
        className="absolute z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl border border-orange-100 bg-white/95 px-3 py-2 text-center text-sm font-semibold text-orange-600 backdrop-blur transition-all duration-500"
        style={pendingLabelPosition}
      >
        <p>Pending</p>
        <p className="mt-0.5 text-base font-bold">
          {formatPercent(pendingPercent)}%
        </p>
      </div>
    </div>
  );
}

function AdminDashboard() {
  // ตัวเลขที่แสดงในการ์ดสรุปด้านบน
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingVerification: 0,
    completedPredictions: 0,
    pendingPredictions: 0,
  });
  // ค่าที่ส่งให้ donut chart แยกจาก stats เพื่อรองรับ percentage จาก backend
  const [predictionStatuses, setPredictionStatuses] = useState({
    completed: 0,
    pending: 0,
  });
  // queue เก็บผู้สมัครล่าสุด ส่วน loading/error ควบคุมสถานะของหน้า
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // ป้องกัน setState หลัง component ถูกถอดระหว่างที่ API ยังทำงาน
    let mounted = true;
    (async () => {
      try {
        // Dashboard แสดงคิวเพียง 3 คน จึงขอข้อมูลหน้าแรกจาก backend
        const data = await getDashboardUsers({ page: 1, limit: 3 });
        const userStatistics = data.user_statistics ?? {};
        const predictionStatistics = data.prediction_statistics ?? {};
        const predictionStatus = data.prediction_status ?? {};
        const bloodInsights = data.avian_blood_insights ?? {};
        const pendingUsers = data.pending_users_table?.data ?? [];

        // อ่านเปอร์เซ็นต์จาก field สำรอง เพื่อรองรับ response หลายเวอร์ชัน
        const completedPercent = optionalNumberFrom(
          predictionStatus.completed_percentage,
          predictionStatistics.completed_percentage,
        );
        const pendingPercent = optionalNumberFrom(
          predictionStatus.pending_percentage,
          predictionStatistics.pending_percentage,
        );

        // ถ้ามีจำนวน completed/pending โดยตรง ให้นำมารวมเป็นยอด dataset
        const directBatchTotal =
          data.completed_batches !== undefined ||
          data.pending_batches !== undefined
            ? numberFrom(data.completed_batches) +
              numberFrom(data.pending_batches)
            : null;
        const totalDatasets = numberFrom(
          directBatchTotal,
          bloodInsights.total_batches,
          data.total_datasets,
          data.prediction_jobs,
        );
        const completedCount = optionalNumberFrom(
          data.completed_batches,
          data.completed_predictions,
          data.completed_prediction_jobs,
          predictionStatistics.completed,
          predictionStatistics.completed_count,
          predictionStatistics.completed_predictions,
          predictionStatus.completed,
          predictionStatus.completed_count,
        );
        const pendingCount = optionalNumberFrom(
          data.pending_batches,
          data.pending_datasets,
          data.pending_prediction_jobs,
          predictionStatistics.pending,
          predictionStatistics.pending_count,
          predictionStatistics.pending_datasets,
          predictionStatus.pending,
          predictionStatus.pending_count,
        );

        // ให้ความสำคัญกับ count จริง; คำนวณจาก percentage เฉพาะเมื่อไม่มี count
        const completedPredictions =
          completedCount ??
          (completedPercent === null
            ? 0
            : Math.round((totalDatasets * completedPercent) / 100));
        const pendingPredictions =
          pendingCount ??
          (pendingPercent === null
            ? 0
            : Math.round((totalDatasets * pendingPercent) / 100));
        if (!mounted) return;

        // สถิติผู้ใช้ใช้ค่าจาก backend และมีชื่อ field สำรองสำหรับ response รุ่นเก่า
        setStats({
          totalUsers: numberFrom(data.total_users, userStatistics.total_users),
          pendingVerification: numberFrom(
            data.pending_verification,
            userStatistics.unverified_users,
            data.pending_users_table?.meta?.total_items,
          ),
          completedPredictions,
          pendingPredictions,
        });
        setPredictionStatuses({
          completed: numberFrom(
            completedPercent,
            completedPredictions,
            bloodInsights.completed_batches,
          ),
          pending: numberFrom(
            pendingPercent,
            pendingPredictions,
            bloodInsights.pending_batches,
          ),
        });

        // กรองผู้ใช้ที่ยังไม่ verified เรียงคนใหม่ก่อน และแสดงสูงสุด 3 คน
        setQueue(
          pendingUsers
            .filter((user) => Number(user.is_verified) === 0)
            .sort((a, b) => new Date(submittedAt(b)) - new Date(submittedAt(a)))
            .slice(0, 3),
        );
      } catch (err) {
        if (mounted)
          setError(
            err.response?.data?.message ?? "Unable to retrieve dashboard data",
          );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="mx-auto w-full max-w-[96rem] min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Monitor users, verification requests, predictions, and dataset
          activity.
        </p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
        {statCards.map(([label, key, StatIcon, color, bg]) => (
          <article
            key={key}
            className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-medium text-slate-500">{label}</p>
                <p className={`mt-3 text-3xl font-bold ${color}`}>
                  {loading ? (
                    <SkeletonValue className="mt-0" />
                  ) : (
                    formatCompactNumber(stats[key])
                  )}
                </p>
              </div>
              <span className={`rounded-lg p-2.5 ${bg} ${color}`}>
                {createElement(StatIcon, { className: "h-5 w-5" })}
              </span>
            </div>
          </article>
        ))}
      </div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Verification Queue
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                New accounts waiting for administrator approval.
              </p>
            </div>
            <Link
              to="/admin/verify-users"
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-[42rem] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">License</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && <TableSkeletonRows columns={4} rows={3} />}
                {!loading && error && (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-4 py-10 text-center text-rose-500"
                    >
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && queue.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No users are awaiting approval
                    </td>
                  </tr>
                )}
                {!loading &&
                  !error &&
                  queue.map((user) => (
                    <tr
                      key={user.user_id ?? user.email}
                      className="text-slate-700"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-slate-950">
                          {nameOf(user)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {user.email}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-medium">
                        {user.veterinary_license ?? user.license ?? "-"}
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {formatAdminDate(submittedAt(user))}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                          <Clock3 className="h-3.5 w-3.5" />
                          Pending
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 pb-12 sm:p-6 sm:pb-14">
          <h2 className="text-lg font-bold text-slate-950">
            Prediction Status
          </h2>
          <PredictionStatusChart
            completed={predictionStatuses.completed}
            pending={predictionStatuses.pending}
          />
        </section>
      </div>
    </section>
  );
}

export default AdminDashboard;
