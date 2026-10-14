import React, { useState } from 'react';
import { IndianRupee, Clock, CheckCircle2, QrCode, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SessionReceiptModal({
  isOpen,
  totalSeconds = 0,
  ratePerMin = 5,
  tutorName = 'Educator',
  subjectTitle = 'Mentorship Session',
  userRole = 'student',
  onCloseAndRedirect,
  activeSession
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPaidMarked, setHasPaidMarked] = useState(false);

  if (!isOpen) return null;

  const freeSeconds = 10 * 60;
  const isFreeTrial = totalSeconds <= freeSeconds;
  const billableMinutes = isFreeTrial ? 0 : Math.ceil((totalSeconds - freeSeconds) / 60);
  const totalAmount = billableMinutes * ratePerMin;

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      if (activeSession?.id) {
        // Save duration and final status to database
        await supabase
          .from('session_bookings')
          .update({
            status: 'completed',
            duration_mins: Math.ceil(totalSeconds / 60),
            actual_connected_seconds: totalSeconds,
            total_amount: totalAmount,
            payment_status: totalAmount === 0 ? 'paid' : hasPaidMarked ? 'paid' : 'pending'
          })
          .eq('id', activeSession.id);
      }
    } catch (err) {
      console.warn('Could not update booking completion:', err);
    } finally {
      setIsSubmitting(false);
      if (onCloseAndRedirect) onCloseAndRedirect();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Header Icon */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-white text-lg">Session Completed</h3>
          <p className="text-xs text-slate-400">1-on-1 Mentorship Summary & Invoice</p>
        </div>

        {/* Invoice Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3 font-mono text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Subject:</span>
            <span className="font-semibold text-white truncate max-w-[180px]">{subjectTitle}</span>
          </div>

          <div className="flex justify-between text-slate-300">
            <span>Educator:</span>
            <span className="text-indigo-300">{tutorName}</span>
          </div>

          <div className="flex justify-between text-slate-300">
            <span>Actual Connected Time:</span>
            <span className="text-slate-200">{formatTime(totalSeconds)}</span>
          </div>

          <div className="flex justify-between text-slate-300">
            <span>Free Trial Used:</span>
            <span className="text-emerald-400">10m Free</span>
          </div>

          <div className="flex justify-between text-slate-300">
            <span>Billable Time:</span>
            <span className="text-slate-200">{billableMinutes} mins @ ₹{ratePerMin}/min</span>
          </div>

          <div className="border-t border-slate-800/80 pt-2.5 flex justify-between items-center text-sm font-bold">
            <span className="text-white font-sans">Total Amount:</span>
            <span className="text-emerald-400 text-base">₹{totalAmount}</span>
          </div>
        </div>

        {/* Payment QR / UPI for Student */}
        {totalAmount > 0 && userRole === 'student' && (
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-300">
              <QrCode className="w-4 h-4" />
              <span>Direct Payment to Educator</span>
            </div>

            {activeSession?.tutorQr ? (
              <img 
                src={activeSession.tutorQr} 
                alt="Teacher UPI QR" 
                className="w-36 h-36 object-contain mx-auto rounded-xl bg-white p-2 border border-slate-700 shadow" 
              />
            ) : null}

            {activeSession?.tutorUpi && (
              <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-indigo-200">
                UPI ID: <strong>{activeSession.tutorUpi}</strong>
              </div>
            )}

            <label className="flex items-center justify-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
              <input 
                type="checkbox" 
                checked={hasPaidMarked} 
                onChange={(e) => setHasPaidMarked(e.target.checked)} 
                className="rounded border-slate-700 text-indigo-600 focus:ring-0" 
              />
              <span>I have transferred the payment</span>
            </label>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleFinish}
          disabled={isSubmitting}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-2xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Finalizing Session...</span>
            </>
          ) : (
            <>
              <span>Back to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

      </div>
    </div>
  );
}