import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, CheckCircle2, QrCode, ShieldCheck, 
  ArrowRight, Loader2, Copy, Check, ExternalLink, Image as ImageIcon,
  CheckCircle, Clock, AlertTriangle, User, GraduationCap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SessionReceiptModal({
  isOpen,
  totalSeconds = 0,
  ratePerMin = 5,
  tutorName = '',
  subjectTitle = 'Mentorship Session',
  userRole = 'student',
  activeSession,
  currentUser,
  onCloseAndRedirect
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [activeQrTab, setActiveQrTab] = useState('dynamic'); // 'dynamic' | 'uploaded'

  // Real Database Details
  const [teacherData, setTeacherData] = useState({
    name: tutorName || activeSession?.teacherName || activeSession?.teacher_name || 'Educator',
    upiId: activeSession?.tutorUpi || activeSession?.teacher_upi || '',
    uploadedQrUrl: activeSession?.tutorQr || activeSession?.teacher_qr_url || null
  });

  const [studentData, setStudentData] = useState({
    name: activeSession?.studentName || activeSession?.student_name || currentUser?.name || 'Student'
  });

  const [bookingPaymentStatus, setBookingPaymentStatus] = useState(
    activeSession?.payment_status || 'pending'
  );

  // Fetch real teacher profile if activeSession doesn't have UPI/QR populated
  useEffect(() => {
    async function loadTeacherProfile() {
      const teacherId = activeSession?.teacher_id || activeSession?.tutorId;
      if (!teacherId) return;

      try {
        const { data, error } = await supabase
          .from('teacher_profiles')
          .select('full_name, upi_id, qr_code_url')
          .eq('user_id', teacherId)
          .maybeSingle();

        if (data && !error) {
          setTeacherData((prev) => ({
            name: data.full_name || prev.name,
            upiId: data.upi_id || prev.upiId,
            uploadedQrUrl: data.qr_code_url || prev.uploadedQrUrl
          }));
        }
      } catch (err) {
        console.warn('Teacher profile fetch failed:', err);
      }
    }

    if (isOpen) {
      loadTeacherProfile();
    }
  }, [isOpen, activeSession]);

  // Real-time listener for payment status updates
  useEffect(() => {
    if (!activeSession?.id || !isOpen) return;

    const channel = supabase
      .channel(`payment_sync_${activeSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_bookings',
          filter: `id=eq.${activeSession.id}`
        },
        (payload) => {
          if (payload.new?.payment_status) {
            setBookingPaymentStatus(payload.new.payment_status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession?.id, isOpen]);

  if (!isOpen) return null;

  // 5 Minutes Free Trial
  const freeSeconds = 5 * 60;
  const isFreeTrial = totalSeconds <= freeSeconds;
  const billableMinutes = isFreeTrial ? 0 : Math.ceil((totalSeconds - freeSeconds) / 60);
  const totalAmount = billableMinutes * ratePerMin;

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const realTeacherName = teacherData.name || 'Educator';
  const realStudentName = studentData.name || 'Student';
  const realUpiId = teacherData.upiId;

  // Exact UPI URI Standard Spec
  const sessionNote = encodeURIComponent(`Tuition_${activeSession?.id || 'session'}`);
  const baseUpiUrl = realUpiId
    ? `upi://pay?pa=${encodeURIComponent(realUpiId)}&pn=${encodeURIComponent(realTeacherName)}&am=${totalAmount}&cu=INR&tn=${sessionNote}`
    : '';

  // Dynamic QR Code Generated strictly from teacher's UPI
  const dynamicGeneratedQrUrl = baseUpiUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(baseUpiUrl)}`
    : null;

  // App specific deep links
  const gpayLink = baseUpiUrl ? baseUpiUrl.replace('upi://', 'tez://upi/') : '';
  const phonepeLink = baseUpiUrl ? baseUpiUrl.replace('upi://', 'phonepe://') : '';
  const paytmLink = baseUpiUrl ? baseUpiUrl.replace('upi://', 'paytmmp://') : '';

  const handleCopyUpi = () => {
    if (realUpiId) {
      navigator.clipboard.writeText(realUpiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 1500);
    }
  };

  // Student marks transferred
  const handleMarkTransferred = async () => {
    if (!activeSession?.id) return;
    setIsSubmitting(true);
    try {
      await supabase
        .from('session_bookings')
        .update({
          payment_status: 'review_pending',
          actual_connected_seconds: totalSeconds,
          total_amount: totalAmount
        })
        .eq('id', activeSession.id);
      setBookingPaymentStatus('review_pending');
    } catch (e) {
      console.warn('Error marking payment:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Teacher confirms payment received
  const handleConfirmReceived = async () => {
    if (!activeSession?.id) return;
    setIsSubmitting(true);
    try {
      await supabase
        .from('session_bookings')
        .update({
          status: 'completed',
          payment_status: 'paid',
          actual_connected_seconds: totalSeconds,
          total_amount: totalAmount,
          completed_at: new Date().toISOString()
        })
        .eq('id', activeSession.id);
      setBookingPaymentStatus('paid');
    } catch (e) {
      console.warn('Error confirming payment:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalRedirect = () => {
    if (onCloseAndRedirect) onCloseAndRedirect();
  };

  const isTeacher = userRole === 'teacher';

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl relative space-y-4 my-auto">
        
        {/* Header Section */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-white text-base sm:text-lg">Class Completed & Verified Bill</h3>
          <p className="text-xs text-slate-400">1-on-1 Tuition Session Reconciliation</p>
        </div>

        {/* Invoice Summary with Real Names */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2.5 font-mono text-xs">
          <div className="flex justify-between text-slate-300">
            <span>Subject:</span>
            <span className="font-semibold text-white truncate max-w-[200px]">{subjectTitle}</span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Educator:
            </span>
            <span className="text-indigo-300 font-bold">{realTeacherName}</span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-emerald-400" /> Student:
            </span>
            <span className="text-emerald-300 font-bold">{realStudentName}</span>
          </div>

          <div className="flex justify-between text-slate-300">
            <span>Connected Time:</span>
            <span className="text-slate-200">{formatTime(totalSeconds)}</span>
          </div>

          <div className="flex justify-between text-slate-300">
            <span>Free Trial Benefit:</span>
            <span className="text-emerald-400">5m Free Trial</span>
          </div>

          <div className="flex justify-between text-slate-300">
            <span>Billable Minutes:</span>
            <span className="text-slate-200">{billableMinutes} mins @ ₹{ratePerMin}/min</span>
          </div>

          <div className="border-t border-slate-800/80 pt-2 flex justify-between items-center text-sm font-bold">
            <span className="text-white font-sans">Total Amount:</span>
            <div className="flex items-center text-emerald-400 text-base">
              <IndianRupee className="w-4 h-4 mr-0.5" />
              <span>{totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Real Payment Status Banner */}
        <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
          bookingPaymentStatus === 'paid'
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : bookingPaymentStatus === 'review_pending'
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
            : 'bg-slate-950 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center gap-1.5">
            {bookingPaymentStatus === 'paid' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : bookingPaymentStatus === 'review_pending' ? (
              <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-slate-400" />
            )}
            <span>Payment Status:</span>
          </div>
          <span className="capitalize font-mono">
            {bookingPaymentStatus === 'paid' ? 'PAID & VERIFIED' : bookingPaymentStatus === 'review_pending' ? 'CONFIRMATION PENDING' : 'PAYMENT DUE'}
          </span>
        </div>

        {/* STUDENT PAYMENT INTERFACE */}
        {totalAmount > 0 && !isTeacher && bookingPaymentStatus !== 'paid' && (
          <div className="p-3.5 rounded-2xl bg-indigo-950/25 border border-indigo-500/30 space-y-3">
            
            {/* 2-Scanner Tab Switcher */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveQrTab('dynamic')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  activeQrTab === 'dynamic' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Auto Billed QR</span>
              </button>

              {teacherData.uploadedQrUrl && (
                <button
                  type="button"
                  onClick={() => setActiveQrTab('uploaded')}
                  className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    activeQrTab === 'uploaded' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Teacher's Uploaded QR</span>
                </button>
              )}
            </div>

            {/* QR Displays */}
            <div className="flex flex-col items-center">
              <div className="bg-white p-2.5 rounded-2xl shadow-md border border-slate-700">
                {activeQrTab === 'dynamic' && dynamicGeneratedQrUrl && (
                  <img 
                    src={dynamicGeneratedQrUrl} 
                    alt="Exact Bill QR Code" 
                    className="w-40 h-40 object-contain"
                  />
                )}
                {activeQrTab === 'uploaded' && teacherData.uploadedQrUrl && (
                  <img 
                    src={teacherData.uploadedQrUrl} 
                    alt="Teacher Uploaded QR" 
                    className="w-40 h-40 object-contain"
                  />
                )}
              </div>
              <span className="text-[10px] text-slate-400 mt-1.5">
                {activeQrTab === 'dynamic' 
                  ? `Pre-filled Amount: ₹${totalAmount} to ${realTeacherName}`
                  : `Verified QR of Educator: ${realTeacherName}`}
              </span>
            </div>

            {/* One-Click UPI App Launcher Buttons */}
            {baseUpiUrl && (
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-semibold block text-center">Direct Pay via UPI Apps:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <a
                    href={gpayLink || baseUpiUrl}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-200 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition"
                  >
                    <span>GPay</span>
                    <ExternalLink className="w-2.5 h-2.5 text-indigo-400" />
                  </a>
                  <a
                    href={phonepeLink || baseUpiUrl}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-purple-300 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition"
                  >
                    <span>PhonePe</span>
                    <ExternalLink className="w-2.5 h-2.5 text-purple-400" />
                  </a>
                  <a
                    href={paytmLink || baseUpiUrl}
                    className="bg-slate-950 hover:bg-slate-800 border border-slate-700 text-sky-300 py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition"
                  >
                    <span>Paytm</span>
                    <ExternalLink className="w-2.5 h-2.5 text-sky-400" />
                  </a>
                </div>
              </div>
            )}

            {/* Teacher UPI ID Copy Row */}
            {realUpiId ? (
              <div className="flex items-center justify-between p-2 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-indigo-200">
                <span className="truncate pr-2">UPI: <strong>{realUpiId}</strong></span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition shrink-0"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <div className="p-2 bg-amber-950/40 rounded-xl border border-amber-500/30 text-[11px] text-amber-300 text-center">
                Teacher has not updated UPI ID in their profile.
              </div>
            )}

            {/* Student Payment Confirmation Action */}
            <button
              type="button"
              onClick={handleMarkTransferred}
              disabled={isSubmitting || bookingPaymentStatus === 'review_pending'}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-bold py-2.5 rounded-xl transition shadow flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : bookingPaymentStatus === 'review_pending' ? (
                <span>Payment Sent (Waiting for Teacher to Confirm)</span>
              ) : (
                <span>I Have Transferred ₹{totalAmount}</span>
              )}
            </button>
          </div>
        )}

        {/* TEACHER PAYMENT VERIFICATION INTERFACE */}
        {totalAmount > 0 && isTeacher && bookingPaymentStatus !== 'paid' && (
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2 text-center">
            <h4 className="font-bold text-amber-300 text-xs">Verify Student Payment</h4>
            <p className="text-[11px] text-slate-400">
              Please check your bank/UPI app for ₹{totalAmount} from student <strong>{realStudentName}</strong>.
            </p>
            <button
              type="button"
              onClick={handleConfirmReceived}
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-xl transition shadow flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span>Confirm Payment Received (₹{totalAmount})</span>
            </button>
          </div>
        )}

        {/* Free Trial Completed Banner */}
        {totalAmount === 0 && (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Class completed within the 5-minute Free Trial. No charge applies!</span>
          </div>
        )}

        {/* Exit & Close Action */}
        <button
          type="button"
          onClick={handleFinalRedirect}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-2xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
        >
          <span>{bookingPaymentStatus === 'paid' || totalAmount === 0 ? 'Back to Dashboard' : 'Close & Exit Classroom'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}