import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useProducts } from '../context/ProductContext';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  QrCode,
  Barcode,
  Search,
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
  const [scanInput, setScanInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
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
        try {
          const devices = await Html5Qrcode.getCameras();
          if (isMountedRef.current && devices && devices.length > 0) {
            setCameras(devices);
          }
        } catch (camErr) {
          console.warn('Could not enumerate cameras:', camErr);
        }

        // Camera configuration: on mobile prioritize back/environment camera
        const cameraConfig = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: 'environment' };

        const qrboxFunction = (
          viewfinderWidth: number,
          viewfinderHeight: number
        ) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.max(180, Math.floor(minEdge * 0.75));
          return {
            width: boxSize,
            height: Math.floor(boxSize * 0.75),
          };
        };

        await scanner.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: qrboxFunction,
            aspectRatio: 1.333,
          },
          (decodedText) => {
            if (isMountedRef.current) {
              handleScanSuccess(decodedText);
            }
          },
          () => {
            // Frame error (no code found in frame), safe to ignore
          }
        );

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
        console.error('Camera start error:', err);
        const errStr = String(err?.message || err);

        if (
          errStr.includes('NotAllowedError') ||
          errStr.includes('Permission') ||
          errStr.includes('denied')
        ) {
          setCameraStatus('permission_denied');
          setErrorMsg(
            'A böngésző nem kapott engedélyt a kamera eléréséhez. Kérjük engedélyezze a kamerát a böngészősávban.'
          );
        } else if (
          errStr.includes('NotFoundError') ||
          errStr.includes('DevicesNotFoundError')
        ) {
          setCameraStatus('no_camera');
          setErrorMsg('Nem található csatlakoztatott kamera az eszközön.');
        } else {
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
      setScanInput('');

      // Auto-start camera when modal opens
      startCamera();

      // Focus input as fallback
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
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

  const handleManualLookup = () => {
    processCode(scanInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualLookup();
    }
  };

  const handleClose = async () => {
    await stopCamera();
    onClose();
  };

  const quickSamples = products.slice(0, 4);

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
          <div className="relative min-h-[220px] max-h-[300px] sm:min-h-[250px] bg-stone-950 rounded-xl overflow-hidden flex flex-col items-center justify-center border-2 border-stone-800 shadow-inner">
            {/* HTML5 QR Code video target */}
            <div
              id="html5-qr-reader"
              className="w-full h-full min-h-[220px] flex items-center justify-center"
            />

            {/* Scanning Overlay (Target Reticles & Animated Laser) */}
            {cameraStatus === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Laser scan animation */}
                <div className="absolute left-4 right-4 h-[2.5px] bg-red-500 shadow-[0_0_14px_rgba(239,68,68,1)] animate-scan-line z-20" />

                {/* Target box reticle */}
                <div className="relative w-56 h-44 sm:w-64 sm:h-48 border border-white/25 rounded-lg z-10">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-[#00d2df] rounded-tl" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-[#00d2df] rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-[#00d2df] rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-[#00d2df] rounded-br" />
                </div>

                {/* Subtitle instructions on camera feed */}
                <div className="absolute bottom-2.5 px-3 py-1 rounded-full bg-black/65 backdrop-blur-xs text-[11px] text-stone-200 font-medium tracking-wide z-20">
                  Irányítsa a kamerát a vonalkódra vagy QR kódra
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
                  Használja az alábbi manuális kódkeresőt, vagy töltsön fel egy vonalkódos képet.
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

          {/* Quick options bar: Photo upload / File scan */}
          <div className="flex items-center justify-between gap-2 text-xs">
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
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#006067] hover:text-[#00474c] hover:bg-[#E0E9E8]/60 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Fotózás vagy képfeltöltés</span>
            </button>

            {cameraStatus !== 'scanning' && (
              <button
                type="button"
                onClick={() => startCamera()}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 px-2 py-1 rounded-md transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#006067]" />
                <span>Kamera indítása</span>
              </button>
            )}
          </div>

          {/* Error Message banner */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Scanner Input field */}
          <div className="space-y-1.5 pt-2 border-t border-stone-200">
            <label className="block text-xs font-bold text-stone-700">
              Beolvasott kód / Manuális Termék ID:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  id="scanner-manual-input"
                  type="text"
                  value={scanInput}
                  onChange={(e) => {
                    setScanInput(e.target.value);
                    setErrorMsg(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="pl. 40107.00.33 vagy MLS0185-J"
                  className="w-full bg-[#F4F7F6] border border-stone-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-[#006067] outline-none"
                />
              </div>
              <button
                type="button"
                id="scanner-lookup-btn"
                onClick={handleManualLookup}
                className="px-4 py-2 bg-[#006067] hover:bg-[#00474c] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Keresés</span>
              </button>
            </div>
          </div>

          {/* Quick sample chips */}
          {quickSamples.length > 0 && (
            <div className="pt-2 border-t border-stone-100">
              <p className="text-[10px] font-bold uppercase text-stone-400 mb-1.5">
                Gyors tesztelés (minták a táblázatból):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickSamples.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => processCode(s.id)}
                    className="font-mono text-[11px] px-2 py-1 rounded bg-stone-100 hover:bg-[#E0E9E8] text-stone-700 hover:text-[#006067] transition-colors cursor-pointer border border-stone-200/60"
                  >
                    {s.id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

