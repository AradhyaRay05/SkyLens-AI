"""
SkyLens-AI - Fast & Lightweight 4-Class Weather API (Optimized for Render)
-------------------------------------------------------------------------
- 3.12 MB MobileNetV2 TFLite Model
- Classes: Cloudy, Rain, Shine, Sunrise
- Memory footprint: ~35 MB RAM | Latency: <20ms
- Native FastAPI REST API with CORS
"""

import os
import io
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Universal TFLite Interpreter Import
try:
    from ai_edge_litert.interpreter import Interpreter
except ImportError:
    try:
        from tflite_runtime.interpreter import Interpreter
    except ImportError:
        import tensorflow as tf
        Interpreter = tf.lite.Interpreter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TFLITE_PATH = os.path.join(BASE_DIR, "skylens_model.tflite")
IMG_SIZE = (150, 150)
CLASSES = ["Cloudy", "Rain", "Shine", "Sunrise"]

WEATHER_ADVISORIES = {
    "Cloudy": {
        "emoji": "☁️",
        "color": "#94A3B8",
        "title": "Overcast & Cloudy Skies",
        "outfit": "Comfortable layer or light sweater 🧥",
        "activity": "Ideal for outdoor walking, photography & jogging 🚶‍♂️",
        "uv_index": "Moderate (UV 3-5)",
    },
    "Rain": {
        "emoji": "🌧️",
        "color": "#3B82F6",
        "title": "Rainfall & Wet Conditions",
        "outfit": "Waterproof jacket, boots & sturdy umbrella ☔",
        "activity": "Great for cozy indoor reading, gaming & warm drinks ☕",
        "uv_index": "Low (UV 1-2)",
    },
    "Shine": {
        "emoji": "☀️",
        "color": "#F59E0B",
        "title": "Bright & Sunny Weather",
        "outfit": "Breathable cottons, sunglasses & SPF sunscreen 🕶️",
        "activity": "Perfect for beach outings, swimming & park picnics 🏖️",
        "uv_index": "High (UV 7-10)",
    },
    "Sunrise": {
        "emoji": "🌅",
        "color": "#EC4899",
        "title": "Golden Hour Sunrise / Dawn",
        "outfit": "Light morning jacket or windbreaker 🌄",
        "activity": "Spectacular time for morning runs, yoga & scenic photos 📸",
        "uv_index": "Low to Moderate (UV 2-4)",
    },
}

interpreter = None
input_details = None
output_details = None

def get_interpreter():
    global interpreter, input_details, output_details
    if interpreter is None:
        if not os.path.exists(TFLITE_PATH):
            raise FileNotFoundError(f"TFLite model not found at: {TFLITE_PATH}")
        interpreter = Interpreter(model_path=TFLITE_PATH)
        interpreter.allocate_tensors()
        input_details = interpreter.get_input_details()
        output_details = interpreter.get_output_details()
        print(f"[SkyLens-AI] TFLite Interpreter loaded from: {TFLITE_PATH}")
    return interpreter

def predict_weather_image(pil_img: Image.Image):
    interp = get_interpreter()
    resized_img = pil_img.convert("RGB").resize(IMG_SIZE, Image.Resampling.BILINEAR)
    img_array = np.array(resized_img, dtype=np.float32)
    img_tensor = np.expand_dims(img_array, axis=0)

    interp.set_tensor(input_details[0]["index"], img_tensor)
    interp.invoke()

    output_probs = interp.get_tensor(output_details[0]["index"])[0]
    class_idx = int(np.argmax(output_probs))
    predicted_class = CLASSES[class_idx]
    confidence = float(round(output_probs[class_idx] * 100.0, 2))

    prob_dict = {
        cls_name: float(round(prob * 100.0, 2))
        for cls_name, prob in zip(CLASSES, output_probs)
    }

    advisory = WEATHER_ADVISORIES.get(predicted_class, {})

    return {
        "success": True,
        "class": predicted_class,
        "confidence": confidence,
        "probabilities": prob_dict,
        "emoji": advisory.get("emoji", "🌤️"),
        "color": advisory.get("color", "#38BDF8"),
        "advisory": advisory,
    }

app = FastAPI(
    title="SkyLens-AI Weather API",
    description="Real-Time 4-Class Weather Classification API for Render",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    try:
        get_interpreter()
    except Exception as e:
        print(f"[SkyLens-AI] Startup notice: {e}")

@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health_check():
    try:
        interp = get_interpreter()
        model_ready = interp is not None
    except Exception:
        model_ready = False

    return {
        "status": "online",
        "service": "SkyLens-AI Weather API",
        "version": "2.0.0",
        "engine": "TensorFlow Lite",
        "model_loaded": model_ready,
        "classes": CLASSES,
        "endpoints": {
            "predict": "POST /predict (Upload sky image)",
            "health": "GET /health",
        },
    }

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents))
        result = predict_weather_image(pil_img)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
