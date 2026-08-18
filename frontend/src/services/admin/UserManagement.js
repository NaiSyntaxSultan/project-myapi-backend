import { loginClient } from "../api";

/**
 * สร้าง header ยืนยันตัวตนและ query parameters สำหรับ API ของ admin
 * ค่าตัวกรองที่ว่างจะไม่ถูกแนบไปกับ URL
 */
const authConfig = (params = {}) => {
  const token = localStorage.getItem("access_token");
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined,
    ),
  );

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    ...(Object.keys(cleanParams).length ? { params: cleanParams } : {}),
  };
};

/**
 * โหลดบัญชีผู้ใช้ตาม role, email, status และหน้าปัจจุบัน
 * backend เป็นผู้กรองและแบ่งหน้า ส่วน frontend จะ normalize ก่อนแสดงผล
 */
export const getAllUsers = async ({
  role = "",
  email = "",
  status = "",
  page = 1,
  limit = 10,
} = {}) => {
  const response = await loginClient.get(
    "/user/admin/all",
    authConfig({
      role: role.trim(),
      email: email.trim(),
      status,
      page,
      limit,
    }),
  );
  return response.data;
};

/** เปลี่ยน role ของบัญชีที่ระบุ แล้วคืน payload ล่าสุดจาก backend */
export const updateUserRole = async (userId, role) => {
  const response = await loginClient.patch(
    `/user/admin/update-role/${userId}`,
    { role },
    authConfig(),
  );
  return response.data;
};

/** ระงับบัญชีผู้ใช้พร้อมบันทึกเหตุผลที่ admin ระบุ */
export const suspendUser = async (userId, reason) => {
  const response = await loginClient.patch(
    `/user/admin/suspend/${userId}`,
    { reason },
    authConfig(),
  );
  return response.data;
};

/** เปิดใช้งานบัญชีที่ถูกระงับให้กลับมาใช้งานได้อีกครั้ง */
export const activateUser = async (userId) => {
  const response = await loginClient.patch(
    `/user/admin/activate/${userId}`,
    {},
    authConfig(),
  );
  return response.data;
};
