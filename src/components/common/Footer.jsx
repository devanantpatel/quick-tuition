import React from 'react';
import { BookOpen, Heart, Code2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-10 px-4 md:px-8 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Brand & Concept */}
        <div className="flex flex-col items-center md:items-start gap-1">
          <div className="flex items-center gap-2 font-bold text-white text-base">
            <div className="bg-indigo-600/20 p-1.5 rounded-lg border border-indigo-500/30 text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <span>Quick<span className="text-indigo-400">Tuition</span></span>
          </div>
          <p className="text-xs text-slate-500">
            Micro-tutoring platform for Maths & Web Development.
          </p>
        </div>

        {/* Developer Credit & Links */}
        <div className="flex flex-col items-center md:items-end gap-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>by</span>
            <span className="font-semibold text-white">Anant Patel</span>
          </div>
          
          <div className="flex items-center gap-3 text-slate-500 text-[11px] pt-1">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-indigo-400 flex items-center gap-1.5 transition"
            >
              {/* Direct GitHub Vector */}
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>
            <span>•</span>
            <span className="text-emerald-400 font-mono flex items-center gap-1">
              <Code2 className="w-3 h-3" /> React + Tailwind
            </span>
          </div>
        </div>

      </div>

      <div className="max-w-6xl mx-auto text-center text-[11px] text-slate-600 pt-6 mt-6 border-t border-slate-900">
        © {new Date().getFullYear()} QuickTuition. All rights reserved.
      </div>
    </footer>
  );
}