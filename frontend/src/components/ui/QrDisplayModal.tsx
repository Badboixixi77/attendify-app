import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { api } from '../../api';
import { Button } from './Button';
import toast from 'react-hot-toast';
import { QrCode, X, RefreshCw, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

export default function QrDisplayModal({ onClose }: { onClose: () => void }) {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateQR = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/qr');
      setQrToken(res.data.qrToken);
      toast.success('Generated securely!');
    } catch (err) {
      toast.error('Failed to generate QR Code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Blurred Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-300 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Daily Check-In</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-8 flex flex-col items-center justify-center bg-white">
          {!qrToken ? (
            <div className="flex flex-col items-center text-center w-full">
              <div className="h-24 w-24 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                <QrCode className="h-10 w-10 text-slate-300" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Ready to start class?</h4>
              <p className="text-sm text-slate-500 mb-8 max-w-[250px]">
                Generate a secure, time-sensitive QR code for users to scan and check in.
              </p>
              <Button onClick={generateQR} disabled={loading} size="lg" className="w-full font-bold">
                {loading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  'Generate Secure QR'
                )}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center w-full animate-in slide-in-from-bottom-4 fade-in duration-500">
              <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 mb-6">
                <QRCode value={qrToken} size={220} className="rounded-xl" />
              </div>
              
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Active for {format(new Date(), 'MMM do, yyyy')}
              </div>

              <p className="text-sm text-slate-600 mb-6 font-medium">
                Students can point their camera here from the dashboard to check in instantly.
              </p>

              <Button onClick={generateQR} variant="secondary" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Code
              </Button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
