import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Upload } from 'lucide-react';
import MediaBar from './presentation/MediaBar';
import AnnotationLayer from './presentation/AnnotationLayer';
import PdfViewer from './presentation/PdfViewer';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

export default function PresentationViewer({ 
  broadcast, 
  registerListener, 
  isTeacher: propIsTeacher 
}) {
  const { currentUser } = useApp();
  const isTeacher = propIsTeacher ?? (currentUser?.role === 'teacher');

  const [documents, setDocuments] = useState(() => {
    try {
      const saved = localStorage.getItem('classroom_docs_tray');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [isLiveToStudent, setIsLiveToStudent] = useState(true);
  const [uploadState, setUploadState] = useState({ isUploading: false, progress: 0, speed: '0 KB/s' });
  const [drawingEnabled, setDrawingEnabled] = useState(false);
  const [tool, setTool] = useState('pen');

  useEffect(() => {
    try {
      localStorage.setItem('classroom_docs_tray', JSON.stringify(documents));
    } catch (e) {}
  }, [documents]);

  const broadcastCurrentState = useCallback((docs = documents, activeIdx = activeDocIndex) => {
    if (broadcast && isTeacher && docs.length > 0) {
      broadcast('presentation:sync_state', {
        documents: docs,
        activeDocIndex: activeIdx,
        activeDoc: docs[activeIdx] || null,
        isLive: true
      });
    }
  }, [broadcast, isTeacher, documents, activeDocIndex]);

  useEffect(() => {
    if (!registerListener) return;

    registerListener('presentation:sync_state', (data) => {
      if (!isTeacher && data) {
        if (data.documents && data.documents.length > 0) {
          setDocuments(data.documents);
          setActiveDocIndex(data.activeDocIndex || 0);
          setIsLiveToStudent(true);
        }
      }
    });

    registerListener('presentation:request_sync', () => {
      if (isTeacher) {
        broadcastCurrentState();
      }
    });
  }, [registerListener, isTeacher, broadcastCurrentState]);

  useEffect(() => {
    if (!isTeacher) return;
    const interval = setInterval(() => {
      broadcastCurrentState();
    }, 2500);
    return () => clearInterval(interval);
  }, [isTeacher, broadcastCurrentState]);

  useEffect(() => {
    if (!isTeacher && broadcast) {
      broadcast('presentation:request_sync', {});
    }
  }, [isTeacher, broadcast]);

  const handleToggleLive = () => {
    const nextState = !isLiveToStudent;
    setIsLiveToStudent(nextState);
    if (broadcast && isTeacher) {
      broadcast('presentation:sync_state', {
        documents,
        activeDocIndex,
        isLive: nextState
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadState({ isUploading: true, progress: 30, speed: '3.2 MB/s' });

    let finalUrl = '';
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;
    const filePath = `presentations/${fileName}`;

    try {
      const { data, error } = await supabase.storage
        .from('classroom-assets')
        .upload(filePath, file, { 
          cacheControl: '86400', 
          upsert: true,
          contentType: file.type || 'application/octet-stream'
        });

      if (!error) {
        const { data: publicUrlData } = supabase.storage
          .from('classroom-assets')
          .getPublicUrl(filePath);
        finalUrl = publicUrlData.publicUrl;
      }
    } catch (err) {
      console.warn('Storage upload error:', err);
    }

    if (!finalUrl) {
      finalUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }

    setUploadState({ isUploading: false, progress: 100, speed: 'Done' });

    const newDoc = {
      id: `${Date.now()}`,
      name: file.name,
      url: finalUrl,
      type: file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'ppt'
    };

    const updated = [...documents, newDoc];
    const newIndex = updated.length - 1;
    setDocuments(updated);
    setActiveDocIndex(newIndex);

    broadcastCurrentState(updated, newIndex);
  };

  const handleRemoveDoc = (indexToRemove) => {
    const updated = documents.filter((_, idx) => idx !== indexToRemove);
    const newIdx = Math.max(0, indexToRemove - 1);
    setDocuments(updated);
    setActiveDocIndex(newIdx);
    broadcastCurrentState(updated, newIdx);
  };

  const activeDoc = documents[activeDocIndex] || null;

  return (
    <div className="flex flex-col h-full w-full bg-slate-950 overflow-hidden relative select-none">
      
      {/* 1. Header Toolbar for Teacher */}
      {isTeacher && (
        <MediaBar 
          currentAsset={activeDoc ? { title: activeDoc.name } : null}
          isLiveToStudent={isLiveToStudent}
          onToggleLive={handleToggleLive}
          uploadState={uploadState}
          onFileUpload={handleFileUpload}
          drawingEnabled={drawingEnabled}
          setDrawingEnabled={setDrawingEnabled}
          tool={tool}
          setTool={setTool}
          onClearOverlay={() => broadcast && isTeacher && broadcast('presentation:clear_overlay', {})}
        />
      )}

      {/* 2. Main Stage */}
      <div className="flex-1 relative flex items-center justify-center p-2 overflow-hidden bg-slate-950">
        
        {documents.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-slate-800 rounded-3xl max-w-sm space-y-4">
            <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold">Presentation Tray Ready</h4>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                {isTeacher 
                  ? 'Upload multiple PDF or PowerPoint files to present with instant sync.' 
                  : 'Waiting for educator to start presenting...'}
              </p>
            </div>

            {isTeacher && (
              <label className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition shadow-lg shadow-indigo-600/30 mx-auto">
                <Upload className="w-4 h-4" />
                <span>Upload PDF / PPT</span>
                <input 
                  type="file" 
                  accept=".pdf,.ppt,.pptx"
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            )}
          </div>
        ) : (
          <PdfViewer 
            documents={documents}
            activeDocIndex={activeDocIndex}
            onSelectDoc={(idx) => {
              setActiveDocIndex(idx);
              broadcastCurrentState(documents, idx);
            }}
            onRemoveDoc={handleRemoveDoc}
            isTeacher={isTeacher}
            broadcast={broadcast}
            registerListener={registerListener}
          />
        )}

        {/* Transparent Annotation Overlay */}
        {activeDoc && (
          <AnnotationLayer 
            drawingEnabled={drawingEnabled}
            tool={tool}
            broadcast={broadcast}
            registerListener={registerListener}
            isTeacher={isTeacher}
          />
        )}
      </div>
    </div>
  );
}