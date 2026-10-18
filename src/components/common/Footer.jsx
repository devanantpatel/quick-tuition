import React from 'react';
import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/90 py-8 px-4 md:px-8 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Developer Attribution */}
        <div className="space-y-1 text-center sm:text-left">
          <p>
            Engineered & Designed with dedication by <strong className="text-slate-200 font-semibold">Anant Patel</strong>
          </p>
          <p className="text-[11px] text-slate-600 font-mono">
            © {new Date().getFullYear()} QuickTuition. All rights reserved.
          </p>
        </div>

        {/* Links */}
        <div className="flex items-center gap-4 text-[11px] font-medium text-slate-400">
          <span className="hover:text-white cursor-pointer transition">Privacy Policy</span>
          <span>•</span>
          <span className="hover:text-white cursor-pointer transition">Terms of Service</span>
          <span>•</span>
          <span className="hover:text-white cursor-pointer transition">Zero-Fee UPI Model</span>
        </div>

        {/* Made with Love Banner */}
        <div className="text-center sm:text-right">
          <p className="text-[11px] text-slate-500 font-mono flex items-center justify-center sm:justify-end gap-1">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
            <span>for Students & Educators</span>
          </p>
        </div>

      </div>
    </footer>
  );
}