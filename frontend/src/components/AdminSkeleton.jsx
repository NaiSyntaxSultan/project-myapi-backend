/**
 * Placeholder สำหรับค่าตัวเลขบนการ์ดสถิติระหว่างรอ API
 * animate-pulse ช่วยสื่อว่าหน้ายังอยู่ระหว่างโหลดและไม่ได้ค้าง
 */
export function SkeletonValue({ className = "" }) {
  return (
    <span
      className={`mt-3 block h-9 w-16 animate-pulse rounded-md bg-slate-200 ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * สร้างแถวจำลองของตาราง admin ตามจำนวน rows และ columns ที่รับเข้ามา
 * แต่ละคอลัมน์ใช้ความกว้างต่างกันเพื่อเลียนแบบข้อมูลจริงในตาราง
 */
export function TableSkeletonRows({ columns, rows = 5 }) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr key={rowIndex} aria-hidden="true">
      {Array.from({ length: columns }, (_, columnIndex) => (
        <td key={columnIndex} className="px-6 py-4">
          <div
            className={`h-4 animate-pulse rounded bg-slate-200 ${
              columnIndex === 0
                ? "w-20"
                : columnIndex === columns - 1
                  ? "w-10"
                  : columnIndex % 2
                    ? "w-28"
                    : "w-16"
            }`}
          />
          {columnIndex === 1 && (
            <div className="mt-2 h-3 w-36 animate-pulse rounded bg-slate-100" />
          )}
        </td>
      ))}
    </tr>
  ));
}
