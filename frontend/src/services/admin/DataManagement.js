import { loginClient } from "../api";

/**
 * สร้าง config ของ request ที่ต้องยืนยันสิทธิ์ admin
 * พร้อมตัด query parameter ที่ว่างออก เพื่อไม่ให้ backend นำค่าว่างไปใช้เป็นตัวกรอง
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
 * โหลดรายการ dataset สำหรับตาราง Data Management
 * การค้นหา ตัวกรอง และ pagination ถูกส่งให้ backend ประมวลผล
 * response จึงมีข้อมูลเฉพาะหน้าปัจจุบัน พร้อม statistics และ meta
 */
export const getAllDatasets = async ({
  page = 1,
  limit = 10,
  email = "",
  startDate = "",
  endDate = "",
  stainType = "",
  status = "",
} = {}) => {
  const response = await loginClient.get(
    "/data/admin/all",
    authConfig({
      page,
      limit,
      email: email.trim(),
      startDate,
      endDate,
      stain_type: stainType,
      status,
    }),
  );

  return response.data;
};

/**
 * โหลด dataset รายตัวเมื่อข้อมูลจาก endpoint รายการ
 * ยังไม่มี images, prediction หรือข้อมูลเจ้าของเพียงพอสำหรับ modal
 */
export const getDatasetById = async (datasetId) => {
  const response = await loginClient.get(
    `/data/admin/${encodeURIComponent(datasetId)}`,
    authConfig(),
  );

  return response.data;
};

/**
 * เปลี่ยนสถานะ dataset เป็น suspended ที่ backend
 * encodeURIComponent ป้องกัน ID ที่มีอักขระพิเศษทำให้ URL ผิดรูปแบบ
 */
export const suspendDatasetById = async (datasetId) => {
  const response = await loginClient.patch(
    `/data/admin/suspend/${encodeURIComponent(datasetId)}`,
    {},
    authConfig(),
  );

  return response.data;
};
