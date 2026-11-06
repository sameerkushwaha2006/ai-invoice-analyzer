import { useState, useEffect } from 'react';
import InvoiceUploader from './components/InvoiceUploader';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth'; 

// PDF extraction ke liye
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Download, LogOut } from 'lucide-react';

function App() {
  const [currentBatchId, setCurrentBatchId] = useState(null); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('userName');
    const savedBatchId = localStorage.getItem('currentBatchId'); 
    
    if (token && name) {
      setIsAuthenticated(true);
      setUserName(name);
      if (savedBatchId) {
        setCurrentBatchId(savedBatchId); 
      }
    }
  }, []);

  const handleUploadSuccess = (batchId) => {
    setCurrentBatchId(batchId);
    localStorage.setItem('currentBatchId', batchId); 
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    setUserName('');
    setCurrentBatchId(null); 
  };

  const downloadReportPDF = async () => {
    const reportElement = document.getElementById('pdf-report-content');
    if (!reportElement) return alert("Bhai, pehle koi data toh screen par aane do!");

    setIsDownloading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await toPng(reportElement, {
        quality: 1,
        pixelRatio: 2, 
        backgroundColor: '#f8fafc' 
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`FinTech_Analysis_Report_${Date.now()}.pdf`);

    } catch (error) {
      console.error("Asli PDF error:", error);
      alert(`Bhai exact error ye hai: ${error.message || error}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/40 to-teal-50/40 text-slate-800 py-6 px-3 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Luxury Ambient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-400/20 blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-400/20 blur-[140px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Premium Glassmorphism Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 bg-white/70 backdrop-blur-2xl py-4 px-6 sm:px-8 rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] gap-4 sm:gap-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-teal-400 flex items-center justify-center shadow-md shadow-purple-500/20">
              <span className="text-white font-black text-lg">N</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
               Nexus<span className="text-purple-600 font-light">AI</span> <span className="text-xs uppercase tracking-widest px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-bold ml-1 align-middle">FinTech</span>
            </h1>
          </div>
          
          {/* User & Logout Section */}
          {isAuthenticated && (
            <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
              <span className="font-medium text-slate-500 text-xs sm:text-sm">Hi, <span className="text-slate-800 font-bold">{userName}</span></span>
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-1.5 bg-slate-100/80 hover:bg-red-50 border border-slate-200/60 text-slate-600 hover:text-red-600 hover:border-red-200 px-3.5 py-2 rounded-xl font-semibold text-xs transition-all duration-300 shadow-sm"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Conditional Rendering */}
        {isAuthenticated ? (
          <>
            {/* PDF Download Action Bar */}
            <div className="flex justify-end mb-6">
              <button
                onClick={downloadReportPDF}
                disabled={isDownloading}
                className={`flex items-center gap-2 font-bold py-3 px-6 rounded-2xl text-white text-xs sm:text-sm shadow-xl transition-all duration-300 ${
                  isDownloading 
                    ? 'bg-slate-300 cursor-wait text-slate-600 shadow-none' 
                    : 'bg-gradient-to-r from-purple-600 via-purple-700 to-teal-500 shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-95'
                }`}
              >
                {isDownloading ? (
                   <span className="flex items-center gap-2">
                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                     Generating PDF...
                   </span>
                ) : (
                  <>
                    <Download size={16} /> Download Full Report
                  </>
                )}
              </button>
            </div>

            {/* Main Content Report Wrapper */}
            <div id="pdf-report-content" className="space-y-6 rounded-3xl bg-transparent">
              <InvoiceUploader onUploadSuccess={handleUploadSuccess} />
              <Dashboard batchId={currentBatchId} />
            </div>
          </>
        ) : (
          <Auth onLoginSuccess={(name) => {
            setIsAuthenticated(true);
            setUserName(name);
            
            const savedBatchId = localStorage.getItem('currentBatchId');
            if (savedBatchId) {
              setCurrentBatchId(savedBatchId);
            }
          }} />
        )}
        
      </div>
    </div>
  );
}

export default App;