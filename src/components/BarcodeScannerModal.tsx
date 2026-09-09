import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProducts } from '../context/ProductContext';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  QrCode,
  Barcode,
  Camera,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Flashlight,
  Upload,
  SwitchCamera,
  ArrowRight,
} from 'lucide-react';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CameraStatus =
  | 'idle'
  | 'initializing'
  | 'scanning'
  | 'permission_denied'
  | 'no_camera'
  | 'error'
  | 'success';

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, selectProductById } = useProducts();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isHandlingScanRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(false);

  // Play electronic barcode beep using Web Audio API
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // Audio autoplay may be guarded, safe to ignore
    }
  };

  // Process a scanned or typed code and find the matching product
  const processCode = useCallback(
    (rawCode: string) => {
      const clean = rawCode.trim();
      if (!clean) return;

      // 1. Exact match by ID (case-insensitive)
      let found = products.find(
        (p) => p.id.toLowerCase() === clean.toLowerCase()
      );

      // 2. Match by factory code
      if (!found) {
        found = products.find(
          (p) =>
            p.factoryCode &&
            p.factoryCode.trim().toLowerCase() === clean.toLowerCase()
        );
      }

      // 3. Match if QR code contains a URL with product ID or structured string
      if (!found) {
        found = products.find((p) => {
          if (!p.id) return false;
          const idLower = p.id.toLowerCase();
          const cleanLower = clean.toLowerCase();
          return (
            cleanLower === idLower ||
            cleanLower.endsWith(`/${idLower}`) ||
            cleanLower.endsWith(`=${idLower}`) ||
            cleanLower.includes(`id=${idLower}`) ||
            cleanLower.includes(`product/${idLower}`) ||
            cleanLower.includes(idLower)
          );
        });
      }

      if (found) {
        setScannedProduct(found);
        setCameraStatus('success');
        setErrorMsg(null);
        playBeep();
        if ('vibrate' in navigator) {
          try {
            navigator.vibrate(120);
          } catch (e) {}
        }

        // Stop camera scanning
        const scanner = scannerRef.current;
        if (scanner && scanner.isScanning) {
          scanner.stop().catch(() => {});
        }

        // Navigate to product and close modal after brief visual confirmation
        setTimeout(() => {
          if (isMountedRef.current) {
            selectProductById(found.id);
            onClose();
          }
        }, 800);
      } else {
        setErrorMsg(
          `A beolvasott kód: "${clean}", de nem található hozzá termék a nyilvántartásban.`
        );
        setTimeout(() => {
          isHandlingScanRef.current = false;
        }, 2200);
      }
    },
    [products, selectProductById, onClose]
  );

  const handleScanSuccess = useCallback(
    (decodedText: string) => {
      if (isHandlingScanRef.current) return;
      isHandlingScanRef.current = true;
      processCode(decodedText);
    },
    [processCode]
  );

  // Stop camera cleanly
  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (err) {
        console.warn('Scanner stop error:', err);
      }
      scannerRef.current = null;
    }
  }, []);

  // Start camera stream on mobile/desktop
  const startCamera = useCallback(
    async (cameraId?: string) => {
      await stopCamera();
      if (!isMountedRef.current) return;

      setCameraStatus('initializing');
      setErrorMsg(null);
      setScannedProduct(null);
      isHandlingScanRef.current = false;

      // Small delay to ensure the container is ready
      await new Promise((r) => setTimeout(r, 150));
      if (!isMountedRef.current) return;

      const elementId = 'html5-qr-reader';
      const container = document.getElementById(elementId);
      if (!container) {
        setCameraStatus('error');
        setErrorMsg('A kameranézet tároló nem található.');
        return;
      }

      try {
        const scanner = new Html5Qrcode(elementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;

        // Query available cameras
        let availableDevices: any[] = [];
        try {
          const devices = await Html5Qrcode.getCameras();
          if (isMountedRef.current && devices && devices.length > 0) {
            availableDevices = devices;
            setCameras(devices);
          }
        } catch (camErr) {
          console.warn('Could not enumerate cameras:', camErr);
        }

        // Camera configuration:
        // 1. If explicit cameraId given, use it
        // 2. Else if devices enumerated, pick back/rear camera if available, otherwise first device
        // 3. Else fallback to ideal environment facingMode
        let cameraConfig: any;
        if (cameraId) {
          cameraConfig = { deviceId: { exact: cameraId } };
        } else if (availableDevices.length > 0) {
          const backCam = availableDevices.find((d) =>
            /back|rear|environment|hátlap/i.test(d.label || '')
          );
          cameraConfig = { deviceId: { exact: backCam ? backCam.id : availableDevices[0].id } };
        } else {
          cameraConfig = { facingMode: { ideal: 'environment' } };
        }

        const qrboxFunction = (
          viewfinderWidth: number,
          viewfinderHeight: number
        ) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          // Square viewfinder box - ideal for both QR codes and 1D barcodes
          const boxSize = Math.max(180, Math.min(260, Math.floor(minEdge * 0.72)));
          return {
            width: boxSize,
            height: boxSize,
          };
        };

        const onScan = (decodedText: string) => {
          if (isMountedRef.current) {
            handleScanSuccess(decodedText);
          }
        };

        try {
          await scanner.start(
            cameraConfig,
            {
              fps: 15,
              qrbox: qrboxFunction,
            },
            onScan,
            () => {
              // Frame error (no code found in frame), safe to ignore
            }
          );
        } catch (firstErr: any) {
          const firstErrStr = String(firstErr?.message || firstErr);
          // If environment/specified camera failed with NotFoundError, attempt user/front facing camera fallback
          if (
            firstErrStr.includes('NotFoundError') ||
            firstErrStr.includes('OverconstrainedError') ||
            firstErrStr.includes('Requested device not found')
          ) {
            await scanner.start(
              { facingMode: 'user' },
              {
                fps: 15,
                qrbox: qrboxFunction,
              },
              onScan,
              () => {}
            );
          } else {
            throw firstErr;
          }
        }

        if (isMountedRef.current) {
          setCameraStatus('scanning');

          // Check if torch/flashlight capability is available
          try {
            const capabilities: any = (scanner as any).getRunningTrackCameraCapabilities?.();
            if (capabilities && capabilities.torchFeature?.().isSupported()) {
              setHasTorch(true);
            }
          } catch (tErr) {
            // ignore
          }
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        const errStr = String(err?.message || err);

        if (
          errStr.includes('NotFoundError') ||
          errStr.includes('DevicesNotFoundError') ||
          errStr.includes('Requested device not found')
        ) {
          console.warn('Nem található használható kamera az eszközön:', errStr);
          setCameraStatus('no_camera');
          setErrorMsg('Nem található csatlakoztatott kamera az eszközön.');
        } else if (
          errStr.includes('NotAllowedError') ||
          errStr.includes('Permission') ||
          errStr.includes('denied')
        ) {
          console.warn('Kamera hozzáférés megtagadva:', errStr);
          setCameraStatus('permission_denied');
          setErrorMsg(
            'A böngésző nem kapott engedélyt a kamera eléréséhez. Kérjük engedélyezze a kamerát a böngészősávban.'
          );
        } else {
          console.warn('Kamerahiba részlet:', errStr);
          setCameraStatus('error');
          setErrorMsg(`Kamerahiba: ${errStr}`);
        }
      }
    },
    [handleScanSuccess, stopCamera]
  );

  // Switch between cameras on multi-camera devices (e.g. front/rear)
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextCamera = cameras[(currentIndex + 1) % cameras.length];
    setSelectedCameraId(nextCamera.id);
    await startCamera(nextCamera.id);
  };

  // Toggle flashlight / torch if supported
  const handleToggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner || !scanner.isScanning) return;
    try {
      const nextTorch = !torchOn;
      await (scanner as any).applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle not supported:', e);
    }
  };

  // File upload fallback (snap photo or upload barcode image)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMsg(null);
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('html5-qr-reader', { verbose: false });
        scannerRef.current = scanner;
      }
      const decodedText = await scanner.scanFile(file, true);
      processCode(decodedText);
    } catch (err: any) {
      setErrorMsg('Nem található érvényes vonalkód vagy QR kód a kiválasztott képen.');
    }
  };

  // Modal lifecycle
  useEffect(() => {
    if (isOpen) {
      isMountedRef.current = true;
      isHandlingScanRef.current = false;
      setScannedProduct(null);
      setErrorMsg(null);

      // Auto-start camera when modal opens
      startCamera();
    } else {
      isMountedRef.current = false;
      stopCamera();
    }

    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  const handleClose = async () => {
    await stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-stone-200 w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#006067] text-white flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm">
                Vonalkód & QR Kód Szkenner
              </h3>
              <p className="text-[11px] text-stone-500">
                Kamerás beolvasás & azonnali termék megnyitás
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-scanner-modal-btn"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
            title="Bezárás"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewport Section */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          <div className="relative w-full aspect-square max-w-[360px] sm:max-w-[380px] mx-auto bg-stone-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 border-stone-800 shadow-inner">
            {/* HTML5 QR Code video target */}
            <div
              id="html5-qr-reader"
              className="w-full h-full min-h-[260px] flex items-center justify-center"
            />

            {/* Scanning Overlay (Target Reticles & Animated Laser) */}
            {cameraStatus === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Target square reticle (Optimized for QR codes & 1D barcodes) */}
                <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-white/35 rounded-2xl z-10 overflow-hidden shadow-2xl">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-[#00d2df] rounded-tl-xl pointer-events-none" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-[#00d2df] rounded-tr-xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-[#00d2df] rounded-bl-xl pointer-events-none" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-[#00d2df] rounded-br-xl pointer-events-none" />

                  {/* Laser scan animation inside the square */}
                  <div className="absolute inset-x-2 h-[2.5px] bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)] animate-scan-line pointer-events-none" />
                </div>

                {/* Subtitle instructions on camera feed */}
                <div className="mt-3 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-xs text-[11px] text-stone-200 font-medium tracking-wide z-20 flex items-center gap-1.5 border border-white/10 shadow-sm">
                  <QrCode className="w-3.5 h-3.5 text-[#00d2df]" />
                  <span>Irányítsa a kamerát a QR kódra vagy vonalkódra</span>
                </div>
              </div>
            )}

            {/* Camera Floating Action Controls */}
            {cameraStatus === 'scanning' && (
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-30">
                {cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                    title="Kamera váltása (első/hátsó)"
                  >
                    <SwitchCamera className="w-3.5 h-3.5" />
                  </button>
                )}
                {hasTorch && (
                  <button
                    type="button"
                    onClick={handleToggleTorch}
                    className={`p-2 rounded-lg backdrop-blur-xs text-xs flex items-center gap-1 transition-all cursor-pointer shadow-sm ${
                      torchOn
                        ? 'bg-amber-400 text-stone-900 font-bold'
                        : 'bg-black/60 hover:bg-black/80 text-white'
                    }`}
                    title={torchOn ? 'Vaku kikapcsolása' : 'Vaku bekapcsolása'}
                  >
                    <Flashlight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Initializing State */}
            {cameraStatus === 'initializing' && (
              <div className="absolute inset-0 bg-stone-900/90 flex flex-col items-center justify-center text-center p-4 z-20">
                <RefreshCw className="w-8 h-8 text-[#00d2df] animate-spin mb-2" />
                <p className="text-xs font-semibold text-white">Kamera indítása...</p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Kérjük engedélyezze a kamera-hozzáférést a böngészőben.
                </p>
              </div>
            )}

            {/* Permission Denied State */}
            {cameraStatus === 'permission_denied' && (
              <div className="absolute inset-0 bg-stone-950/95 flex flex-col items-center justify-center text-center p-5 z-20 space-y-2">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                <p className="text-xs font-bold text-white">
                  A kamera engedélyezése szükséges
                </p>
                <p className="text-[11px] text-stone-300 max-w-xs leading-relaxed">
                  A telefon böngészőjében koppintson az URL melletti lakat vagy beállítás ikonra, és engedélyezze a kamerát.
                </p>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#006067] hover:bg-[#00474c] text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Újrapróbálás</span>
                </button>
              </div>
            )}

            {/* No Camera / Error State */}
            {(cameraStatus === 'no_camera' || cameraStatus === 'error') && (
              <div className="absolute inset-0 bg-stone-950/95 flex flex-col items-center justify-center text-center p-5 z-20 space-y-2">
                <Camera className="w-8 h-8 text-stone-500 mx-auto" />
                <p className="text-xs font-bold text-white">Kamera nem elérhető</p>
                <p className="text-[11px] text-stone-400 max-w-xs">
                  Ellenőrizze a kamera engedélyét vagy töltsön fel egy képet a galériából.
                </p>
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Kamera újbóli indítása</span>
                </button>
              </div>
            )}

            {/* Scan Success Confirmation Overlay */}
            {cameraStatus === 'success' && scannedProduct && (
              <div className="absolute inset-0 bg-emerald-950/95 flex flex-col items-center justify-center text-center p-6 z-30 animate-in fade-in duration-200 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-bounce">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300">
                    Sikeres Beolvasás!
                  </span>
                  <h4 className="text-sm sm:text-base font-extrabold text-white mt-0.5 max-w-xs truncate">
                    {scannedProduct.name}
                  </h4>
                  <p className="font-mono text-xs font-bold text-emerald-200 mt-1 bg-emerald-900/60 px-2.5 py-0.5 rounded-full inline-block border border-emerald-500/30">
                    {scannedProduct.id}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-300 pt-2 font-medium">
                  <span>Termék adatlap megnyitása</span>
                  <ArrowRight className="w-3 h-3 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Error Message banner */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Clean toolbar: File / photo upload fallback and camera control */}
          <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
              id="camera-file-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-semibold text-[#006067] bg-[#E0E9E8]/70 hover:bg-[#E0E9E8] px-3.5 py-2 rounded-xl border border-[#006067]/20 transition-all cursor-pointer shadow-3xs"
            >
              <Upload className="w-4 h-4 text-[#006067]" />
              <span>Fotó készítése vagy kép feltöltése</span>
            </button>

            <div className="flex items-center gap-2 text-[11px] text-stone-500">
              <Barcode className="w-3.5 h-3.5 text-stone-400" />
              <span>QR kód és vonalkód automata beolvasás</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

