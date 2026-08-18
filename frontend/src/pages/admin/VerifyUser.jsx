import { useCallback, useEffect, useState } from "react";
import {
  Check,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import Pagination from "../../components/Pagination";
import {
  SkeletonValue,
  TableSkeletonRows,
} from "../../components/AdminSkeleton";
import {
  approveUser,
  getPendingUsers,
  rejectUser,
  undoRejectUser,
} from "../../services/admin/VerifyUser";
import { formatAdminDate } from "../../utils/adminDate";
import { formatCompactNumber } from "../../utils/formatCompactNumber";

// แปลง response เป็น array เสมอ เพราะ backend แต่ละเวอร์ชันอาจห่อข้อมูลไม่เหมือนกัน
const normalizeUsers = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

// อ่านยอดรวมแต่ละสถานะ และใช้จำนวนแถวปัจจุบันเป็น fallback ของ pending
const normalizeSummary = (data, users = []) => ({
  pending: Number(data?.summary?.pending ?? users.length),
  approvedTotal: Number(data?.summary?.approved_total ?? 0),
  rejectedTotal: Number(data?.summary?.rejected_total ?? 0),
});

function VerifyUser() {
  // จำนวนรายการต่อหน้าต้องตรงกับ limit ที่ส่งให้ backend
  const pageSize = 10;
  // state หลักของหน้า: ข้อมูล สถิติ ตัวกรอง pagination และสถานะ UI
  const [pendingUsers, setPendingUsers] = useState([]);
  const [summary, setSummary] = useState({
    pending: 0,
    approvedTotal: 0,
    rejectedTotal: 0,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalItems: 0,
    currentPage: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  // actionUserId กันการกดซ้ำ ส่วน confirmAction เก็บ user/action ของ modal
  const [actionUserId, setActionUserId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [error, setError] = useState("");

  // โหลดข้อมูลจาก API, normalize รูปแบบ และเก็บ meta สำหรับ pagination
  const loadPendingUsers = useCallback(async () => {
    setError("");
    setLoading(true);

    try {
      const data = await getPendingUsers({
        email: search,
        status,
        page,
        limit: pageSize,
      });

      // เรียงตาม user_id เพื่อให้ลำดับตารางคงที่ระหว่างการโหลด
      const users = normalizeUsers(data).sort(
        (first, second) => Number(first.user_id) - Number(second.user_id),
      );
      setPendingUsers(users);
      setSummary(normalizeSummary(data, users));
      setPagination({
        totalItems: Number(data?.meta?.total_items ?? users.length),
        currentPage: Number(data?.meta?.current_page ?? page),
        totalPages: Math.max(Number(data?.meta?.total_pages ?? 1), 1),
      });
    } catch (err) {
      setError(
        err.response?.data?.message ??
          "Unable to retrieve users awaiting approval",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  // debounce 300 ms เพื่อไม่ยิง API ทุกปุ่มที่กดระหว่างค้นหา
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadPendingUsers();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [loadPendingUsers]);

  // เปลี่ยนคำค้นหาหรือสถานะแล้วต้องเริ่มดูผลลัพธ์จากหน้าแรก
  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  // handler เดียวรองรับ approve/reject/undo โดยเลือก API ตาม action
  const handleVerifyUser = async (userId, action) => {
    setError("");
    setActionUserId(userId);

    try {
      if (action === "approve") {
        await approveUser(userId);
      } else if (action === "restore") {
        await undoRejectUser(userId);
      } else {
        await rejectUser(userId);
      }

      // โหลดซ้ำเพื่อให้รายการ summary และ pagination ตรงกับ backend
      await loadPendingUsers();
    } catch (err) {
      setError(err.response?.data?.message ?? "Unable to update user status");
    } finally {
      setActionUserId(null);
      setConfirmAction(null);
    }
  };

  // modal กลางเก็บทั้งผู้ใช้และ action เพื่อสร้างข้อความยืนยันให้ถูกต้อง
  const openConfirmModal = (user, action) => {
    setConfirmAction({ user, action });
  };

  const closeConfirmModal = () => {
    if (actionUserId) return;
    setConfirmAction(null);
  };

  const confirmTitle =
    confirmAction?.action === "approve"
      ? "Confirm Approval"
      : confirmAction?.action === "restore"
        ? "Restore to Pending"
      : "Confirm Rejection";
  const confirmMessage =
    confirmAction?.action === "approve"
      ? "Approve this user account and allow access to the platform?"
      : confirmAction?.action === "restore"
        ? "Restore this rejected user to the pending verification list?"
      : "Reject this user verification request?";
  const confirmButtonClass =
    confirmAction?.action === "approve"
      ? "bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-200"
      : confirmAction?.action === "restore"
        ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-200"
      : "bg-rose-500 hover:bg-rose-600 focus:ring-rose-200";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-bold text-slate-950">
            Verify Users
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Review veterinary licenses and approve trusted users.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-lg font-medium text-slate-500">Pending</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">
            {loading ? (
              <SkeletonValue className="mt-0" />
            ) : (
              formatCompactNumber(summary.pending)
            )}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-lg font-medium text-slate-500">Approved Total</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">
            {loading ? (
              <SkeletonValue className="mt-0" />
            ) : (
              formatCompactNumber(summary.approvedTotal)
            )}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-lg font-medium text-slate-500">Rejected Total</p>
          <p className="mt-3 text-3xl font-bold text-rose-600">
            {loading ? (
              <SkeletonValue className="mt-0" />
            ) : (
              formatCompactNumber(summary.rejectedTotal)
            )}
          </p>
        </article>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-950">
              Waiting for Approval
            </h2>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={status}
              onChange={handleStatusChange}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-400"
              aria-label="Filter by verification status"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reject">Rejected</option>
            </select>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="search"
                placeholder="Search By Email"
                value={search}
                onChange={handleSearchChange}
                className="w-56 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">User ID</th>
                <th className="px-6 py-3 font-semibold">Applicant</th>
                <th className="px-6 py-3 font-semibold">Role</th>
                <th className="px-6 py-3 font-semibold">License</th>
                <th className="px-6 py-3 font-semibold">Submitted</th>
                <th className="px-6 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <TableSkeletonRows columns={6} />}

              {!loading && error && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-rose-500"
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && pendingUsers.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No users are awaiting approval
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                pendingUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td className="px-6 py-4 text-slate-700">{user.user_id}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-950">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {user.email}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{user.role}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {user.veterinary_license}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatAdminDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {Number(user.is_verified) === 2 ? (
                          <button
                            type="button"
                            disabled={actionUserId === user.user_id}
                            onClick={() => openConfirmModal(user, "restore")}
                            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Restore ${user.first_name} ${user.last_name} to pending`}
                          >
                            <RotateCcw
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            Restore to Pending
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={actionUserId === user.user_id}
                              onClick={() => openConfirmModal(user, "approve")}
                              className="rounded-lg border border-emerald-200 p-2 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Approve ${user.first_name} ${user.last_name}`}
                            >
                              <Check
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </button>
                            <button
                              type="button"
                              disabled={actionUserId === user.user_id}
                              onClick={() => openConfirmModal(user, "reject")}
                              className="rounded-lg border border-rose-200 p-2 text-rose-500 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Reject ${user.first_name} ${user.last_name}`}
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {!loading && !error && (
        <div className="flex justify-center">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {confirmAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
          role="presentation"
          onMouseDown={closeConfirmModal}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  confirmAction.action === "approve" ||
                  confirmAction.action === "restore"
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-rose-100 text-rose-600"
                }`}
              >
                {confirmAction.action === "approve" ? (
                  <Check className="h-5 w-5" />
                ) : confirmAction.action === "restore" ? (
                  <RotateCcw className="h-5 w-5" />
                ) : (
                  <X className="h-5 w-5" />
                )}
              </div>
              <h3
                id="verify-confirm-title"
                className="text-lg font-bold text-slate-950"
              >
                {confirmTitle}
              </h3>
            </div>

            <div className="mt-4">
              <p className="text-sm text-slate-500">{confirmMessage}</p>
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="font-semibold text-slate-950">
                  {confirmAction.user.first_name} {confirmAction.user.last_name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {confirmAction.user.email}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirmModal}
                disabled={actionUserId === confirmAction.user.user_id}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleVerifyUser(
                    confirmAction.user.user_id,
                    confirmAction.action,
                  )
                }
                disabled={actionUserId === confirmAction.user.user_id}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${confirmButtonClass}`}
              >
                {actionUserId === confirmAction.user.user_id
                  ? "Processing..."
                  : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default VerifyUser;
