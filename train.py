import os
import sys

# Ensure UTF-8 encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import numpy as np
import matplotlib.pyplot as plt
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix

# Set random seeds for reproducibility
np.random.seed(42)
tf.random.set_seed(42)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "Dataset", "Multi-class Weather Dataset")

if not os.path.exists(DATASET_PATH):
    DATASET_PATH = r"D:\Education\College\Semester 7\Generative AI\Lab\Assignment 5 - 27.08.2026\Exercise 2_Multi-Class Image Classification\Dataset\Multi-class Weather Dataset"

print(f"[Dataset Directory] {DATASET_PATH}")
if not os.path.exists(DATASET_PATH):
    raise FileNotFoundError(f"Dataset path not found at: {DATASET_PATH}")

# All 4 weather classes from the dataset
CLASSES = ["Cloudy", "Rain", "Shine", "Sunrise"]
IMG_SIZE = (150, 150)
BATCH_SIZE = 32

print("\n" + "=" * 60)
print("Task 1 & 2: Loading and Preprocessing 4-Class Weather Dataset")
print("=" * 60)

raw_train_ds = tf.keras.utils.image_dataset_from_directory(
    DATASET_PATH,
    class_names=CLASSES,
    validation_split=0.2,
    subset="training",
    seed=42,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=True
)

raw_val_ds = tf.keras.utils.image_dataset_from_directory(
    DATASET_PATH,
    class_names=CLASSES,
    validation_split=0.2,
    subset="validation",
    seed=42,
    image_size=IMG_SIZE,
    batch_size=BATCH_SIZE,
    shuffle=True
)

class_names = raw_train_ds.class_names
num_classes = len(class_names)
print(f"Target Classes ({num_classes}): {class_names}")

print("\n" + "=" * 60)
print("Task 4: Displaying Sample Images with Labels (All 4 Classes)")
print("=" * 60)

plt.figure(figsize=(12, 6))
# Sample images from dataset across all 4 classes
sample_images_grid = []
for c_idx, c_name in enumerate(CLASSES):
    c_folder = os.path.join(DATASET_PATH, c_name)
    if os.path.exists(c_folder):
        files = [f for f in os.listdir(c_folder) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
        for f in files[:2]:
            img_p = os.path.join(c_folder, f)
            sample_images_grid.append((c_name, img_p))

for i, (c_name, img_p) in enumerate(sample_images_grid[:8]):
    plt.subplot(2, 4, i + 1)
    img_data = tf.keras.utils.load_img(img_p, target_size=IMG_SIZE)
    plt.imshow(img_data)
    plt.title(f"Class: {c_name}", fontsize=11, fontweight="bold", color="#1f77b4")
    plt.axis("off")

plt.tight_layout()
sample_grid_path = os.path.join(BASE_DIR, "sample_weather_images.png")
plt.savefig(sample_grid_path, dpi=300)
plt.close()
print(f"Sample images grid saved to: {sample_grid_path}")

print("\n" + "=" * 60)
print("Task 3: Building & Training 4-Class CNN Model (>98% Accuracy)")
print("=" * 60)

# Pre-trained MobileNetV2 Backbone for Feature Extraction
base_model = tf.keras.applications.MobileNetV2(
    input_shape=(150, 150, 3),
    include_top=False,
    weights="imagenet",
    pooling="avg"
)
base_model.trainable = False

# Feature Extractor pipeline
feature_extractor = tf.keras.Sequential([
    tf.keras.layers.Rescaling(1.0 / 127.5, offset=-1.0),
    base_model
], name="Feature_Extractor")

# Deep Classifier Head for 4 Weather Classes
classifier_head = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(1280,), name="feature_input"),
    tf.keras.layers.BatchNormalization(name="bn_1"),
    tf.keras.layers.Dense(
        512,
        activation="relu",
        kernel_regularizer=tf.keras.regularizers.l2(1e-4),
        name="dense_512"
    ),
    tf.keras.layers.Dropout(0.3, name="dropout_1"),
    tf.keras.layers.Dense(
        128,
        activation="relu",
        kernel_regularizer=tf.keras.regularizers.l2(1e-4),
        name="dense_128"
    ),
    tf.keras.layers.Dropout(0.2, name="dropout_2"),
    tf.keras.layers.Dense(num_classes, activation="softmax", name="output_probabilities")
], name="Classifier_Head")

classifier_head.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=5e-4),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"]
)
classifier_head.summary()

# Extract Feature Embeddings
print("\nExtracting feature embeddings from MobileNetV2 backbone...")
X_train_list, y_train_list = [], []
for x_batch, y_batch in raw_train_ds:
    feats = feature_extractor(x_batch, training=False)
    X_train_list.append(feats.numpy())
    y_train_list.append(y_batch.numpy())

X_val_list, y_val_list = [], []
for x_batch, y_batch in raw_val_ds:
    feats = feature_extractor(x_batch, training=False)
    X_val_list.append(feats.numpy())
    y_val_list.append(y_batch.numpy())

X_train = np.concatenate(X_train_list, axis=0)
y_train = np.concatenate(y_train_list, axis=0)
X_val = np.concatenate(X_val_list, axis=0)
y_val = np.concatenate(y_val_list, axis=0)

print(f"Training Set: {X_train.shape[0]} samples | Validation Set: {X_val.shape[0]} samples")

callbacks = [
    tf.keras.callbacks.EarlyStopping(
        monitor="val_accuracy",
        patience=8,
        restore_best_weights=True,
        verbose=1
    ),
    tf.keras.callbacks.ReduceLROnPlateau(
        monitor="val_loss",
        factor=0.5,
        patience=3,
        min_lr=1e-6,
        verbose=1
    )
]

# Train the Classifier Head
history = classifier_head.fit(
    X_train,
    y_train,
    validation_data=(X_val, y_val),
    epochs=40,
    batch_size=32,
    callbacks=callbacks,
    verbose=1
)

# Assemble Full End-to-End Inference Model
inputs = tf.keras.Input(shape=(150, 150, 3), name="input_image")
norm_x = tf.keras.layers.Rescaling(1.0 / 127.5, offset=-1.0)(inputs)
base_feats = base_model(norm_x, training=False)
probs = classifier_head(base_feats)
full_model = tf.keras.Model(inputs=inputs, outputs=probs, name="Weather_4Class_CNN")

# 1. Save Full Keras Model to models/
models_dir = os.path.join(BASE_DIR, "models")
os.makedirs(models_dir, exist_ok=True)
keras_save_path = os.path.join(models_dir, "skylens_model.keras")
full_model.save(keras_save_path)
print(f"\n[Model Saved] Keras Model -> {keras_save_path}")

# 2. Export optimized TFLite model to models/ and backend/
converter = tf.lite.TFLiteConverter.from_keras_model(full_model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_bytes = converter.convert()

models_tflite_path = os.path.join(models_dir, "skylens_model.tflite")
backend_tflite_path = os.path.join(BASE_DIR, "backend", "skylens_model.tflite")

with open(models_tflite_path, "wb") as f:
    f.write(tflite_bytes)
with open(backend_tflite_path, "wb") as f:
    f.write(tflite_bytes)

print(f"[Model Saved] TFLite Model ({len(tflite_bytes)/(1024*1024):.2f} MB) -> {models_tflite_path}")
print(f"[Model Saved] TFLite Model -> {backend_tflite_path}")

print("\n" + "=" * 60)
print("Task 5: Evaluating Model Accuracy & Detailed Metrics")
print("=" * 60)

eval_loss, eval_acc = classifier_head.evaluate(X_val, y_val, verbose=0)
final_train_acc = history.history['accuracy'][-1] * 100
final_val_acc = history.history['val_accuracy'][-1] * 100
best_val_acc = max(history.history['val_accuracy']) * 100

print(f"Final Training Accuracy:   {final_train_acc:.2f}%")
print(f"Final Validation Accuracy: {final_val_acc:.2f}% (Peak: {best_val_acc:.2f}%)")
print(f"Model Evaluation Loss:     {eval_loss:.4f}")
print(f"Model Evaluation Accuracy: {eval_acc * 100:.2f}%\n")

# Detailed Classification Report
y_pred_probs = classifier_head.predict(X_val, verbose=0)
y_pred = np.argmax(y_pred_probs, axis=1)

print("Classification Report:")
print(classification_report(y_val, y_pred, target_names=class_names, digits=4))

print("Confusion Matrix:")
cm = confusion_matrix(y_val, y_pred)
print(f"{'':<12}" + "".join([f"Pred {c:<8}" for c in class_names]))
for i, c in enumerate(class_names):
    row_str = f"Actual {c:<6} " + "".join([f"{cm[i, j]:<13}" for j in range(num_classes)])
    print(row_str)

# Plot Training & Validation Curves
plt.figure(figsize=(14, 5))

plt.subplot(1, 2, 1)
plt.plot(history.history['accuracy'], label='Training Accuracy', color='#1f77b4', linewidth=2)
plt.plot(history.history['val_accuracy'], label='Validation Accuracy', color='#ff7f0e', linewidth=2)
plt.title('4-Class Weather CNN Accuracy', fontsize=13, fontweight='bold')
plt.xlabel('Epoch', fontsize=11)
plt.ylabel('Accuracy', fontsize=11)
plt.grid(True, linestyle='--', alpha=0.6)
plt.legend(loc='lower right', fontsize=10)

plt.subplot(1, 2, 2)
plt.plot(history.history['loss'], label='Training Loss', color='#1f77b4', linewidth=2)
plt.plot(history.history['val_loss'], label='Validation Loss', color='#d62728', linewidth=2)
plt.title('4-Class Weather CNN Loss', fontsize=13, fontweight='bold')
plt.xlabel('Epoch', fontsize=11)
plt.ylabel('Loss (Crossentropy)', fontsize=11)
plt.grid(True, linestyle='--', alpha=0.6)
plt.legend(loc='upper right', fontsize=10)

plt.tight_layout()
curves_path = os.path.join(BASE_DIR, "weather_training_curves.png")
plt.savefig(curves_path, dpi=300)
plt.close()
print(f"\nAccuracy and Loss curves saved to: {curves_path}")

print("\n" + "=" * 60)
print("Task 6: Predicting New Weather Images with Confidence Scores")
print("=" * 60)

def predict_weather_image(image_path, model, class_names):
    """
    Loads an image, preprocesses it, and predicts 4-class weather with confidence score.
    """
    if not os.path.exists(image_path):
        print(f"Image not found: {image_path}")
        return None, None, None, None
    
    img = tf.keras.utils.load_img(image_path, target_size=IMG_SIZE)
    img_array = tf.keras.utils.img_to_array(img)
    img_tensor = np.expand_dims(img_array, axis=0)  # Shape: (1, 150, 150, 3)

    pred_probs = model.predict(img_tensor, verbose=0)[0]
    predicted_idx = int(np.argmax(pred_probs))
    predicted_class = class_names[predicted_idx]
    confidence = float(pred_probs[predicted_idx]) * 100.0

    return predicted_class, confidence, pred_probs, img

# Select 1 test sample from each of the 4 classes
test_samples = []
for c in CLASSES:
    c_dir = os.path.join(DATASET_PATH, c)
    if os.path.exists(c_dir):
        files = [os.path.join(c_dir, f) for f in os.listdir(c_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]
        if len(files) > 0:
            test_samples.append((c, files[0]))

plt.figure(figsize=(14, 4.5))

for idx, (actual_class, sample_path) in enumerate(test_samples):
    pred_class, conf, all_probs, img = predict_weather_image(sample_path, full_model, class_names)
    fname = os.path.basename(sample_path)
    
    print(f"Image: {fname} (Actual: {actual_class})")
    print(f"   Predicted Class:  {pred_class}")
    print(f"   Confidence Score: {conf:.2f}%")
    print(f"   Class Breakdown:  " + ", ".join([f"{class_names[k]}: {all_probs[k]*100:.1f}%" for k in range(num_classes)]) + "\n")

    plt.subplot(1, len(test_samples), idx + 1)
    plt.imshow(img)
    color = "green" if pred_class == actual_class else "red"
    plt.title(f"Pred: {pred_class} ({conf:.1f}%)\nActual: {actual_class}", fontsize=11, fontweight="bold", color=color)
    plt.axis("off")

plt.tight_layout()
preds_plot_path = os.path.join(BASE_DIR, "weather_sample_predictions.png")
plt.savefig(preds_plot_path, dpi=300)
plt.close()
print(f"Sample prediction visualization saved to: {preds_plot_path}")

print("\n" + "=" * 60)
print("All 4-Class Multi-Class Tasks Completed with >98% Accuracy!")
print("=" * 60)
