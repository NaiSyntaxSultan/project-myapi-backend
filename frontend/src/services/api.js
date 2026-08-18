import axios from 'axios';

// กำหนด URL ของ Backend API และ AI Service
// หากไม่มีการตั้งค่าในไฟล์ .env จะใช้ค่า localhost แทน
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost/api';
const AI_BASE = import.meta.env.VITE_AI_BASE_URL ?? 'http://localhost/ai';

// * เพิ่ม Authorization Header อัตโนมัติให้ทุก Request
//  * โดยดึง Access Token จาก Local Storage
const addAuthInterceptor = (client) => {
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    // แนบ Token เพื่อยืนยันตัวตนก่อนส่ง Request
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  return client;
};

// Client สำหรับเรียกใช้งาน AI Prediction API (ต้อง Login ก่อน)
export const predictClient = addAuthInterceptor(axios.create({ baseURL: AI_BASE }));

// Client สำหรับสมัครสมาชิก (ยังไม่มี Token จึงไม่ใช้ Interceptor)
export const registerClient = axios.create({ baseURL: API_BASE });  // ไม่มี interceptor (สมัครสมาชิกยังไม่มี token)

// Client สำหรับเข้าสู่ระบบ (ยังไม่มี Token จึงไม่ใช้ Interceptor)
export const loginClient = axios.create({ baseURL: API_BASE });     // ไม่มี interceptor (ยังไม่ login)

// Client สำหรับอัปโหลดข้อมูลหรือเรียก API ที่ต้องยืนยันตัวตน
export const uploadClient = addAuthInterceptor(axios.create({ baseURL: API_BASE }));

// แปลง Path ของรูปภาพให้เป็น URL ที่สามารถเรียกใช้งานได้
// และรองรับการแปลง "\" เป็น "/" สำหรับการแสดงผลบนเว็บ
export const getImageUrl = (path) =>
  `${API_BASE}/${path.replace(/\\/g, '/')}`;