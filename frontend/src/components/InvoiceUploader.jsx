import { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const InvoiceUploader = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [singleResult, setSingleResult] = useState(null);
  const [batchMessage, setBatchMessage] = useState("");
  const [loadingText, setLoadingText] = useState("Analyze Invoices");

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

  const handleUpload = async () => {
    if (files.length === 0) return alert("Bhai, pehle invoices toh select kar!");

    const newBatchId = Date.now().toString();
    const formData = new FormData();
    
    setLoading(true);
    
    try {
      const compressedFiles = await Promise.all(
        files.map(async (file) => {
          if (file.type.startsWith('image/')) {
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            };
            try {
              console.log(`Original: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
              const compressedFile = await imageCompression(file, options);
              console.log(`Compressed: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
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
      
      {/* Title Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mb-1.5">
          Scan Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-teal-600">Receipts</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Upload single or batch invoices for instant AI-powered data extraction
        </p>
      </div>
      
      {/* Upload Dropzone Box */}
      <div className="relative border-2 border-dashed border-purple-300/80 bg-gradient-to-b from-purple-50/60 to-white p-6 sm:p-8 rounded-2xl mb-6 text-center hover:border-purple-400 hover:bg-purple-50/80 transition-all duration-300 group shadow-inner">
        <input 
          type="file" 
          multiple
          accept=".pdf, image/jpeg, image/png, image/webp" 
          onChange={handleFileChange} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-purple-100/80 flex items-center justify-center text-purple-600 group-hover:scale-110 group-hover:bg-purple-200/70 transition-all duration-300 shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              {files.length > 0 ? (
                <span className="text-purple-700 font-extrabold">{files.length} file(s) ready for analysis</span>
              ) : (
                <span><span className="text-purple-600 underline font-semibold">Click to browse</span> or drag and drop files</span>
              )}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Supports PDF, PNG, JPG, or WEBP (Batch processing enabled)</p>
          </div>
        </div>
      </div>

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

      {/* Batch Success Feedback */}
      {batchMessage && (
        <div className="mt-5 p-4 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl text-emerald-700 font-bold text-xs sm:text-sm text-center shadow-sm">
          {batchMessage}
        </div>
      )}

      {/* Single Result Showcase Card */}
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
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Merchant</span>
              <p className="font-extrabold text-slate-800 truncate">{singleResult.merchant_name || "Unknown"}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Date</span>
              <p className="font-extrabold text-slate-800">{singleResult.date || "N/A"}</p>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-2xs">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Tax</span>
              <p className="font-extrabold text-slate-800">₹{singleResult.tax_amount || 0}</p>
            </div>
            <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200/80 shadow-2xs">
              <span className="text-[10px] sm:text-xs font-bold text-purple-600 uppercase tracking-wider block mb-1">Total Amount</span>
              <p className="text-base sm:text-lg font-black text-purple-700">₹{singleResult.total_amount || 0}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceUploader;