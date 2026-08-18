import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  Edit3,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";
import Pagination from "../../components/Pagination";
import {
  SkeletonValue,
  TableSkeletonRows,
} from "../../components/AdminSkeleton";
import { getImageUrl } from "../../services/api";
import {
  activateUser,
  getAllUsers,
  suspendUser,
  updateUserRole,
} from "../../services/admin/UserManagement";
import { formatCompactNumber } from "../../utils/formatCompactNumber";
import { formatAdminDate } from "../../utils/adminDate";

// ทำให้รายการผู้ใช้เป็น array เสมอ แม้ response จะห่อข้อมูลต่างกัน
const normalizeUsers = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

// อ่านยอดรวมจาก backend; คืน null เพื่อเปิดใช้ fallback หากไม่มี summary
const normalizeSummary = (data) => {
  const summary = data?.summary;

  if (!summary) return null;

  return {
    total: Number(summary.total_users ?? summary.totalUsers ?? 0),
    active: Number(summary.active_accounts ?? summary.activeAccounts ?? 0),
    suspended: Number(summary.suspended ?? 0),
  };
};

// สร้างอักษรย่อสองตัวสำหรับ avatar เมื่อผู้ใช้ไม่มีรูปโปรไฟล์
const getInitials = (name = "") => {
  const parts = name.trim().split(/\s+/);

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  const clean = name.replace(/[^a-zA-Zก-๙]/g, "");
  return clean.slice(0, 2).toUpperCase();
};

// รองรับ is_active ทั้ง boolean, string และตัวเลขจาก backend/database
const isUserActive = (user) => {
  return (
    user.is_active === true ||
    user.is_active === "true" ||
    Number(user.is_active) === 1
  );
};

// บัญชีที่ไม่เข้าเงื่อนไข active จะถือว่า suspended
const isUserSuspended = (user) => {
  return !isUserActive(user);
};

// แปลงสถานะบัญชีเป็นข้อความและ class สีของ badge ในตาราง
const getAccountStatus = (user) => {
  if (isUserSuspended(user)) {
    return {
      label: "Suspended",
      className: "text-red-600 bg-red-100",
    };
  }

  return {
    label: "Active",
    className: "text-green-600 bg-green-100",
  };
};

const roleOptions = ["admin", "user"];

function AdminUserManagement() {
  // users คือข้อมูลหน้าปัจจุบัน ส่วน apiSummary คือยอดรวมทุกหน้าจาก backend
  const [users, setUsers] = useState([]);
  const [apiSummary, setApiSummary] = useState(null);
  // ตัวกรองเหล่านี้ถูกส่งไป backend และใช้ร่วมกับ pagination
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  // meta เก็บจำนวนรายการ หน้าปัจจุบัน และจำนวนหน้าที่ backend ส่งกลับ
  const [meta, setMeta] = useState({
    total_items: 0,
    current_page: 1,
    per_page: 10,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // actionUserId ใช้กัน action ซ้ำ และ confirmAction เก็บข้อมูลของ modal
  const [actionUserId, setActionUserId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const loadUsers = useCallback(
    async ({
      email = search,
      role = roleFilter,
      status = statusFilter,
      currentPage = page,
    } = {}) => {
      setError("");
      setLoading(true);

      try {
        // ให้ backend ค้นหาและกรอง เพื่อให้ผลรวมถูกต้องข้ามทุกหน้า
        const data = await getAllUsers({
          email,
          role,
          status,
          page: currentPage,
          limit,
        });

        // เรียง ID เพื่อให้ลำดับในตารางคงที่ก่อนนำไปแสดง
        setUsers(
          [...normalizeUsers(data)].sort(
            (firstUser, secondUser) =>
              Number(firstUser.user_id) - Number(secondUser.user_id),
          ),
        );
        setApiSummary(normalizeSummary(data));
        setMeta((current) => ({ ...current, ...data?.meta }));
      } catch (err) {
        setError(err.response?.data?.message ?? "Unable to retrieve user data");
      } finally {
        setLoading(false);
      }
    },
    [limit, page, roleFilter, search, statusFilter],
  );

  useEffect(() => {
    // debounce 300 ms ลดการยิง API ระหว่างที่ admin กำลังพิมพ์
    const timeoutId = window.setTimeout(() => {
      loadUsers({
        email: search,
        role: roleFilter,
        status: statusFilter,
        currentPage: page,
      });
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [loadUsers, page, roleFilter, search, statusFilter]);

  // เมื่อ filter เปลี่ยนต้องกลับหน้าแรก เพราะผลลัพธ์ชุดใหม่อาจมีจำนวนหน้าน้อยลง
  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleFilterChange = (value) => {
    setRoleFilter(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const summary = useMemo(() => {
    // fallback นับเฉพาะข้อมูลหน้าปัจจุบัน และใช้เมื่อ backend ไม่ส่ง summary
    const computedSummary = {
      total: users.length,
      active: users.filter(isUserActive).length,
      suspended: users.filter(isUserSuspended).length,
    };

    return apiSummary ?? computedSummary;
  }, [apiSummary, users]);

  // ทุก mutation โหลดข้อมูลใหม่ เพื่อให้ตารางและ summary ตรงกับฐานข้อมูล
  const handleRoleChange = async (userId, role) => {
    setError("");
    setActionUserId(userId);

    try {
      await updateUserRole(userId, role);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message ?? "Unable to update the role");
    } finally {
      setActionUserId(null);
      setConfirmAction(null);
    }
  };

  const handleSuspendUser = async (user, reason) => {
    setError("");
    setActionUserId(user.user_id);

    try {
      await suspendUser(user.user_id, reason.trim());
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message ?? "Unable to suspend the user account");
    } finally {
      setActionUserId(null);
      setConfirmAction(null);
    }
  };

  const handleActivateUser = async (user) => {
    setError("");
    setActionUserId(user.user_id);

    try {
      await activateUser(user.user_id);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message ?? "Unable to activate the account");
    } finally {
      setActionUserId(null);
      setConfirmAction(null);
    }
  };

  const closeConfirmModal = () => {
    // ระหว่าง request ยังทำงาน ไม่ให้ปิด modal จนกว่าจะทราบผล
    if (actionUserId) return;
    setConfirmAction(null);
  };

  // modal เดียวรองรับหลาย action โดยเก็บ type, user และค่าที่ action ต้องใช้
  const openRoleModal = (user) => {
    setConfirmAction({ type: "role", user, nextRole: user.role ?? "user" });
  };

  const openSuspendModal = (user) => {
    setConfirmAction({ type: "suspend", user, reason: "" });
  };

  const openActivateModal = (user) => {
    setConfirmAction({ type: "activate", user });
  };

  const confirmTitle =
    confirmAction?.type === "role"
      ? "Change User Role"
      : confirmAction?.type === "activate"
        ? "Reactivate Account"
        : "Suspend Account";
  const confirmMessage =
    confirmAction?.type === "role"
      ? "Select the role you want to assign to this user."
      : confirmAction?.type === "activate"
        ? "Reactivate this user account?"
        : "Suspend this user account?";
  const confirmButtonClass =
    confirmAction?.type === "role"
      ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-200"
      : confirmAction?.type === "activate"
        ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-200"
        : "bg-rose-500 hover:bg-rose-600 focus:ring-rose-200";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">
            User Management
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Manage roles, account status, and access for the platform.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm">
          <p className="text-lg font-medium text-slate-500">Total Users</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">
            {loading ? (
              <SkeletonValue className="mt-0" />
            ) : (
              formatCompactNumber(summary.total)
            )}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm">
          <p className="text-lg font-medium text-slate-500">Active Accounts</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">
            {loading ? (
              <SkeletonValue className="mt-0" />
            ) : (
              formatCompactNumber(summary.active)
            )}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm">
          <p className="text-lg font-medium text-slate-500">Suspended</p>
          <p className="mt-3 text-3xl font-bold text-rose-600">
            {loading ? (
              <SkeletonValue className="mt-0" />
            ) : (
              formatCompactNumber(summary.suspended)
            )}
          </p>
        </article>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-xl font-bold text-slate-950">All Users</h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={roleFilter}
              onChange={(event) => handleRoleFilterChange(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                handleStatusFilterChange(event.target.value)
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              aria-label="Filter by account status"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspend">Suspended</option>
            </select>

            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search by email"
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="w-56 bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 font-semibold">ID</th>
                <th className="px-6 py-3 font-semibold">Photo</th>
                <th className="px-6 py-3 font-semibold">User</th>
                <th className="px-6 py-3 font-semibold">Role</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Verified Date</th>
                <th className="px-6 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <TableSkeletonRows columns={7} />}

              {!loading && error && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-10 text-center text-rose-500"
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && users.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No user records found
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                users.map((user) => {
                  const status = getAccountStatus(user);
                  const fullName =
                    `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
                    user.email;
                  const isSuspended = isUserSuspended(user);

                  return (
                    <tr key={user.user_id}>
                      <td className="px-6 py-4 text-slate-700">
                        {user.user_id}
                      </td>
                      <td className="px-6 py-4">
                        {user.profile_image ? (
                          <img
                            src={getImageUrl(user.profile_image)}
                            alt={fullName}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 select-none items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white">
                            {getInitials(fullName)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-950">
                          {fullName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {user.email}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{user.role}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {formatAdminDate(user.verified_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {!isSuspended && (
                            <button
                              type="button"
                              disabled={actionUserId === user.user_id}
                              onClick={() => openRoleModal(user)}
                              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label={`Change role for ${fullName}`}
                            >
                              <Edit3 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={actionUserId === user.user_id}
                            onClick={() =>
                              isSuspended
                                ? openActivateModal(user)
                                : openSuspendModal(user)
                            }
                            className={`inline-flex items-center gap-2 rounded-lg border text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                              isSuspended
                                ? "border-emerald-200 px-3 py-2 text-emerald-600 hover:bg-emerald-50"
                                : "border-rose-200 p-2 text-rose-500 hover:bg-rose-50"
                            }`}
                            aria-label={
                              isSuspended
                                ? `Reactivate ${fullName}`
                                : `Suspend ${fullName}`
                            }
                          >
                            {isSuspended ? (
                              <>
                                <RotateCcw
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                                Reactivate
                              </>
                            ) : (
                              <Ban className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

      </section>

      {!loading && !error && meta.total_pages > 0 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={meta.current_page}
            totalPages={meta.total_pages}
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
            aria-labelledby="user-action-confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  confirmAction.type === "role"
                    ? "bg-blue-100 text-blue-600"
                    : confirmAction.type === "activate"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-rose-100 text-rose-600"
                }`}
              >
                {confirmAction.type === "role" ? (
                  <Edit3 className="h-5 w-5" />
                ) : confirmAction.type === "activate" ? (
                  <RotateCcw className="h-5 w-5" />
                ) : (
                  <Ban className="h-5 w-5" />
                )}
              </div>
              <h3
                id="user-action-confirm-title"
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

              {confirmAction.type === "role" && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {roleOptions.map((role) => {
                    const isSelected = confirmAction.nextRole === role;

                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() =>
                          setConfirmAction((current) => ({
                            ...current,
                            nextRole: role,
                          }))
                        }
                        disabled={actionUserId === confirmAction.user.user_id}
                        className={`rounded-lg border px-4 py-3 text-sm font-semibold capitalize transition-colors focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 text-blue-700 focus:ring-blue-100"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 focus:ring-slate-100"
                        }`}
                        aria-pressed={isSelected}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              )}

              {confirmAction.type === "suspend" && (
                <label className="mt-4 block">
                  <span className="text-sm font-semibold text-slate-700">
                    Suspension reason
                  </span>
                  <span className="ml-1 text-rose-500" aria-hidden="true">
                    *
                  </span>
                  <textarea
                    value={confirmAction.reason}
                    onChange={(event) =>
                      setConfirmAction((current) => ({
                        ...current,
                        reason: event.target.value,
                      }))
                    }
                    rows="3"
                    required
                    disabled={actionUserId === confirmAction.user.user_id}
                    placeholder="Enter the reason for suspending this account"
                    className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50"
                  />
                </label>
              )}
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
                  confirmAction.type === "role"
                    ? handleRoleChange(
                        confirmAction.user.user_id,
                        confirmAction.nextRole,
                      )
                    : confirmAction.type === "activate"
                      ? handleActivateUser(confirmAction.user)
                    : handleSuspendUser(
                        confirmAction.user,
                        confirmAction.reason,
                      )
                }
                disabled={
                  actionUserId === confirmAction.user.user_id ||
                  (confirmAction.type === "suspend" &&
                    !confirmAction.reason.trim())
                }
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${confirmButtonClass}`}
              >
                {actionUserId === confirmAction.user.user_id
                  ? "Processing..."
                  : confirmAction.type === "activate"
                    ? "Reactivate"
                    : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminUserManagement;
