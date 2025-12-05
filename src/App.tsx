import { useState, useRef, useEffect } from 'react';
import { X, Minus, Sparkles, Crop, Code2, History as HistoryIcon, Settings, BrainCircuit } from 'lucide-react';
import { solveMcqWithVision } from './lib/gemini';

// Types
type Tab = 'MCQ' | 'DSA' | 'HISTORY' | 'SETTINGS';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('MCQ');
  const [isSnipping, setIsSnipping] = useState(false);
  const [screenShot, setScreenShot] = useState<string | null>(null);
  const [selection, setSelection] = useState<{x:number, y:number, w:number, h:number} | null>(null);
  
  // AI State
  const [loading, setLoading] = useState(false);
  const [mcqResult, setMcqResult] = useState<any | null>(null);

  // Refs for dragging
  const startPos = useRef<{x:number, y:number} | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Handlers ---

  const handleCapture = async () => {
    try {
      // 1. Ask Electron for screen
      const imageSrc = await window.electron.captureScreen();

      // Ensure the captured value is a string before updating state to satisfy TypeScript
      if (typeof imageSrc === 'string') {
        setScreenShot(imageSrc);
        setIsSnipping(true);
        setMcqResult(null); // Reset previous results
      } else {
        console.error("captureScreen returned non-string value:", imageSrc);
      }
    } catch (error) {
      console.error("Capture failed:", error);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startPos.current = { x: e.clientX, y: e.clientY };
    setSelection({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startPos.current) return;
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    setSelection({
      x: Math.min(startPos.current.x, currentX),
      y: Math.min(startPos.current.y, currentY),
      w: Math.abs(currentX - startPos.current.x),
      h: Math.abs(currentY - startPos.current.y)
    });
  };

  const handleMouseUp = async () => {
    if (!selection || !screenShot || selection.w < 10 || selection.h < 10) {
      // Cancel if too small
      setIsSnipping(false);
      startPos.current = null;
      setSelection(null);
      return;
    }

    // 2. Crop Image using Canvas
    const img = new Image();
    img.src = screenShot;
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = selection.w;
      canvas.height = selection.h;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw the slice
        ctx.drawImage(img, selection.x, selection.y, selection.w, selection.h, 0, 0, selection.w, selection.h);
        const croppedBase64 = canvas.toDataURL('image/png');
        
        // 3. Send to Gemini
        setIsSnipping(false);
        setLoading(true);
        
        try {
          const result = await solveMcqWithVision(croppedBase64);
          setMcqResult(result);
        } catch (err) {
          alert("AI Error: " + err);
        } finally {
          setLoading(false);
          setSelection(null);
          startPos.current = null;
        }
      }
    };
  };

  // --- Snipping Overlay View ---
  if (isSnipping && screenShot) {
    return (
      <div 
        className="fixed inset-0 z-50 cursor-crosshair select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ backgroundImage: `url(${screenShot})`, backgroundSize: 'cover' }}
      >
        <div className="absolute inset-0 bg-black/50" />
        {selection && (
          <div 
            className="absolute border-2 border-blue-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.w,
              height: selection.h
            }}
          />
        )}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium animate-pulse">
          Drag to select the question...
        </div>
      </div>
    );
  }

  // --- Main App Interface ---
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden text-white font-sans">
      
      {/* Title Bar */}
      <div className="h-10 bg-slate-800/80 flex items-center justify-between px-4 draggable select-none border-b border-slate-700">
        <div className="flex items-center gap-2 text-blue-400">
          <Sparkles size={16} />
          <span className="font-bold text-sm tracking-wide">OverSolve</span>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <button onClick={() => window.electron.minimizeWindow()} className="p-1.5 hover:bg-slate-700 rounded transition"><Minus size={14} /></button>
          <button onClick={() => window.electron.hideWindow()} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition"><X size={14} /></button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-16 bg-slate-800/50 border-r border-slate-700 flex flex-col items-center py-4 gap-4">
          <NavButton active={activeTab === 'MCQ'} onClick={() => setActiveTab('MCQ')} icon={<Crop size={20} />} label="MCQ" />
          <NavButton active={activeTab === 'DSA'} onClick={() => setActiveTab('DSA')} icon={<Code2 size={20} />} label="DSA" />
          <NavButton active={activeTab === 'HISTORY'} onClick={() => setActiveTab('HISTORY')} icon={<HistoryIcon size={20} />} label="History" />
          <div className="flex-1" />
          <NavButton active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} icon={<Settings size={20} />} label="Settings" />
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-y-auto relative">
          
          {activeTab === 'MCQ' && (
            <div className="flex flex-col items-center h-full max-w-2xl mx-auto w-full animate-in fade-in zoom-in duration-300">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">MCQ Solver</h1>
                <p className="text-slate-400 text-sm">Snap a picture of any multiple-choice question.</p>
              </div>

              {!mcqResult && !loading && (
                <button 
                  onClick={handleCapture}
                  className="group relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-600 rounded-2xl hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer"
                >
                  <div className="bg-blue-500/10 p-4 rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <Crop size={32} className="text-blue-400" />
                  </div>
                  <span className="font-medium text-slate-300">Click to Capture Screen</span>
                  <span className="text-xs text-slate-500 mt-1">or press Global Hotkey</span>
                </button>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-48 space-y-4">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-blue-300 animate-pulse">Analyzing with Gemini...</p>
                </div>
              )}

              {mcqResult && (
                <div className="w-full bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
                  <h3 className="font-semibold text-lg mb-4 text-white">{mcqResult.question}</h3>
                  <div className="space-y-3">
                    {mcqResult.options.map((opt: any, idx: number) => (
                      <div 
                        key={idx} 
                        className={`flex items-center p-3 rounded-lg border ${
                          opt.label === mcqResult.answerLabel 
                            ? 'bg-green-500/10 border-green-500/50' 
                            : 'bg-slate-700/50 border-slate-600'
                        }`}
                      >
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold mr-3 ${
                           opt.label === mcqResult.answerLabel ? 'bg-green-500 text-white' : 'bg-slate-600 text-slate-300'
                        }`}>
                          {opt.label}
                        </span>
                        <span className={opt.label === mcqResult.answerLabel ? 'text-green-100' : 'text-slate-300'}>
                          {opt.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-400 mb-2 font-semibold text-sm">
                      <BrainCircuit size={16} />
                      Explanation
                    </div>
                    <p className="text-sm text-blue-100 leading-relaxed">
                      {mcqResult.explanation}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => setMcqResult(null)}
                    className="mt-6 w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    Solve Another
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'DSA' && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Code2 size={48} className="mb-4 opacity-50" />
              <p>DSA Solver coming in next step...</p>
            </div>
          )}

          {/* Other tabs placeholders */}
          {(activeTab === 'HISTORY' || activeTab === 'SETTINGS') && (
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p>{activeTab} Tab Placeholder</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      title={label}
      className={`p-3 rounded-xl transition-all duration-200 group relative ${
        active 
          ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
          : 'text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {icon}
      {/* Tooltip */}
      <span className="absolute left-14 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 z-50">
        {label}
      </span>
    </button>
  );
}