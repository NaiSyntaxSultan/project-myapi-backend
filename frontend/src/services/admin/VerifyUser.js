import { loginClient } from "../api";

/**
 * สร้าง config สำหรับ API ที่ต้องใช้ token หลัง login
 * อ่าน token ทุกครั้งที่ยิง request เพื่อไม่เก็บ token เก่าไว้ใน module
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
 * ดึงรายชื่อผู้ใช้ตามสถานะการตรวจสอบ พร้อมตัวกรอง email และ pagination
 * keyword จะถูก trim และส่งเฉพาะเมื่อมีคำค้นหาจริง
 */
export const getPendingUsers = async ({
  email = "",
  status = "all",
  page = 1,
  limit = 10,
} = {}) => {
  const config = authConfig();
  const keyword = email.trim();

  config.params = { status, page, limit };
  if (keyword) config.params.email = keyword;

  const response = await loginClient.get("/user/admin/pending", config);
  return response.data;
};

/** อนุมัติบัญชีตาม user_id ให้สามารถเข้าใช้งานระบบได้ */
export const approveUser = async (userId) => {
  const response = await loginClient.patch(
    `/user/admin/approve/${userId}`,
    null,
    authConfig()
  );
  return response.data;
};

/** ปฏิเสธคำขอสมัครของบัญชีตาม user_id */
export const rejectUser = async (userId) => {
  const response = await loginClient.patch(
    `/user/admin/reject/${userId}`,
    null,
    authConfig()
  );
  return response.data;
};

/** ยกเลิกการปฏิเสธและคืนบัญชีกลับไปอยู่ในคิวรออนุมัติ */
export const undoRejectUser = async (userId) => {
  const response = await loginClient.patch(
    `/user/admin/undo-reject/${userId}`,
    null,
    authConfig()
  );
  return response.data;
};
