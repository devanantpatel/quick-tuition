import React, { useState } from 'react';
import { 
  CheckCircle2, Star, Clock, ShieldCheck, QrCode, 
  ArrowRight, IndianRupee, Loader2, Copy, Check 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { updateBookingStatus, saveSessionInvoice } from '../../lib/db';

export default function SessionReceiptModal({ 
  isOpen, 
  totalSeconds = 0, 
  ratePerMin = 5, 
  tutorName = 'Anant Patel', 
  subjectTitle = '1-on-1 Mentorship',
  userRole = 'student',
  onCloseAndRedirect 
}) {
  if (!isOpen) return null;

  const { activeSession, currentUser } = useApp();

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Time & Billing Calculations
  const totalMinutes = Math.max(1, Math.ceil(totalSeconds / 60));
  const freeMinutes = Math.min(10, totalMinutes);
  const billableMinutes = Math.max(0, totalMinutes - 10);
  const totalAmount = billableMinutes * ratePerMin;

  const tutorUpi = activeSession?.tutorUpi || '7607765685@okbizaxis';
  const tutorQr = activeSession?.tutorQr || '';

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  // Complete Session and Save to Database
  const handleFinishSession = async () => {
    setIsSubmitting(true);
    try {
      const bookingId = activeSession?.id;

      if (bookingId) {
        // 1. Mark booking as completed
        await updateBookingStatus(bookingId, 'completed');

        // 2. Save session invoice log
        await saveSessionInvoice({
          booking_id: bookingId,
          student_id: currentUser?.role === 'student' ? currentUser?.id : activeSession?.student_id,
          teacher_id: activeSession?.teacher_id || activeSession?.teacherId,
          duration_mins: totalMinutes,
          total_amount: totalAmount,
          rating: rating,
          feedback: feedback.trim()
        });
      }
    } catch (err) {
      console.warn('Invoice logging error:', err);
    } finally {
      setIsSubmitting(false);
      if (onCloseAndRedirect) {
        onCloseAndRedirect();
      }
    }
  };

  const copyReceiptSummary = () => {
    const text = `Quick Tuition Session Receipt:\nSubject: ${subjectTitle}\nEducator: ${tutorName}\nDuration: ${formatSeconds(totalSeconds)} (${totalMinutes} mins)\nAmount: ₹${totalAmount}\nDate: ${new Date().toLocaleDateString()}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-5 my-6 animate-in fade-in zoom-in-95">
        
        {/* Header Icon */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Session Completed!</h3>
          <p className="text-xs text-slate-400">
            Summary & bill receipt for <strong className="text-slate-200">{subjectTitle}</strong>
          </p>
        </div>

        {/* Receipt Slip Container */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center text-slate-400 border-b border-slate-800/80 pb-2.5">
            <span>Educator:</span>
            <span className="text-white font-bold">{tutorName}</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> Total Duration:
            </span>
            <span className="text-slate-200">{formatSeconds(totalSeconds)} ({totalMinutes} mins)</span>
          </div>

          <div className="flex justify-between items-center text-emerald-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Free Trial Window:
            </span>
            <span>-{freeMinutes} mins (₹0)</span>
          </div>

          <div className="flex justify-between items-center text-slate-400">
            <span>Billable Time:</span>
            <span className="text-slate-200">{billableMinutes} mins @ ₹{ratePerMin}/min</span>
          </div>

          {/* Total Amount Highlight */}
          <div className="pt-3 border-t border-dashed border-slate-800 flex justify-between items-center text-sm font-sans font-bold">
            <span className="text-white">Total Amount Due:</span>
            <span className={`text-base font-mono flex items-center ${totalAmount === 0 ? 'text-emerald-400' : 'text-indigo-400'}`}>
              {totalAmount === 0 ? 'FREE (₹0)' : `₹${totalAmount}`}
            </span>
          </div>
        </div>

        {/* Copy Receipt Shortcut */}
        <div className="flex justify-end">
          <button
            onClick={copyReceiptSummary}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Receipt Copied!' : 'Copy Summary'}</span>
          </button>
        </div>

        {/* Student Rating Section (Only for Student) */}
        {userRole === 'student' && (
          <div className="space-y-2 pt-1 text-center">
            <label className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              Rate your learning experience
            </label>
            <div className="flex justify-center items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star 
                    className={`w-6 h-6 transition ${
                      (hoverRating || rating) >= star 
                        ? 'fill-amber-400 text-amber-400' 
                        : 'text-slate-700'
                    }`} 
                  />
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Leave quick feedback for tutor (optional)..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
            />
          </div>
        )}

        {/* Dynamic UPI / QR Code Payment (If Billable > 0) */}
        {totalAmount > 0 && userRole === 'student' && (
          <div className="space-y-2">
            {!showQr ? (
              <button
                onClick={() => setShowQr(true)}
                className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition"
              >
                <QrCode className="w-4 h-4" />
                <span>Pay ₹{totalAmount} via Direct UPI (0% Fee)</span>
              </button>
            ) : (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-2.5">
                <div className="w-40 h-40 mx-auto bg-white p-2 rounded-xl flex items-center justify-center shadow-md">
                  {tutorQr ? (
                    <img 
                      src={tutorQr} 
                      alt="Tutor UPI QR" 
                      className="w-full h-full object-contain" 
                    />
                  ) : (
                    <div className="border-2 border-slate-900 border-dashed w-full h-full flex flex-col items-center justify-center font-mono text-slate-900 text-[10px] font-bold p-1">
                      <QrCode className="w-12 h-12 mb-1" />
                      <span>SCAN TO PAY ₹{totalAmount}</span>
                    </div>
                  )}
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  UPI VPA: <strong className="text-emerald-400 select-all">{tutorUpi}</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Finish & Return Button */}
        <div className="pt-2">
          <button
            onClick={handleFinishSession}
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/30 font-sans"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Receipt & Ending...</span>
              </>
            ) : (
              <>
                <span>Finish & Return to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}