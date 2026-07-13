import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { api } from '../../api';
import { Button } from './Button';
import toast from 'react-hot-toast';
import { QrCode, X } from 'lucide-react';

export default function QrDisplayModal({ onClose }: { onClose: () => void }) {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateQR = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/qr');
      setQrToken(res.data.qrToken);
      toast.success('Generated Daily QR Code');
    } catch (err) {
      toast.error('Failed to generate QR Code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full text-center relative shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="h-6 w-6" />
        </button>
        
        <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Check-In QR</h3>
        
        {!qrToken ? (
          <div className="py-8">
            <QrCode className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <Button onClick={generateQR} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Today\'s QR Code'}
            </Button>
            <p className="text-sm text-gray-500 mt-4">This code is valid for 12 hours.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <QRCode value={qrToken} size={200} />
            </div>
            <p className="text-sm text-gray-600 mt-6">
              Have students scan this from their dashboard to instantly mark themselves as Present.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
