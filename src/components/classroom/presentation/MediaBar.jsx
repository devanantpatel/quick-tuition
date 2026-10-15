import React from 'react';
import { 
  Upload, Eye, EyeOff, MousePointer, Pen, Highlighter, 
  Eraser, RotateCcw, FileCheck, Loader2
} from 'lucide-react';

export default function MediaBar({
  currentAsset = null,
  isLiveToStudent = false,
  onToggleLive,
  uploadState = { isUploading: false, progress: 0, speed: '0 KB/s' },
  isUploading = false,
  onFileUpload,
  drawingEnabled = false,
  setDrawingEnabled,
  tool = 'pen',
  setTool,
  onClearOverlay
}) {
  // Safe extraction chahe object aaye ya direct boolean
  const uploading = uploadState?.isUploading ?? Boolean(isUploading);
  const progress = uploadState?.progress ?? 0;
  const speed = uploadState?.speed ?? '0 KB/s';

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-2 flex flex-wrap items-center justify-between gap-2 shrink-0 z-30 select-none">
      
      {/* 1. Left: File Status & Upload Progress */}
      <div className="flex items-center gap-2">
        {uploading ? (
          <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 rounded-xl text-xs font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span className="text-white font-bold">{progress}%</span>
            <span className="text-indigo-300">({speed})</span>
          </div>
        ) : currentAsset?.title ? (
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800 text-xs">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-slate-200 truncate max-w-[200px]">{currentAsset.title}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-sans font-medium">
            No document loaded
          </span>
        )}
      </div>

      {/* 2. Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Upload File Input */}
        <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition shadow">
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span>Upload PDF / PPT</span>
          <input 
            type="file" 
            accept=".pdf,.ppt,.pptx"
            onChange={onFileUpload} 
            className="hidden" 
          />
        </label>

        {/* Broadcast Live Toggle */}
        <button
          onClick={onToggleLive}
          className={`text-xs font-semibold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition shadow ${
            isLiveToStudent 
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20' 
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          {isLiveToStudent ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
          <span>{isLiveToStudent ? 'Live: ON' : 'Present to Student'}</span>
        </button>

        {/* Pointer vs Annotation Controls */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setDrawingEnabled && setDrawingEnabled(false)}
            className={`p-1.5 rounded-lg text-xs transition ${!drawingEnabled ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Cursor Mode"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (setDrawingEnabled) setDrawingEnabled(true);
              if (setTool) setTool('pen');
            }}
            className={`p-1.5 rounded-lg text-xs transition ${drawingEnabled && tool === 'pen' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Pen"
          >
            <Pen className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (setDrawingEnabled) setDrawingEnabled(true);
              if (setTool) setTool('highlighter');
            }}
            className={`p-1.5 rounded-lg text-xs transition ${drawingEnabled && tool === 'highlighter' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Highlighter"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (setDrawingEnabled) setDrawingEnabled(true);
              if (setTool) setTool('eraser');
            }}
            className={`p-1.5 rounded-lg text-xs transition ${drawingEnabled && tool === 'eraser' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
            title="Eraser"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClearOverlay}
            className="p-1.5 text-slate-400 hover:text-rose-400 transition"
            title="Clear Markings"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}