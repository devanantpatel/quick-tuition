import React, { useState } from 'react';
import { QrCode, CreditCard, Upload, Loader2 } from 'lucide-react';

export default function PayoutModal({ 
  isOpen, 
  onClose, 
  payoutMethod, 
  setPayoutMethod, 
  upiId, 
  setUpiId, 
  qrCodeUrl, 
  onQrUpload, 
  bankDetails, 
  setBankDetails,
  onSave // Database save callback from parent
}) {
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave({
          payoutMethod,
          upiId,
          qrCodeUrl,
          bankDetails
        });
      }
      onClose();
    } catch (err) {
      console.error('Payout save error:', err);
      alert('Failed to save payout settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-5">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
        
        <div>
          <h3 className="text-lg font-bold text-white">Payment & Payout Settings</h3>
          <p className="text-slate-400 text-xs">Choose how students pay you for sessions.</p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setPayoutMethod('upi')}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition ${
              payoutMethod === 'upi' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" /> Direct UPI / QR Code
          </button>
          <button
            type="button"
            onClick={() => setPayoutMethod('gateway')}
            className={`py-2 rounded-lg flex items-center justify-center gap-2 transition ${
              payoutMethod === 'gateway' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" /> Payment Gateway
          </button>
        </div>

        {payoutMethod === 'upi' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-400 text-[11px]">
              ✓ 0% Platform Fee: Students will scan your QR or send directly to your UPI ID.
            </div>

            <div>
              <label className="text-slate-400 font-medium block mb-1">Your UPI ID (VPA)</label>
              <input 
                type="text" 
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@oksbi / paytm"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-400 font-medium block mb-1">Upload UPI QR Code Image</label>
              <div className="flex items-center gap-3">
                <label className="flex-1 bg-slate-950 border border-dashed border-slate-800 rounded-xl p-4 text-center cursor-pointer hover:border-slate-700 transition">
                  <Upload className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-400">Click to upload QR Image</span>
                  <input type="file" accept="image/*" onChange={onQrUpload} className="hidden" />
                </label>
                {qrCodeUrl && (
                  <div className="w-20 h-20 rounded-xl border border-slate-700 overflow-hidden bg-slate-950 flex items-center justify-center">
                    <img src={qrCodeUrl} alt="QR Code Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {payoutMethod === 'gateway' && (
          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-indigo-300 text-[11px]">
              Automated Wallet Deduction: Platform automatically collects from student and deposits to your bank account.
            </div>

            <div>
              <label className="text-slate-400 font-medium block mb-1">Account Holder Name</label>
              <input 
                type="text" 
                value={bankDetails.accountName}
                onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Account Number</label>
                <input 
                  type="text" 
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-slate-400 font-medium block mb-1">IFSC Code</label>
                <input 
                  type="text" 
                  value={bankDetails.ifsc}
                  onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        <button 
          disabled={isSaving}
          onClick={handleSave}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving to Database...</span>
            </>
          ) : (
            <span>Save Payout Settings</span>
          )}
        </button>
      </div>
    </div>
  );
}