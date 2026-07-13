import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { X, MapPin, Scan, Loader2 } from 'lucide-react';

export default function QrScannerModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [processing, setProcessing] = useState(false);

  const handleScan = (text: string) => {
    if (processing) return;
    setProcessing(true);
    toast.loading('Capturing location...', { id: 'scan' });

    if (!navigator.geolocation) {
      submitCheckIn(text, null, null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        submitCheckIn(text, position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        toast.error('Location denied. Recording without GPS.');
        submitCheckIn(text, null, null);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const submitCheckIn = async (qrToken: string, lat: number | null, lng: number | null) => {
    try {
      toast.loading('Verifying check-in...', { id: 'scan' });
      await api.post('/attendance/scan', { qrToken, lat, lng });
      toast.success('Successfully checked in!', { id: 'scan', duration: 4000 });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid QR Code', { id: 'scan' });
      // Wait a bit before allowing another scan
      setTimeout(() => setProcessing(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Darker blurred backdrop to emphasize the camera */}
      <div 
        className="absolute inset-0 bg-slate-900/90 backdrop-blur-md transition-opacity duration-300" 
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-300 overflow-hidden flex flex-col">
        
        {/* Floating Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 backdrop-blur-md transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center relative z-10 bg-gradient-to-b from-slate-900 to-transparent">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 mb-3 border border-indigo-500/20">
            <Scan className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">Scan to Check In</h3>
          <p className="text-sm text-slate-400 mt-2 flex items-center justify-center">
            <MapPin className="h-4 w-4 mr-1 text-emerald-400" /> 
            GPS Location will be recorded
          </p>
        </div>
        
        {/* Viewfinder Area */}
        <div className="relative bg-black aspect-[4/5] w-full flex items-center justify-center overflow-hidden">
          {processing ? (
            <div className="flex flex-col items-center justify-center z-20 text-white">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-4" />
              <p className="font-medium animate-pulse text-indigo-100">Verifying...</p>
            </div>
          ) : (
            <Scanner 
              onResult={(text) => handleScan(text)}
              onError={(error) => console.log(error?.message)}
              components={{
                audio: false,
                finder: false // We will draw our own cool finder
              }}
              styles={{
                container: { width: '100%', height: '100%' },
                video: { objectFit: 'cover' }
              }}
            />
          )}

          {/* Custom Viewfinder Overlay */}
          {!processing && (
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-white/20 rounded-3xl relative">
                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-3xl"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-3xl"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-3xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-3xl"></div>
                {/* Scanning line animation */}
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900 p-6 text-center">
          <p className="text-sm text-slate-500 font-medium">
            Point your camera at the teacher/admin's screen to automatically check in.
          </p>
        </div>

      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
