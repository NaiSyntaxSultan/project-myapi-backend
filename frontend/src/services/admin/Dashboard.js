import { loginClient } from "../api";

/**
 * สร้าง config สำหรับ endpoint ของผู้ดูแลระบบ
 * token ถูกอ่านตอนเรียกฟังก์ชันทุกครั้งเพื่อให้ได้ค่าล่าสุดหลัง login
 * และส่งแบบ Bearer token ตามรูปแบบที่ backend ใช้ตรวจสอบสิทธิ์ admin
 */
const authConfig = () => {
  const token = localStorage.getItem("access_token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

/**
 * โหลดข้อมูลสรุปสำหรับหน้า Admin Dashboard
 * page และ limit กำหนดจำนวนผู้ใช้รออนุมัติในตารางย่อยของ dashboard
 * ขณะที่สถิติผู้ใช้และ prediction จะรวมอยู่ใน response เดียวกัน
 *
 * @param {{page?: number, limit?: number}} options pagination ของตารางย่อย
 * @returns {Promise<object>} payload ใน response.data จาก backend
 */
export const getDashboardUsers = async ({ page = 1, limit = 3 } = {}) => {
  const response = await loginClient.get("/user/admin/dashboard", {
    ...authConfig(),
    params: { page, limit },
  });

  return response.data;
};
