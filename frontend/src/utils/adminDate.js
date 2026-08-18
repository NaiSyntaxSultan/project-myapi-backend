/**
 * แปลงวันที่จาก backend เป็นรูปแบบเดียวกันสำหรับหน้าผู้ดูแลระบบ
 * ผลลัพธ์เป็น "DD Mon YYYY, HH:mm" ตาม timezone ของ browser
 * หากไม่มีค่าหรือแปลงไม่ได้ จะคืน "-" เพื่อไม่ให้ UI แสดง Invalid Date
 */
export const formatAdminDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  // เติมเลขศูนย์ด้านหน้าสำหรับวัน ชั่วโมง และนาทีให้มีสองหลัก
  const pad = (number) => String(number).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return [
    `${pad(date.getDate())} ${months[date.getMonth()]} ${date.getFullYear()}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join(" ");
};
