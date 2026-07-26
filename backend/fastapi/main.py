from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
from collections import defaultdict
import io
from typing import List
import pymysql
import os

# ---------------------------------------------------------------------------
# Database Connection Config
# ---------------------------------------------------------------------------
DB_HOST = os.getenv("DB_HOST", "mysql-db")
DB_USER = os.getenv("DB_USERNAME", "root")
DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
DB_DATABASE = os.getenv("DB_DATABASE", "")

def get_db_connection():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_DATABASE,
        cursorclass=pymysql.cursors.DictCursor
    )


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

CONF_THRESHOLD = 0.001

MODELS = {
    "wright": YOLO("models/wright.pt"),
    "giemsa": YOLO("models/giemsa.pt"),
}


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="YOLO Inference API", root_path="/ai")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def read_image(upload: UploadFile) -> Image.Image:
    raw = upload.file.read()
    return Image.open(io.BytesIO(raw)).convert("RGB")


def extract_bbox(box) -> dict:
    x1, y1, x2, y2 = [round(v, 2) for v in box.xyxy[0].tolist()]
    return {
        "x1":     x1,               # มุมซ้ายบน  แกน X (pixel)
        "y1":     y1,               # มุมซ้ายบน  แกน Y (pixel)
        "x2":     x2,               # มุมขวาล่าง แกน X (pixel)
        "y2":     y2,               # มุมขวาล่าง แกน Y (pixel)
        "width":  round(x2 - x1, 2),
        "height": round(y2 - y1, 2),
    }


def group_by_class(results) -> dict:
    grouped = defaultdict(lambda: {"confidences": [], "detections": []})

    for result in results:
        for box in result.boxes:
            name       = result.names[int(box.cls[0])]
            confidence = round(float(box.conf[0]), 4)

            grouped[name]["confidences"].append(confidence)
            grouped[name]["detections"].append({
                "confidence": confidence,
                "bbox":       extract_bbox(box),
            })

    return grouped


def build_response(mode: str, filename: str, results) -> dict:
    grouped_data = group_by_class(results)

    total_detections = sum(len(data["confidences"]) for data in grouped_data.values())


    classes = {}

    for class_name, data in grouped_data.items():
        count = len(data["confidences"])

        percentage = round((count / total_detections) * 100, 2) if total_detections > 0 else 0.0

        classes[class_name] = {
            "count":          count,
            "percentage": percentage,
            "detections":     data["detections"],
        }

    return {
        "mode":             mode,
        "filename":         filename,
        "total_detections": total_detections,
        "classes_found":    list(classes.keys()),
        "classes":          classes,
    }


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@app.post("/predict")
async def predict(
    mode:  str        = Form(..., description="wright หรือ giemsa"),
    image: UploadFile = File(..., description="ไฟล์รูปภาพ"),
):
    if mode not in MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"mode '{mode}' ไม่ถูกต้อง ใช้ได้แค่: {list(MODELS.keys())}",
        )

    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น",
        )

    pil_image = read_image(image)
    results   = MODELS[mode](pil_image, conf=CONF_THRESHOLD)

    return build_response(mode, image.filename, results)

@app.post("/predict-batch")
async def predict_batch(
    mode:   str              = Form(..., description="wright หรือ giemsa"),
    images: List[UploadFile] = File(..., description="ไฟล์รูปภาพ (สามารถอัปโหลดได้หลายไฟล์พร้อมกัน)"),
):
    if mode not in MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"mode '{mode}' ไม่ถูกต้อง ใช้ได้แค่: {list(MODELS.keys())}",
        )

    prediction_results = []


    ### Step 1 ดึงข้อมูล จากฐานข้อมูล
    db_records = {}
    try:
        connection = get_db_connection()
        try:
            with connection.cursor() as cursor:
                for image in images:
                    if image.content_type and image.content_type.startswith("image/"):
                        sql = "SELECT image_id, image_name FROM images WHERE image_path LIKE %s LIMIT 1"
                        cursor.execute(sql, ('%' + image.filename,))
                        record = cursor.fetchone()
                        if record:
                            db_records[image.filename] = record
        finally:
            connection.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เชื่อมต่อฐานข้อมูลล้มเหลว: {str(e)}")
    ###

    ### Step 2 วนลูปประมวลผลภาพด้วยโมเดล AI
    for image in images:
        if not image.content_type or not image.content_type.startswith("image/"):
            prediction_results.append({
                "filename": image.filename,
                "error": "ไม่ใช่ไฟล์รูปภาพ ข้ามการทำงาน"
            })
            continue

        record = db_records.get(image.filename)
        image_id = record["image_id"] if record else None
        image_name = record["image_name"] if record else "Unknown"

        try:
            await image.seek(0)

            pil_image = read_image(image)
            results   = MODELS[mode](pil_image, conf=CONF_THRESHOLD)
            
            image_result = build_response(mode, image.filename, results)
            
            formatted_result = {
                "image_id": image_id,
                "mode": mode,
                "image_name": image_name,
                "filename": image_result["filename"],
                "total_detections": image_result["total_detections"],
                "classes_found": image_result["classes_found"],
                "classes": image_result["classes"]
            }
            
            prediction_results.append(formatted_result)
            
        except Exception as e:
            prediction_results.append({
                "filename": image.filename,
                "error": f"เกิดข้อผิดพลาด: {str(e)}"
            })
    ###

    ### Step 3 คำนวณสรุปยอดรวม
    batch_total_detections = 0
    batch_class_counts = defaultdict(int)
    success_count = 0
    failed_count = 0

    for result in prediction_results:
        if "error" not in result:
            success_count += 1
            batch_total_detections += result.get("total_detections", 0)
            for class_name, class_data in result.get("classes", {}).items():
                batch_class_counts[class_name] += class_data.get("count", 0)
        else:
            failed_count += 1

    summary_classes = {}
    for class_name, count in batch_class_counts.items():
        percentage = round((count / batch_total_detections) * 100, 2) if batch_total_detections > 0 else 0.0
        summary_classes[class_name] = {
            "count": count,
            "percentage": percentage
        }

    return {
        "message": "Dataset processed successfully.",
        "mode": mode,
        "summary": {
            "total_images_submitted": len(prediction_results),
            "total_images_processed": success_count,
            "total_images_failed": failed_count,
            "total_detections": batch_total_detections,
            "classes_found": list(summary_classes.keys()),
            "classes": summary_classes
        },
        "data": prediction_results 
    }
    ###