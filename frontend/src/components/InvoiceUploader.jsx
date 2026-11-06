// InvoiceUploader.jsx
import { useState, useEffect, useRef } from 'react';
import imageCompression from 'browser-image-compression';
import { Camera, Upload, RefreshCw, X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const InvoiceUploader = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [singleResult, setSingleResult] = useState(null);
  const [batchMessage, setBatchMessage] = useState("");
  const [loadingText, setLoadingText] = useState("Analyze Invoices");

  // Camera states
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const savedResult = localStorage.getItem('singleInvoiceResult');
    if (savedResult && savedResult !== "undefined" && savedResult !== "null") {
      try {
        setSingleResult(JSON.parse(savedResult));
      } catch (e) {
        console.error("Purana data parse nahi ho paaya:", e);
      }
    }
  }, []);

  useEffect(() => {
    let interval;
    if (loading) {
      const messages = [
        "🚀 Beaming your bills to the AI...",
        "🔍 AI is reading the fine print...",
        "🧮 Crunching the numbers & taxes...",
        "☕ Grab a sip, extracting data...",
        "✨ Almost there! Generating insights..."
      ];
      let currentIndex = 0;
      setLoadingText(messages[0]);
      interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % messages.length;
        setLoadingText(messages[currentIndex]);
      }, 3500); 
    } else {
      setLoadingText(`Analyze ${files.length > 0 ? files.length : ''} Invoices`);
    }
    return () => clearInterval(interval);
  }, [loading, files.length]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setSingleResult(null); 
    setBatchMessage(""); 
  };

  // 1. Camera Start karne ka function
  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Mobile ka back camera prefer karega
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Camera open nahi ho paya! Permission check karein.");
      setIsCameraOpen(false);
    }
  };

  // 2. Camera Close karne ka function
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  // 3. Live photo click karke file list me add karne ka function
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const capturedFile = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
        setFiles([capturedFile]); // Captured photo ko files state me daal diya
        setSingleResult(null);
        setBatchMessage("");
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  const handleUpload = async () => {
    if (files.length === 0) return alert("Bhai, pehle invoices toh select ya capture kar!");

    const newBatchId = Date.now().toString();
    const formData = new FormData();
    setLoading(true);
    
    try {
      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.type.startsWith('image/')) {
            const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
            try {
              const compressedFile = await imageCompression(file, options);
              return compressedFile;
            } catch (error) {
              console.error("Compression fail hua:", error);
              return file;
            }
          }
          return file;
        })
      );

      compressedFiles.forEach((file) => formData.append("files", file));
      formData.append("batch_id", newBatchId); 

      const response = await fetch(`${API_BASE_URL}/upload-batch`, {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (typeof onUploadSuccess === 'function') {
           onUploadSuccess(newBatchId);
        }

        if (data.successful_uploads && data.successful_uploads.length === 1) {
          const resultData = data.successful_uploads[0].data;
          setSingleResult(resultData);
          setBatchMessage("");
          localStorage.setItem('singleInvoiceResult', JSON.stringify(resultData));
        } else if (data.successful_uploads && data.successful_uploads.length > 1) {
          setBatchMessage(`✅ ${data.successful_uploads.length} Invoices processed successfully!`);
          setSingleResult(null);
          localStorage.removeItem('singleInvoiceResult');
        } else {
          setBatchMessage("⚠️ Koi bhi file sahi se analyse nahi ho paayi.");
        }
      } else {
        alert(`Backend Error: ${data.detail}`);
      }
    } catch (error) {
      console.error("Asli Error ye hai:", error);
      alert(`Error aaya: ${error.message}`); 
    } finally {
      setLoading(false);
      setFiles([]);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-[0_12px_40px_rgb(0,0,0,0.06)] w-full max-w-2xl mx-auto border border-white/90">
      
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mb-1.5">
          Scan Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-teal-600">Receipts</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Upload files or capture live photos for instant AI analysis
        </p>
      </div>
      
      {/* Camera Modal / View */}
      {isCameraOpen ? (
        <div className="mb-6 relative bg-black rounded-2xl overflow-hidden shadow-inner flex flex-col items-center">
          <video ref={videoRef} autoPlay playsInline className="w-full h-64 sm:h-80 object-cover"></video>
          <canvas ref={canvasRef} className="hidden"></canvas>
          
          <div className="absolute bottom-4 flex items-center space-x-4">
            <button 
              onClick={capturePhoto}
              className="bg-white text-purple-700 font-bold px-6 py-3 rounded-full shadow-lg hover:bg-purple-50 transition-all flex items-center gap-2"
            >
              <Camera size={18} /> Click Photo
            </button>
            <button 
              onClick={stopCamera}
              className="bg-red-500/80 backdrop-blur-md text-white p-3 rounded-full hover:bg-red-600 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : (
        /* Dual Action Options: Upload Box + Camera Button */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Upload Dropzone */}
          <div className="relative border-2 border-dashed border-purple-300/80 bg-gradient-to-b from-purple-50/60 to-white p-5 rounded-2xl text-center hover:border-purple-400 hover:bg-purple-50/80 transition-all duration-300 group shadow-inner flex flex-col items-center justify-center">
            <input 
              type="file" 
              multiple
              accept=".pdf, image/jpeg, image/png, image/webp" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-2 group-hover:scale-110 transition-transform">
              <Upload size={20} />
            </div>
            <p className="text-xs font-bold text-slate-700">
              {files.length > 0 ? (
                <span className="text-purple-700">{files.length} file(s) selected</span>
              ) : (
                <span><span className="text-purple-600 underline">Browse files</span></span>
              )}
            </p>
          </div>

          {/* Direct Camera Button Card */}
          <button 
            onClick={startCamera}
            className="border-2 border-dashed border-teal-300/80 bg-gradient-to-b from-teal-50/60 to-white p-5 rounded-2xl text-center hover:border-teal-400 hover:bg-teal-50/80 transition-all duration-300 group shadow-inner flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600 mb-2 group-hover:scale-110 transition-transform">
              <Camera size={20} />
            </div>
            <p className="text-xs font-bold text-slate-700">
              <span className="text-teal-600 underline">Open Camera</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Click live receipt photo</p>
          </button>
        </div>
      )}

      {/* Main Action Button */}
      <button 
        onClick={handleUpload}
        disabled={loading || files.length === 0}
        className={`w-full font-bold py-4 px-6 rounded-2xl text-white text-sm sm:text-base shadow-xl transition-all duration-300 active:scale-[0.98] ${
          loading || files.length === 0 
            ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed' 
            : 'bg-gradient-to-r from-purple-600 via-purple-700 to-teal-500 shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.01]'
        }`}
      >
        {loadingText}
      </button>

      {batchMessage && (
        <div className="mt-5 p-4 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl text-emerald-700 font-bold text-xs sm:text-sm text-center shadow-sm">
          {batchMessage}
        </div>
      )}

      {singleResult && (
        <div className="mt-6 p-5 sm:p-6 bg-slate-50/90 border border-slate-200/70 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-sm sm:text-base text-emerald-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Extraction Successful!
            </h3>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase">
              {singleResult.category || "Others"}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-slate-700">
            <div className="bg-white p-3.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Merchant</span>
              <p className="font-extrabold text-slate-800 truncate">{singleResult.merchant_name || "Unknown"}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date</span>
              <p className="font-extrabold text-slate-800">{singleResult.date || "N/A"}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tax</span>
              <p className="font-extrabold text-slate-800">₹{singleResult.tax_amount || 0}</p>
            </div>
            <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200/80">
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1">Total Amount</span>
              <p className="text-base sm:text-lg font-black text-purple-700">₹{singleResult.total_amount || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceUploader;