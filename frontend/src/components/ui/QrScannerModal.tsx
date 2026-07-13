import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { api } from '../../api';
import toast from 'react-hot-toast';
import { X, MapPin } from 'lucide-react';

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
      toast.success('Successfully checked in!', { id: 'scan' });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid QR Code', { id: 'scan' });
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-90 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center relative shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10">
          <X className="h-6 w-6" />
        </button>
        
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center justify-center">
          <MapPin className="h-5 w-5 mr-2 text-blue-500" />
          Scan QR to Check In
        </h3>
        
        <div className="overflow-hidden rounded-lg">
          <Scanner 
            onResult={(text) => handleScan(text)}
            onError={(error) => console.log(error?.message)}
          />
        </div>
        
        <p className="text-sm text-gray-500 mt-4">
          Point your camera at the teacher/admin's screen. Your GPS location will be recorded.
        </p>
      </div>
    </div>
  );
}
