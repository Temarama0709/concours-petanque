import React, { useEffect, useRef, useState } from 'react';

function LiveStream({ onClose }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    const startLive = async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setStream(media);
        if (videoRef.current) {
          videoRef.current.srcObject = media;
        }
      } catch (err) {
        alert("⚠️ Autorisation caméra/micro refusée ou non disponible.");
        onClose();
      }
    };

    startLive();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex flex-col items-center justify-center p-4">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full max-w-md rounded shadow-lg mb-4"
      />
      <button onClick={onClose} className="bg-red-600 text-white px-3 py-1 rounded">
        ❌ Arrêter le live
      </button>

    </div>
  );
  
}
export default LiveStream;
