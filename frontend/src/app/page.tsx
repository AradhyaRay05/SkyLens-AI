"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Upload,
  Camera,
  Sparkles,
  Cloud,
  CloudRain,
  Sun,
  Sunrise,
  RefreshCw,
  Award,
  AlertCircle,
  Volume2,
  VolumeX,
  Compass,
  Zap,
  History,
  Trash2,
  Mail,
  Shirt,
  Bike,
  ShieldAlert,
  SunDim
} from "lucide-react";

interface WeatherAdvisory {
  emoji: string;
  color: string;
  title: string;
  outfit: string;
  activity: string;
  uv_index: string;
}

interface PredictionResult {
  class: string;
  confidence: number;
  probabilities: {
    Cloudy: number;
    Rain: number;
    Shine: number;
    Sunrise: number;
  };
  emoji: string;
  color: string;
  advisory: WeatherAdvisory;
  timestamp: string;
}

interface ScanHistoryItem {
  id: string;
  imageUrl: string;
  weatherClass: string;
  confidence: number;
  emoji: string;
  timestamp: string;
}

const SAMPLE_SKIES = [
  {
    name: "Overcast Clouds",
    caption: "Dense Stratus",
    url: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=600&auto=format&fit=crop&q=80",
    expected: "Cloudy",
    emoji: "☁️",
  },
  {
    name: "Summer Downpour",
    caption: "Rain Showers",
    url: "https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=600&auto=format&fit=crop&q=80",
    expected: "Rain",
    emoji: "🌧️",
  },
  {
    name: "Clear Sunny Sky",
    caption: "Bright Sunlight",
    url: "https://images.unsplash.com/photo-1601297183305-6df142704ea2?w=600&auto=format&fit=crop&q=80",
    expected: "Shine",
    emoji: "☀️",
  },
  {
    name: "Golden Dawn",
    caption: "Morning Horizon",
    url: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=600&auto=format&fit=crop&q=80",
    expected: "Sunrise",
    emoji: "🌅",
  },
];

const WEATHER_TRIVIA = [
  {
    fact: "Clouds look weightless, but a typical cumulus cloud weighs around 500,000 kg (about 1.1 million pounds—equal to 100 elephants)!",
    icon: "☁️",
  },
  {
    fact: "Raindrops aren't tear-shaped! As they fall through the air, air resistance flattens them into the shape of a hamburger bun.",
    icon: "🌧️",
  },
  {
    fact: "Sunlight takes approximately 8 minutes and 20 seconds to travel 93 million miles from the Sun to reach Earth.",
    icon: "☀️",
  },
  {
    fact: "During sunrise and sunset, Rayleigh scattering scatters short blue wavelengths, allowing stunning reds, oranges, and pinks to reach our eyes.",
    icon: "🌅",
  },
  {
    fact: "Petrichor is the pleasant earthy smell produced when rain falls on dry soil, caused by an organic compound called geosmin.",
    icon: "🌿",
  },
  {
    fact: "Lightning bolts travel at roughly 220,000 mph and can heat the surrounding air to 30,000°C (5x hotter than the surface of the Sun)!",
    icon: "⚡",
  },
];

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"upload" | "camera">("upload");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("skylens_history");
      if (saved) {
        setScanHistory(JSON.parse(saved));
      }
    } catch {
      // Ignore
    }
  }, []);

  const saveToHistory = (newItem: ScanHistoryItem) => {
    setScanHistory((prev) => {
      const updated = [newItem, ...prev.slice(0, 5)];
      try {
        localStorage.setItem("skylens_history", JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  };

  const clearHistory = () => {
    setScanHistory([]);
    try {
      localStorage.removeItem("skylens_history");
    } catch {
      // Ignore
    }
  };

  const playSound = (type: "rain" | "sun" | "cloud" | "sunrise" | "click") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "rain") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === "sun" || type === "sunrise") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {
      // Audio context restricted
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      setActiveTab("camera");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to access camera";
      setError(`Camera Error: ${msg}. Please allow camera permissions or upload an image.`);
      setActiveTab("upload");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setSelectedImage(dataUrl);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "sky-capture.jpg", { type: "image/jpeg" });
          setSelectedFile(file);
          stopCamera();
          setActiveTab("upload");
          classifyWeather(file);
        }
      }, "image/jpeg");
    }
  };

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid sky/weather image (JPG, PNG, WEBP).");
      return;
    }
    stopCamera();
    setError(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    classifyWeather(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSampleClick = async (sample: (typeof SAMPLE_SKIES)[0]) => {
    try {
      stopCamera();
      setActiveTab("upload");
      setLoading(true);
      setError(null);
      setSelectedImage(sample.url);
      playSound("click");

      const response = await fetch(sample.url);
      const blob = await response.blob();
      const file = new File([blob], `${sample.name.toLowerCase().replace(/\s+/g, "-")}.jpg`, {
        type: "image/jpeg",
      });
      setSelectedFile(file);
      await classifyWeather(file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load sky sample.";
      setError(msg);
      setLoading(false);
    }
  };

  const classifyWeather = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const formData = new FormData();
      formData.append("file", file);

      const endpoint = `${apiUrl.replace(/\/$/, "")}/predict`;
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.detail || "Weather classification failed");
      }

      const predictionData: PredictionResult = {
        class: data.class,
        confidence: data.confidence,
        probabilities: {
          Cloudy: data.probabilities.Cloudy || 0,
          Rain: data.probabilities.Rain || 0,
          Shine: data.probabilities.Shine || 0,
          Sunrise: data.probabilities.Sunrise || 0,
        },
        emoji: data.emoji,
        color: data.color,
        advisory: data.advisory,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setResult(predictionData);
      playSound(data.class.toLowerCase() as "rain" | "sun" | "cloud" | "sunrise");

      const reader = new FileReader();
      reader.onload = (e) => {
        saveToHistory({
          id: String(Date.now()),
          imageUrl: (e.target?.result as string) || selectedImage || "",
          weatherClass: data.class,
          confidence: data.confidence,
          emoji: data.emoji,
          timestamp: predictionData.timestamp,
        });
      };
      reader.readAsDataURL(file);

      setTriviaIndex(Math.floor(Math.random() * WEATHER_TRIVIA.length));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to Weather AI.";
      setError(`Notice: ${msg}. If your Render service is waking up, please allow a few seconds!`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    stopCamera();
    setSelectedImage(null);
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setActiveTab("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* Background Atmosphere Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-400 via-amber-400 to-rose-400 flex items-center justify-center shadow-lg shadow-sky-500/20 text-2xl font-bold">
              🌤️
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-sky-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
                  SkyLens-AI
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-800/50 font-semibold">
                  Sky Detective
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block mt-0.5">
                Real-Time 4-Class Atmospheric & Weather Recognition
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? "Mute sounds" : "Enable sounds"}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
            </button>

            <a
              href="https://github.com/AradhyaRay05/SkyLens-AI"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all text-sm font-semibold text-slate-200 hover:text-white"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Interactive App Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full flex-1 space-y-9">
        {/* Friendly Hero Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs sm:text-sm font-semibold text-sky-400 shadow-sm">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Multi-Class Vision AI • 4 Weather States (Cloudy, Rain, Shine, Sunrise)</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            What's in your{" "}
            <span className="bg-gradient-to-r from-sky-400 via-amber-300 to-rose-400 bg-clip-text text-transparent">
              Sky Today?
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
            Take a live photo of the sky outside or upload an image. Our vision model instantly detects weather conditions and recommends the best outfits & activities!
          </p>
        </div>

        {/* Core Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left Column: Upload / Live Camera & Quick-Picks (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Upload Mode Selector Tabs */}
            <div className="flex items-center justify-between bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setActiveTab("upload");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm sm:text-base font-semibold transition-all ${
                  activeTab === "upload"
                    ? "bg-gradient-to-r from-sky-500 via-amber-500 to-rose-500 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Upload className="w-4 h-4" /> Upload Sky Image
              </button>
              <button
                type="button"
                onClick={() => {
                  startCamera();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm sm:text-base font-semibold transition-all ${
                  activeTab === "camera"
                    ? "bg-gradient-to-r from-sky-500 via-amber-500 to-rose-500 text-white shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Camera className="w-4 h-4" /> Snap Sky Outside
              </button>
            </div>

            {/* Interactive Image Frame */}
            <div className="relative rounded-3xl border border-slate-800 bg-slate-900/40 backdrop-blur-md p-6 sm:p-7 overflow-hidden">
              {activeTab === "camera" && cameraActive ? (
                /* Live Camera Capture View */
                <div className="space-y-4 text-center">
                  <div className="relative aspect-video max-h-80 w-full mx-auto rounded-2xl overflow-hidden bg-black border border-slate-700 shadow-2xl">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/80 text-xs font-bold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> LIVE SKY CAM
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-amber-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-sky-500/20 hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <Camera className="w-5 h-5" /> Snap & Analyze Sky
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        setActiveTab("upload");
                      }}
                      className="px-5 py-3 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-medium text-sm border border-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Drag & Drop Upload Zone */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-7 sm:p-9 text-center cursor-pointer transition-all duration-200 ${
                    isDragOver
                      ? "border-sky-500 bg-sky-500/10 scale-[1.01]"
                      : "border-slate-800 hover:border-slate-600 bg-slate-900/30 hover:bg-slate-900/60"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileChange(e.target.files[0]);
                      }
                    }}
                  />

                  {selectedImage ? (
                    <div className="relative aspect-video max-h-80 w-full mx-auto rounded-2xl overflow-hidden shadow-2xl border border-slate-700 group">
                      <Image
                        src={selectedImage}
                        alt="Uploaded Sky Preview"
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-4">
                        <span className="text-sm font-semibold text-white bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-sky-400" /> Click or drag to change sky photo
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-7 sm:py-9 space-y-4">
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-sky-500/20 via-amber-500/20 to-rose-500/20 border border-sky-500/30 flex items-center justify-center mx-auto text-sky-400 shadow-inner">
                        <Cloud className="w-8 h-8 sm:w-9 sm:h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xl sm:text-2xl font-bold text-slate-100">
                          Drop your sky photo here, or browse
                        </p>
                        <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
                          Supports Cloudy, Rainy, Sunny, or Sunrise weather pictures
                        </p>
                      </div>
                      <button
                        type="button"
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-amber-500 hover:from-sky-600 hover:to-amber-600 text-white text-sm font-bold shadow-lg shadow-sky-500/20 transition-all hover:scale-105"
                      >
                        Choose Sky Photo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Pick Samples Gallery (4 Weather Types) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Quick-Test 4 Weather States
                </span>
                {selectedImage && (
                  <button
                    onClick={handleReset}
                    className="text-xs sm:text-sm text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Clear Image
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SAMPLE_SKIES.map((sample) => (
                  <button
                    key={sample.name}
                    type="button"
                    onClick={() => handleSampleClick(sample)}
                    disabled={loading}
                    className="group rounded-2xl border border-slate-800 hover:border-sky-500/60 bg-slate-900/50 p-2.5 text-left transition-all hover:scale-[1.02] disabled:opacity-50"
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2">
                      <Image
                        src={sample.url}
                        alt={sample.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        unoptimized
                      />
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-100">{sample.name}</p>
                        <p className="text-[11px] text-slate-400">{sample.caption}</p>
                      </div>
                      <span className="text-sm px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700">
                        {sample.emoji}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Weather Scorecard & Advisories (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Classification & Weather Advisory Card */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-md p-6 sm:p-7 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-5">
                <h2 className="font-bold text-base text-slate-200 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-sky-400" /> Sky Condition Report
                </h2>
                {result && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                    Analyzed at {result.timestamp}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="py-16 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="w-16 h-16 border-4 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">🌤️</span>
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-100 animate-pulse">
                      Analyzing Atmospheric Features...
                    </p>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
                      Classifying cloud formations, rain density, and light rays in real-time
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="py-9 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-rose-300 px-4">{error}</p>
                </div>
              ) : result ? (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  {/* Primary Celebration Header */}
                  <div
                    className="rounded-2xl p-6 border text-center relative overflow-hidden shadow-xl"
                    style={{
                      backgroundColor: `${result.color}15`,
                      borderColor: `${result.color}50`,
                      boxShadow: `0 10px 25px -5px ${result.color}20`,
                    }}
                  >
                    <div className="text-5xl mb-2">{result.emoji}</div>
                    <h3
                      className="text-4xl font-black uppercase tracking-wider"
                      style={{ color: result.color }}
                    >
                      {result.class}
                    </h3>
                    <p className="text-sm font-medium text-slate-300 mt-1.5">
                      Confidence:{" "}
                      <span className="font-bold text-white text-base">
                        {result.confidence.toFixed(1)}% Match
                      </span>
                    </p>
                  </div>

                  {/* 4-Class Multi-Class Probability Breakdown */}
                  <div className="space-y-3">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 block">
                      Atmospheric Class Breakdown
                    </span>

                    {/* Cloudy */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs sm:text-sm font-semibold">
                        <span className="text-slate-300 flex items-center gap-1.5">☁️ Cloudy</span>
                        <span className="text-slate-200 font-mono">
                          {result.probabilities.Cloudy.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                        <div
                          className="h-full bg-gradient-to-r from-slate-400 to-slate-200 rounded-full transition-all duration-700"
                          style={{ width: `${result.probabilities.Cloudy}%` }}
                        />
                      </div>
                    </div>

                    {/* Rain */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs sm:text-sm font-semibold">
                        <span className="text-blue-400 flex items-center gap-1.5">🌧️ Rain</span>
                        <span className="text-slate-200 font-mono">
                          {result.probabilities.Rain.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-700"
                          style={{ width: `${result.probabilities.Rain}%` }}
                        />
                      </div>
                    </div>

                    {/* Shine */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs sm:text-sm font-semibold">
                        <span className="text-amber-400 flex items-center gap-1.5">☀️ Shine</span>
                        <span className="text-slate-200 font-mono">
                          {result.probabilities.Shine.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 rounded-full transition-all duration-700"
                          style={{ width: `${result.probabilities.Shine}%` }}
                        />
                      </div>
                    </div>

                    {/* Sunrise */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs sm:text-sm font-semibold">
                        <span className="text-pink-400 flex items-center gap-1.5">🌅 Sunrise</span>
                        <span className="text-slate-200 font-mono">
                          {result.probabilities.Sunrise.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full transition-all duration-700"
                          style={{ width: `${result.probabilities.Sunrise}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Weather & Outfit Advisory */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" /> Outdoor Advisory
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {result.advisory.uv_index}
                      </span>
                    </div>

                    <div className="space-y-2 pt-1 text-xs sm:text-sm">
                      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-2.5">
                        <Shirt className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-400 font-medium block text-[11px]">Recommended Outfit</span>
                          <span className="text-slate-200 font-semibold">{result.advisory.outfit}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-2.5">
                        <Bike className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-slate-400 font-medium block text-[11px]">Best Activities</span>
                          <span className="text-slate-200 font-semibold">{result.advisory.activity}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-14 text-center space-y-4 text-slate-300">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-300 shadow-inner">
                    <SunDim className="w-8 h-8 text-sky-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl sm:text-2xl font-bold text-slate-100">Ready to Scan!</p>
                    <p className="text-base sm:text-lg text-slate-300 max-w-sm mx-auto leading-relaxed">
                      Select a sky sample or snap a photo of the sky outside to see instant multi-class weather classification & advice.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Meteorology Trivia Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5 flex items-start gap-3.5">
              <div className="text-3xl p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 shrink-0">
                {WEATHER_TRIVIA[triviaIndex].icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-sky-400">
                    Meteorology Trivia
                  </span>
                  <button
                    onClick={() => setTriviaIndex((prev) => (prev + 1) % WEATHER_TRIVIA.length)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Next Fact
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                  {WEATHER_TRIVIA[triviaIndex].fact}
                </p>
              </div>
            </div>

            {/* Recent Scans Tray */}
            {scanHistory.length > 0 && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-400" /> Recent Sky Scans
                  </span>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  {scanHistory.map((item) => (
                    <div
                      key={item.id}
                      className="group relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 p-2 text-center"
                    >
                      <div className="relative aspect-square w-full rounded-lg overflow-hidden mb-1.5">
                        <Image
                          src={item.imageUrl}
                          alt="Past Scan"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-200 block truncate">
                        {item.emoji} {item.weatherClass}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {item.confidence.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modern 4-Column Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md mt-14 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-9 text-sm">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 font-black text-lg text-white">
              <span>🌤️</span> SkyLens-AI
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Real-time deep learning weather & sky classifier. Intelligent multi-class atmospheric vision powered by MobileNetV2 & TensorFlow Lite.
            </p>
          </div>

          <div className="space-y-2.5">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
              Supported Weather
            </span>
            <ul className="space-y-1.5 text-xs sm:text-sm text-slate-400">
              <li>• ☁️ Overcast & Cloudy Skies</li>
              <li>• 🌧️ Rainy Downpours</li>
              <li>• ☀️ Sunny & Bright Skies</li>
              <li>• 🌅 Dawn & Golden Hour Sunrise</li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
              Quick Links
            </span>
            <ul className="space-y-1.5 text-xs sm:text-sm text-slate-400">
              <li>
                <a
                  href="https://github.com/AradhyaRay05/SkyLens-AI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-sky-400 transition-colors"
                >
                  GitHub Project
                </a>
              </li>
              <li>
                <a
                  href="https://render.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 transition-colors"
                >
                  Render Backend
                </a>
              </li>
              <li>
                <a
                  href="https://vercel.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-rose-400 transition-colors"
                >
                  Vercel Frontend
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
              Created By
            </span>
            <p className="text-sm text-slate-200 font-bold">Aradhya Ray</p>
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://github.com/AradhyaRay05"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                title="GitHub"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/in/rayaradhya"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 flex items-center justify-center text-slate-400 hover:text-sky-400 transition-colors"
                title="LinkedIn"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              <a
                href="mailto:aradhyaray99@gmail.com"
                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-600 flex items-center justify-center text-slate-400 hover:text-amber-400 transition-colors"
                title="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} SkyLens-AI • MIT License</p>
          <p className="flex items-center gap-1.5">
            Built with ⚡ using Next.js, TensorFlow Lite & FastAPI
          </p>
        </div>
      </footer>
    </div>
  );
}
