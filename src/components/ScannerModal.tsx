import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Scan, ArrowDownToLine, ArrowUpFromLine, Calendar, Info, 
  Camera, RotateCw, PlusCircle, CheckCircle, Package, HelpCircle, 
  Plus, Layers, ListFilter, ScanLine, Zap, AlertTriangle, Sparkles,
  Tag, Clock, ArrowDownLeft, ArrowUpRight, ChevronRight
} from 'lucide-react';
import { useInventory } from '../lib/store';
import { CATEGORIES } from '../lib/constants';
import { CategoryId, InventoryItem } from '../types';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { normalizeBarcode, containsThai, extractBarcodeDigits } from '../lib/barcode';
import { formatThaiDate, generateLotNumber } from '../lib/lots';
import { UnitSelector } from './UnitSelector';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentView?: string;
  initialCode?: string;
}

export function ScannerModal({ isOpen, onClose, currentView, initialCode = '' }: ScannerModalProps) {
  const { items, processTransaction, addItem } = useInventory();
  const [mode, setMode] = useState<'RECEIVE' | 'ISSUE'>('ISSUE');
  const [scannedCode, setScannedCode] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [scanLotNumber, setScanLotNumber] = useState('');
  const [operator, setOperator] = useState<string>('พยาบาล');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isManualIssue, setIsManualIssue] = useState<boolean>(false);

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false); 
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>('');
  const [scanningError, setScanningError] = useState<string>('');
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);

  // Throttling mobile frames scans
  const [lastScannedTime, setLastScannedTime] = useState<number>(0);
  const [lastScannedValue, setLastScannedValue] = useState<string>('');

  // Inline registering for unmatched scans
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [regName, setRegName] = useState('');
  const [regCategory, setRegCategory] = useState<CategoryId>('medical');
  const [regUnit, setRegUnit] = useState('กล่อง');
  const [isNumericOnly, setIsNumericOnly] = useState<boolean>(false);
  const [regQty, setRegQty] = useState<number>(10);
  const [regExpiry, setRegExpiry] = useState('');
  const [regError, setRegError] = useState('');

  // Local state for the raw input field to ensure smooth typing/scanning
  const [rawInputValue, setRawInputValue] = useState('');

  // Focus ref for physical USB barcode reader gun
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Audio Beep generator
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1050, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12); 
    } catch (e) {
      console.warn('AudioContext not supported or gesture needed', e);
    }
  };

  // Determine current active category scope from view
  const activeCategoryId = currentView?.startsWith('category_') 
    ? currentView.replace('category_', '') 
    : '';
  const activeCategory = CATEGORIES.find(c => c.id === activeCategoryId);

  // Formulate listing title
  const modalTitle = activeCategory 
    ? `ทำรายการเบิก-จ่าย (${activeCategory.name})` 
    : 'สแกนรับ-จ่าย (ทุกคลัง)';

  // Reset status on open
  useEffect(() => {
    if (isOpen) {
      setScannedCode('');
      setQuantity(1);
      setExpiryDate('');
      setScanLotNumber('');
      setIsManualIssue(false);
      setOperator('พยาบาล');
      setSelectedItemId('');
      setError('');
      setSuccessMsg('');
      setIsCameraActive(false);
      setScanningError('');
      setIsRegistering(false);
      setRegName('');
      setRegCategory('medical');
      setRegUnit('กล่อง');
      setRegUnit(activeCategoryId ? activeCategoryId : 'กล่อง');
      setRegQty(10);
      setRegExpiry('');
      setRegError('');
      
      // If we received an initialCode globally, process it immediately!
      if (initialCode) {
        setTimeout(() => {
          handleBarcodeScanned(initialCode);
        }, 100);
      } else {
        // Auto-focus barcode input field for physical scanner guns
        setTimeout(() => {
          barcodeInputRef.current?.focus();
        }, 350);
      }
    }
  }, [isOpen, activeCategoryId, initialCode]);

  // Handle barcode scanned / matches -> scan twice increments the quantity
  const handleBarcodeScanned = (codeStr: string) => {
    // APPLY GLOBAL NORMALIZATION
    const code = isNumericOnly ? extractBarcodeDigits(codeStr) : normalizeBarcode(codeStr);
    if (!code) return;

    setError('');
    setSuccessMsg('');

    // Look up item by exact or normalized barcode
    const foundItem = items.find(i => {
      const itemClean = normalizeBarcode(i.id) || i.id.trim().toUpperCase();
      return (code && itemClean === code) || i.id.toLowerCase() === code.toLowerCase();
    });

    if (foundItem) {
      playBeep();
      if (navigator.vibrate) {
        navigator.vibrate(80); 
      }

      // If matches active category filter
      if (activeCategoryId && foundItem.categoryId !== activeCategoryId) {
        setError(`คำเตือน: ผลิตภัณฑ์นี้น่าจะอยู่ใน "${CATEGORIES.find(c => c.id === foundItem.categoryId)?.name || foundItem.categoryId}" แต่คลังที่กำลังใช้งานอยู่คือ "${activeCategory?.name}"`);
      }

      // Check if same item scanned again -> increment count!
      if (scannedCode.toLowerCase() === code.toLowerCase()) {
        setQuantity(prev => prev + 1);
      } else {
        setScannedCode(foundItem.id);
        setSelectedItemId(foundItem.id);
        setQuantity(1);
        setIsManualIssue(false);
        setScanLotNumber('');
        if (foundItem.expiryDate) {
          setExpiryDate(foundItem.expiryDate);
        }
      }
    } else {
      // Not found code in inventory -> show option to register inline
      setScannedCode(code.toUpperCase());
      setSelectedItemId('');
      setQuantity(1);
      setIsRegistering(true);
      setRegName('');
      setRegQty(50);
      setRegCategory(activeCategoryId ? (activeCategoryId as CategoryId) : 'medical');
      setError('ไม่พบบาร์โค้ดสินค้านี้ในระบบ สามารถคลิกลงทะเบียนล่างนี้เพื่อสร้างสินค้าเวชภัณฑ์ใหม่');
    }

    // Refocus raw input box
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 100);
  };

  // Sync manual dropdown selection with scanned code
  const handleDropdownChange = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsManualIssue(false);
    setScanLotNumber('');
    if (itemId) {
      const match = items.find(i => i.id === itemId);
      if (match) {
        setScannedCode(match.id);
        setError('');
        setSuccessMsg('');
      }
    } else {
      setScannedCode('');
    }
  };

  // Keyboard Enter handler inside physical input box
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rawCode = e.currentTarget.value.trim();
      
      if (rawCode) {
        // APPLY GLOBAL NORMALIZATION IMMEDIATELY
        const cleanCode = (window as any).normalizeBarcode(rawCode, isNumericOnly);
        handleBarcodeScanned(cleanCode);
        // Clear input placeholder to listen for next scanner trigger
        e.currentTarget.value = '';
      }
    }
  };

  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        const newState = !isTorchOn;
        await html5QrCodeRef.current.applyVideoConstraints({
          torch: newState
        } as any);
        setIsTorchOn(newState);
      } catch (err) {
        console.warn("Failed to toggle torch:", err);
      }
    }
  };

  // Camera initialization and cleanup
  useEffect(() => {
    if (isOpen && isCameraActive) {
      setCameraLoading(true);
      setScanningError('');
      setIsTorchOn(false);
      
      const timer = setTimeout(() => {
        const elementId = "camera-scanner-view";
        const element = document.getElementById(elementId);
        if (!element) {
          setCameraLoading(false);
          return;
        }

        // Guard secure context / availability of mediaDevices
        if (!navigator.mediaDevices) {
          setCameraLoading(false);
          setScanningError("เบราว์เซอร์นี้ไม่รองรับการสแกนผ่านกล้อง หรือสิทธิ์ความปลอดภัยบล็อคกรอบ iframe ไว้ (แนะนำสแกนเนอร์ปืนต่อสายได้)");
          return;
        }

        try {
          const html5QrCode = new Html5Qrcode(elementId, {
            verbose: false,
            useBarCodeDetectorIfSupported: true,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_93,
              Html5QrcodeSupportedFormats.CODABAR,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
              Html5QrcodeSupportedFormats.PDF_417
            ]
          });
          html5QrCodeRef.current = html5QrCode;

          const qrboxConfig = (viewfinderWidth: number, viewfinderHeight: number) => ({
            width: Math.min(Math.floor(viewfinderWidth * 0.9), 360),
            height: Math.min(Math.floor(viewfinderHeight * 0.75), 240)
          });

          const startFallbackScanner = () => {
            const container = document.getElementById(elementId);
            if (container) {
              container.innerHTML = "";
            }
            html5QrCode?.start(
              { facingMode: "environment" },
              {
                fps: 20,
                qrbox: qrboxConfig
              },
              (decodedText) => {
                if (decodedText && decodedText.trim()) {
                  const cleanVal = decodedText.trim();
                  const now = Date.now();
                  if (cleanVal !== lastScannedValue || (now - lastScannedTime > 1500)) {
                    setLastScannedValue(cleanVal);
                    setLastScannedTime(now);
                    handleBarcodeScanned(cleanVal);
                  }
                }
              },
              () => {}
            ).then(() => {
              setCameraLoading(false);
              // Gracefully scan for cameras after startup to let user cycle if needed
              Html5Qrcode.getCameras().then(devices => {
                if (devices && devices.length > 0) {
                  setCameras(devices);
                }
              }).catch(e => console.warn("Failed to list cameras after fallback start:", e));
            }).catch(err => {
              setCameraLoading(false);
              console.error("Fallback camera start failure:", err);
              setScanningError(
                "ไม่ได้รับสิทธิ์เข้าถึงกล้อง (Permission denied)\n\n" +
                "👉 หากใช้งานผ่านแอป LINE / Facebook ให้กดปุ่ม 3 จุดด้านมุมขวาล่างหรือบน แล้วเลือก 'เปิดในเบราว์เซอร์อื่น' (Open in external browser / Safari / Chrome)\n\n" +
                "💡 วิธีแก้หากเปิดในเบราว์เซอร์ปกติ:\n" +
                "1. กดที่รูปแม่กุญแจ 🔒 ข้าง URL\n" +
                "2. เปลี่ยน 'กล้อง' ให้เป็น 'อนุญาต (Allow)'"
              );
            });
          };

          // Try standard camera list first
          Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length > 0) {
              setCameras(devices);
              
              // Mobile back environmental camera lookup
              const backCam = devices.find(device => 
                device.label.toLowerCase().includes('back') || 
                device.label.toLowerCase().includes('environment') ||
                device.label.toLowerCase().includes('กล้องหลัง') ||
                device.label.toLowerCase().includes('rear')
              );
              
              // Use "{ facingMode: "environment" }" by default if no activeCameraId is set yet.
              const targetConstraint = activeCameraId ? activeCameraId : { facingMode: "environment" };

              const container = document.getElementById(elementId);
              if (container) {
                container.innerHTML = "";
              }

              html5QrCode?.start(
                targetConstraint,
                {
                  fps: 20,
                  qrbox: qrboxConfig
                },
                (decodedText) => {
                  if (decodedText && decodedText.trim()) {
                    const cleanVal = decodedText.trim();
                    const now = Date.now();
                    
                    // Smart debounce same scanning product to avoid infinite fast rate additions
                    if (cleanVal !== lastScannedValue || (now - lastScannedTime > 1500)) {
                      setLastScannedValue(cleanVal);
                      setLastScannedTime(now);
                      handleBarcodeScanned(cleanVal);
                    }
                  }
                },
                () => {}
              ).then(() => {
                setCameraLoading(false);
              }).catch(err => {
                console.warn("Camera start constraint error, trying fallback:", err);
                startFallbackScanner();
              });
            } else {
              // No cameras found or permission prompt pending, try starting with environment facingMode directly
              startFallbackScanner();
            }
          }).catch(err => {
            console.warn("getCameras failed, trying direct start with fallback:", err);
            startFallbackScanner();
          });
        } catch (err) {
          setCameraLoading(false);
          console.error("General camera initialization error:", err);
          setScanningError("เกิดข้อผิดพลาดในการตั้งค่ารหัสสแกนเนอร์ดึงภาพกล้อง");
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCodeRef.current) {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(e => console.warn("Clean camera stop error:", e));
          }
        }
      };
    }
  }, [isOpen, isCameraActive, activeCameraId]);

  // Safety Net: Watch scannedCode and force normalization if Thai leaks in
  useEffect(() => {
    if (containsThai(scannedCode)) {
      const fixed = isNumericOnly ? extractBarcodeDigits(scannedCode) : normalizeBarcode(scannedCode);
      if (fixed && fixed !== scannedCode) {
        setScannedCode(fixed);
      }
    }
  }, [scannedCode, isNumericOnly]);

  if (!isOpen) return null;

  // Filter selectable options based on active category view scope
  // Always include the currently selected/scanned item in the list even if it's from another category
  const filteredItems = activeCategoryId 
    ? items.filter(item => item.categoryId === activeCategoryId || item.id === selectedItemId) 
    : items;

  // Find currently matched product
  const matchedItem = items.find(i => i.id === selectedItemId);

  // Submit flow matching transactional state of store
  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) {
      setError('กรุณาเลือกหรือสแกนบาร์โค้ดสินค้ายืนยันก่อนประมวลผล');
      return;
    }
    if (quantity <= 0) {
      setError('จำนวนการทำรายการต้องเป็นบวกอย่างน้อย 1 หน่วย');
      return;
    }

    const item = items.find(i => i.id === selectedItemId);
    if (!item) {
      setError('ไม่พบไอเทมในคลังระบบ');
      return;
    }

    if (mode === 'ISSUE' && item.quantity < quantity) {
      setError(`ยอดคงคลังผลิตภัณฑ์ไม่เพียงพอสำหรับการเบิกจ่ายออก ยอดปัจจุบันคือ: ${item.quantity} ${item.unit}`);
      return;
    }

    processTransaction({
      itemId: item.id,
      type: mode,
      quantity,
      expiryDate: expiryDate || undefined,
      lotNumber: scanLotNumber.trim() || undefined,
      operator: operator || 'พยาบาล'
    });

    setSuccessMsg(`บันทึกทำรายการ ${mode === 'RECEIVE' ? 'รับเข้า' : 'เบิกจ่าย'} "${item.name}" จำนวน ${quantity} ${item.unit} สำเร็จเรียบร้อย`);
    
    // Clear and reset state to allow instant scanning next item
    setScannedCode('');
    setSelectedItemId('');
    setQuantity(1);
    setScanLotNumber('');
    setExpiryDate('');
    setIsManualIssue(false);
    setIsRegistering(false);
    
    // Refocus raw input box automatically
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 200);
  };

  // Inline dynamic item registration
  const handleRegisterNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setRegError('กรุณากรอกชื่อรายการสินค้าเวชภัณฑ์ใหม่');
      return;
    }

    let cleanId = (isNumericOnly ? extractBarcodeDigits(scannedCode) : normalizeBarcode(scannedCode)) || scannedCode.trim().toUpperCase();
    if (!cleanId) {
      const prefix = regCategory.substring(0, 3).toUpperCase();
      cleanId = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    // Check if item already exists
    const existing = items.find(i => {
      const itemClean = normalizeBarcode(i.id) || i.id.trim().toUpperCase();
      return (cleanId && itemClean === cleanId) || i.id.toLowerCase() === cleanId.toLowerCase();
    });

    if (existing) {
      if (regQty > 0) {
        processTransaction({
          itemId: existing.id,
          type: 'RECEIVE',
          quantity: regQty,
          expiryDate: regExpiry || undefined,
          operator: 'พยาบาล'
        });
      }
      playBeep();
      setRegName('');
      setIsRegistering(false);
      setSelectedItemId(existing.id);
      setScannedCode(existing.id);
      setQuantity(1);
      setSuccessMsg(`ตรวจพบบาร์โค้ดสินค้านี้ในระบบแล้ว ได้รวมยอดสต็อก (+${regQty} ${existing.unit}) ให้กับ "${existing.name}" เรียบร้อยแล้ว`);
      return;
    }

    const newItem: InventoryItem = {
      id: cleanId,
      name: regName.trim(),
      categoryId: regCategory,
      quantity: regQty,
      unit: regUnit,
      expiryDate: regExpiry || undefined
    };

    addItem(newItem);
    playBeep();
    
    // Auto-select newly registered product to continue transaction smoothly
    setRegName('');
    setIsRegistering(false);
    setSelectedItemId(newItem.id);
    setScannedCode(newItem.id);
    setQuantity(1);
    setSuccessMsg(`ลงทะเบียนบาร์โค้ดบิลใหม่ "${newItem.name}" สำเร็จและพร้อมใช้งานแล้ว`);
  };

  // Capture current camera stream frame as image file & scan it offline
  const handleCaptureFrame = () => {
    const videoEl = document.querySelector('#camera-scanner-view video') as HTMLVideoElement;
    if (!videoEl) {
      setError('กรุณาเปิดใช้งานและรอกล้องถ่ายภาพแสดงวิดีโอก่อนกดจับภาพ');
      return;
    }
    setError('');
    setSuccessMsg('');
    setCameraLoading(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 640;
      canvas.height = videoEl.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        
        const img = new Image();
        img.onload = () => {
          const tempScanner = new Html5Qrcode("hidden-file-scanner", {
            verbose: false,
            useBarCodeDetectorIfSupported: true,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_93,
              Html5QrcodeSupportedFormats.CODABAR,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.DATA_MATRIX,
              Html5QrcodeSupportedFormats.PDF_417
            ]
          });

          // Multi-angle, multi-filter offline scanning passes for maximum live capture frame accuracy
          const passes = [
            { name: "แนวตั้ง/ระดับปกติ", rotate: 0, grayscale: false, contrast: false },
            { name: "หมุน 180 องศา", rotate: 180, grayscale: false, contrast: false },
            { name: "หมุน 90 องศา (Portrait)", rotate: 90, grayscale: false, contrast: false },
            { name: "หมุน 270 องศา", rotate: 270, grayscale: false, contrast: false },
            { name: "ปรับความเข้มดำ/ขาว", rotate: 0, grayscale: true, contrast: true },
            { name: "หมุน 90 + ปรับเข้มดำ/ขาว", rotate: 90, grayscale: true, contrast: true },
            { name: "หมุน 270 + ปรับเข้มดำ/ขาว", rotate: 270, grayscale: true, contrast: true }
          ];

          const tryPass = async (passIdx: number) => {
            if (passIdx >= passes.length) {
              setCameraLoading(false);
              setError("ไม่สามารถตรวจพบบาร์โค้ดสากลในภาพที่ถ่ายจับได้ 💡 แนะนำถือกล้องให้นิ่งและตั้งบาร์โค้ดตรงขนานกับขีดแดง หรือกดปุ่ม 'ถ่ายกล้องมือถือตรง' ขวามือเพื่อใช้โหมดภาพคมชัดเต็มพิกเซล");
              return;
            }

            const currentPass = passes[passIdx];
            const passCanvas = document.createElement('canvas');
            
            let targetW = img.width;
            let targetH = img.height;
            const MAX_DIM = 1200;

            if (targetW > targetH) {
              if (targetW > MAX_DIM) {
                targetH *= MAX_DIM / targetW;
                targetW = MAX_DIM;
              }
            } else {
              if (targetH > MAX_DIM) {
                targetW *= MAX_DIM / targetH;
                targetH = MAX_DIM;
              }
            }

            if (currentPass.rotate === 90 || currentPass.rotate === 270) {
              passCanvas.width = targetH;
              passCanvas.height = targetW;
            } else {
              passCanvas.width = targetW;
              passCanvas.height = targetH;
            }

            const passCtx = passCanvas.getContext('2d');
            if (!passCtx) {
              tryPass(passIdx + 1);
              return;
            }

            if (currentPass.rotate !== 0) {
              passCtx.translate(passCanvas.width / 2, passCanvas.height / 2);
              passCtx.rotate((currentPass.rotate * Math.PI) / 180);
              passCtx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
            } else {
              passCtx.drawImage(img, 0, 0, targetW, targetH);
            }

            if (currentPass.grayscale || currentPass.contrast) {
              try {
                const imgData = passCtx.getImageData(0, 0, passCanvas.width, passCanvas.height);
                const data = imgData.data;
                for (let i = 0; i < data.length; i += 4) {
                  const r = data[i];
                  const g = data[i+1];
                  const b = data[i+2];
                  let gray = 0.299 * r + 0.587 * g + 0.114 * b;
                  
                  if (currentPass.contrast) {
                    gray = gray < 128 ? Math.max(0, gray - 60) : Math.min(255, gray + 60);
                  }
                  data[i] = gray;
                  data[i+1] = gray;
                  data[i+2] = gray;
                }
                passCtx.putImageData(imgData, 0, 0);
              } catch (err) {
                console.warn("Capture preprocessing filter failed:", err);
              }
            }

            // 1. TRY NATIVE HARDWARE-ACCELERATED BARCODE DETECTOR FIRST (ULTRA-ACCURATE)
            if ('BarcodeDetector' in window) {
              try {
                const detector = new (window as any).BarcodeDetector({
                  formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'qr_code']
                });
                const barcodes = await detector.detect(passCanvas);
                if (barcodes && barcodes.length > 0) {
                  const decodedText = barcodes[0].rawValue;
                  if (decodedText && decodedText.trim()) {
                    setCameraLoading(false);
                    playBeep();
                    handleBarcodeScanned(decodedText.trim());
                    setSuccessMsg(`📸 ถ่ายภาพสแกน! ตรวจพบบาร์โค้ดสำเร็จ (Native): ${decodedText.trim()}`);
                    if (navigator.vibrate) navigator.vibrate(100);
                    return; // Done
                  }
                }
              } catch (nativeErr) {
                console.warn("Native BarcodeDetector pass failed, trying fallback:", nativeErr);
              }
            }

            // 2. FALLBACK TO OFFLINE JS-BASED HTML5QRCODE DECODER
            passCanvas.toBlob((blob) => {
              if (!blob) {
                tryPass(passIdx + 1);
                return;
              }

              const testFile = new File([blob], `capture_pass_${currentPass.name}.jpg`, { type: 'image/jpeg' });
              tempScanner.scanFile(testFile, false)
                .then(decodedText => {
                  if (decodedText && decodedText.trim()) {
                    setCameraLoading(false);
                    playBeep();
                    handleBarcodeScanned(decodedText.trim());
                    setSuccessMsg(`📸 ถ่ายภาพสแกน! ตรวจพบบาร์โค้ดสำเร็จ: ${decodedText.trim()}`);
                    if (navigator.vibrate) navigator.vibrate(100);
                  } else {
                    tryPass(passIdx + 1);
                  }
                })
                .catch(err => {
                  console.warn(`Capture scan pass "${currentPass.name}" failed:`, err);
                  tryPass(passIdx + 1);
                });
            }, 'image/jpeg', 0.95);
          };

          tryPass(0);
        };
        img.onerror = () => {
          setCameraLoading(false);
          setError("เกิดข้อผิดพลาดในการโหลดรูปภาพจับภาพเฟรมสด");
        };
        img.src = dataUrl;
      } else {
        setCameraLoading(false);
        setError("ไม่สามารถดึงภาพวิดีโอเพื่อวิเคราะห์บาร์โค้ดได้");
      }
    } catch (e) {
      setCameraLoading(false);
      console.error(e);
      setError("เกิดข้อผิดพลาดในการขอดึงภาพถ่ายจากกล้องสัญญาณสด");
    }
  };

  // Upload/Direct scan via environment-capture native phone camera
  const handleFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccessMsg('');
    setCameraLoading(true);

    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const tempScanner = new Html5Qrcode("hidden-file-scanner", {
          verbose: false,
          useBarCodeDetectorIfSupported: true,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.PDF_417
          ]
        });

        // Multi-angle, multi-filter offline scanning passes for maximum accuracy
        const passes = [
          { name: "แนวตั้ง/ระดับปกติ", rotate: 0, grayscale: false, contrast: false },
          { name: "หมุน 90 องศา (Portrait)", rotate: 90, grayscale: false, contrast: false },
          { name: "หมุน 270 องศา", rotate: 270, grayscale: false, contrast: false },
          { name: "ปรับความเข้มดำ/ขาว", rotate: 0, grayscale: true, contrast: true }
        ];

        const tryPass = async (passIdx: number) => {
          if (passIdx >= passes.length) {
            setCameraLoading(false);
            setError("วิเคราะห์ภาพถ่ายกล้องไม่พบข้อมูลบาร์โค้ดสากล 💡 คำแนะนำ:\n1. ถือกล้องขนานตรงกับแถบแท่งบาร์โค้ด ไม่เอียงมุมกล้องมากเกินไป\n2. ถ่ายในตำแหน่งที่มีแสงสว่างเพียงพอและอยู่ในระยะโฟกัสปานกลาง\n3. แนะนำป้อนชุดรหัสสินค้าโดยตรง หรือเลือกสินค้าด้วยตนเองจากรายการด้านล่างแทน");
            return;
          }

          const currentPass = passes[passIdx];
          const canvas = document.createElement('canvas');
          
          let targetW = img.width;
          let targetH = img.height;
          const MAX_DIM = 1200; // Optimal performance configuration

          if (targetW > targetH) {
            if (targetW > MAX_DIM) {
              targetH *= MAX_DIM / targetW;
              targetW = MAX_DIM;
            }
          } else {
            if (targetH > MAX_DIM) {
              targetW *= MAX_DIM / targetH;
              targetH = MAX_DIM;
            }
          }

          if (currentPass.rotate === 90 || currentPass.rotate === 270) {
            canvas.width = targetH;
            canvas.height = targetW;
          } else {
            canvas.width = targetW;
            canvas.height = targetH;
          }

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            tryPass(passIdx + 1);
            return;
          }

          if (currentPass.rotate !== 0) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((currentPass.rotate * Math.PI) / 180);
            ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
          } else {
            ctx.drawImage(img, 0, 0, targetW, targetH);
          }

          if (currentPass.grayscale || currentPass.contrast) {
            try {
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imgData.data;
              for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                let gray = 0.299 * r + 0.587 * g + 0.114 * b;
                
                if (currentPass.contrast) {
                  gray = gray < 128 ? Math.max(0, gray - 60) : Math.min(255, gray + 60);
                }
                data[i] = gray;
                data[i+1] = gray;
                data[i+2] = gray;
              }
              ctx.putImageData(imgData, 0, 0);
            } catch (err) {
              console.warn("Failed to apply preprocessing filters:", err);
            }
          }

          // 1. TRY NATIVE HARDWARE-ACCELERATED BARCODE DETECTOR FIRST (ULTRA-ACCURATE)
          if ('BarcodeDetector' in window) {
            try {
              const detector = new (window as any).BarcodeDetector({
                formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'qr_code']
              });
              const barcodes = await detector.detect(canvas);
              if (barcodes && barcodes.length > 0) {
                const decodedText = barcodes[0].rawValue;
                if (decodedText && decodedText.trim()) {
                  setCameraLoading(false);
                  playBeep();
                  handleBarcodeScanned(decodedText.trim());
                  setSuccessMsg(`📌 ตรวจพบจากภาพถ่ายสำเร็จ (Native): ${decodedText.trim()}`);
                  if (navigator.vibrate) navigator.vibrate(100);
                  return; // Done
                }
              }
            } catch (nativeErr) {
              console.warn("Native BarcodeDetector file pass failed, trying fallback:", nativeErr);
            }
          }

          // 2. FALLBACK TO OFFLINE JS-BASED HTML5QRCODE DECODER
          canvas.toBlob((blob) => {
            if (!blob) {
              tryPass(passIdx + 1);
              return;
            }

            const testFile = new File([blob], `pass_${currentPass.name}_${file.name}`, { type: 'image/jpeg' });
            tempScanner.scanFile(testFile, false)
              .then(decodedText => {
                if (decodedText && decodedText.trim()) {
                  setCameraLoading(false);
                  playBeep();
                  handleBarcodeScanned(decodedText.trim());
                  setSuccessMsg(`📌 ตรวจพบจากภาพถ่ายสำเร็จ: ${decodedText.trim()}`);
                  if (navigator.vibrate) navigator.vibrate(100);
                } else {
                  tryPass(passIdx + 1);
                }
              })
              .catch(err => {
                console.warn(`Scan pass "${currentPass.name}" failed:`, err);
                tryPass(passIdx + 1);
              });
          }, 'image/jpeg', 0.95);
        };

        tryPass(0);
      };

      img.onerror = () => {
        setCameraLoading(false);
        setError("ไม่สามารถดึงขนาดของภาพได้");
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        setCameraLoading(false);
        setError("ไม่สามารถดึงแหล่งภาพต้นฉบับได้");
      }
    };
    reader.onerror = () => {
      setCameraLoading(false);
      setError("ไม่สามารถแปลงข้อมูลไฟล์ได้");
    };
    reader.readAsDataURL(file);
  };

  // Switch camera cycles
  const cycleCameras = () => {
    if (cameras.length <= 1) return;
    let currentIndex = 0;
    if (activeCameraId) {
      currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    } else {
      const backCamIndex = cameras.findIndex(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('environment') ||
        device.label.toLowerCase().includes('กล้องหลัง') ||
        device.label.toLowerCase().includes('rear')
      );
      currentIndex = backCamIndex >= 0 ? backCamIndex : 0;
    }
    const nextIndex = (currentIndex + 1) % cameras.length;
    setActiveCameraId(cameras[nextIndex].id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-2xl overflow-y-auto">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all my-8 max-h-[90vh]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-505 rounded-xl flex items-center justify-center border border-indigo-100">
              <ScanLine size={20} className="text-indigo-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-slate-800 tracking-tight">{modalTitle}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">บาร์โค้ด / คิวอาร์โค้ดสากล</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
          
          {/* SUCCESS NOTIFICATION */}
          {successMsg && (
            <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-xs font-bold flex items-start gap-2.5 animate-fade-in shadow-sm">
              <CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-black">บันทึกสำเร็จ</p>
                <p className="text-emerald-600 font-medium mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {/* BLUE ALIGNMENT CONTAINER MOCKUP LAYOUT (สแกนเข้า/เบิกออก) */}
          <div className="border border-indigo-200 bg-indigo-50/20 rounded-[28px] p-5 text-center flex flex-col items-center gap-3 relative shadow-inner">
            <div className="flex items-center gap-1.5 text-indigo-600 font-black text-xs tracking-wider uppercase">
              <span className="font-mono text-sm leading-none flex items-center pr-1 font-bold">|||||</span>
              <span>สแกนเข้า/เบิกออก</span>
            </div>

            {/* Core input that captures both scanning codes and user inputs */}
            <div className="w-full relative">
              <input
                ref={barcodeInputRef}
                type="text"
                value={rawInputValue}
                onChange={(e) => {
                  const val = e.target.value;
                  const normalized = isNumericOnly ? extractBarcodeDigits(val) : normalizeBarcode(val);
                  setRawInputValue(normalized);
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text');
                  const normalized = isNumericOnly ? extractBarcodeDigits(pasted) : normalizeBarcode(pasted);
                  setRawInputValue(normalized);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (rawInputValue) {
                      const clean = isNumericOnly ? extractBarcodeDigits(rawInputValue) : normalizeBarcode(rawInputValue);
                      handleBarcodeScanned(clean);
                      setRawInputValue(''); // Clear after processing
                    }
                  }
                }}
                placeholder="[ สแกนบาร์โค้ดที่นี่ ]"
                className="w-full text-center bg-white border border-indigo-150 rounded-2xl px-4 py-6 text-base md:text-lg tracking-widest text-slate-800 placeholder-indigo-300 font-extrabold focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 shadow-sm"
              />
            </div>

            {/* Instant Helper Pill if Thai script is ever detected in raw input */}
            {containsThai(rawInputValue) && (
              <div className="w-full p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5 animate-fadeIn text-left">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px]">
                  <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                  <span>ตรวจพบแป้นไทย: ระบบแนะนำแปลงเป็น</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const fixed = normalizeBarcode(rawInputValue);
                      setRawInputValue('');
                      handleBarcodeScanned(fixed);
                    }}
                    className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[10px] shadow-sm cursor-pointer"
                  >
                    ⚡ ใช้รหัส: {normalizeBarcode(rawInputValue)}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const fixed = extractBarcodeDigits(rawInputValue);
                      setRawInputValue('');
                      handleBarcodeScanned(fixed);
                    }}
                    className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold text-[10px] shadow-sm cursor-pointer"
                  >
                    🔢 ตัวเลขล้วน: {extractBarcodeDigits(rawInputValue)}
                  </button>
                </div>
              </div>
            )}

            <p className="text-[10px] text-slate-400 font-bold leading-normal">
              สแกนซ้ำเพื่อเพิ่มจำนวน | สามารถแก้ไขตัวเลขด้านล่างได้
            </p>

            {/* Numeric Only Toggle */}
            <div className="flex items-center gap-2 mt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={isNumericOnly}
                  onChange={(e) => {
                    const newMode = e.target.checked;
                    setIsNumericOnly(newMode);
                    if (rawInputValue) {
                      setRawInputValue(newMode ? extractBarcodeDigits(rawInputValue) : normalizeBarcode(rawInputValue));
                    }
                  }}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className={`text-[10px] font-bold transition-colors ${isNumericOnly ? 'text-indigo-600' : 'text-slate-500 group-hover:text-indigo-600'}`}>
                  {isNumericOnly ? '📍 โหมด: กรองเฉพาะตัวเลขเท่านั้น' : '🔓 โหมด: รองรับตัวอักษรและตัวเลข (แนะนำ)'}
                </span>
              </label>
            </div>

            {/* Camera Option Trigger */}
            <div className="w-full pt-1 border-t border-indigo-100/40 flex justify-center">
              <button
                type="button"
                onClick={() => setIsCameraActive(!isCameraActive)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100/50 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Camera size={14} />
                <span>{isCameraActive ? 'ปิดกล้องสแกนยิง' : 'เปิดกล้องตรวจจับ (บาร์โค้ด & คิวอาร์)'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Live Camera Interface block inside scanner box */}
          {isCameraActive && (
            <div className="border border-slate-100 rounded-3xl p-4 bg-slate-50 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5 text-slate-600 bg-white border border-slate-150 px-2.5 py-1 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                  <span>กล้องพร้อมทำงานยิงบาร์โค้ดแบบกว้าง</span>
                </span>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={toggleTorch}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all text-[11px] ${
                      isTorchOn ? 'bg-amber-500 text-white border-amber-600' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <Zap size={11} className={isTorchOn ? 'text-white' : 'text-amber-500'} />
                    <span>{isTorchOn ? 'ปิดไฟ' : 'เปิดไฟ'}</span>
                  </button>
                  {cameras.length > 1 && (
                    <button 
                      type="button"
                      onClick={cycleCameras}
                      className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 transition-all text-[11px]"
                    >
                      <RotateCw size={11} className="text-indigo-500" />
                      <span>สลับกล้อง ({cameras.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* View finder window */}
              <div className="relative aspect-video w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                <div id="camera-scanner-view" className="w-full h-full object-cover"></div>

                {!cameraLoading && !scanningError && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    {/* Wider rectangle targeted for long barcode formats like EAN-13 */}
                    <div className="w-[85%] h-[50%] border-2 border-indigo-400 rounded-2xl relative flex flex-col justify-between items-center shadow-[0_0_0_1000px_rgba(15,23,42,0.4)]">
                      <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-[bounce_2s_infinite]" />
                      
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-500 rounded-tl -mt-[2px] -ml-[2px]" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-500 rounded-tr -mt-[2px] -mr-[2px]" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-500 rounded-bl -mb-[2px] -ml-[2px]" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-500 rounded-br -mb-[2px] -mr-[2px]" />
                    </div>
                  </div>
                )}

                {cameraLoading && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white gap-2 text-center">
                    <div className="w-7 h-7 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-bold text-indigo-200">กำลังเชื่อมต่อภาพสดตรวจบาร์โค้ด...</p>
                  </div>
                )}

                {scanningError && (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-rose-200 p-4 text-center gap-2 overflow-y-auto w-full h-full">
                    <p className="text-xs font-black text-rose-400">กล้องติดขัดสิทธิ์หรือขัดข้อง</p>
                    <p className="text-[10px] text-rose-300 leading-normal max-w-xs whitespace-pre-line text-left">{scanningError}</p>
                    <button
                      type="button"
                      onClick={() => {
                        const nativeBtn = document.getElementById("native-camera-file-input");
                        if (nativeBtn) (nativeBtn as HTMLInputElement).click();
                      }}
                      className="mt-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-transform pointer-events-auto cursor-pointer"
                    >
                      <Scan size={14} />
                      <span>เปิดกล้องมือถือถ่ายตรง (แก้ขัด)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action grid for enhanced manual frame photography and mobile native camera scanner */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleCaptureFrame}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-3 px-4 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer border border-indigo-500"
                >
                  <Camera size={14} className="animate-bounce" />
                  <span>กดถ่ายแชะ! อ่านบาร์โค้ด</span>
                </button>

                <label className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black py-3 px-4 rounded-2xl border border-slate-200 shadow-sm transition-all active:scale-95 cursor-pointer relative">
                  <Scan size={14} className="text-indigo-600" />
                  <span>ถ่ายจากกล้องมือถือจริง</span>
                  <input
                    id="native-camera-file-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileScan}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </label>
              </div>

              <p className="text-[10px] font-medium text-slate-400 text-center leading-normal">
                💡 คำแนะนำ: หากสแกนแบบสดไม่ทำงาน ให้กดปุ่ม <span className="font-bold text-indigo-600">"ถ่ายจากกล้องมือถือจริง"</span> เพื่อใช้ระบบโฟกัสอัตโนมัติจากโทรศัพท์ของคุณ จะอ่านบาร์โค้ดได้แม่นยำสูงมาก!
              </p>

              {/* Invisible file scanner DOM element to run static scanning checks */}
              <div id="hidden-file-scanner" className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden" />
            </div>
          )}

          {/* Form details (ONLY SHOW IF NOT REGISTERING) */}
          {!isRegistering && (
            <form onSubmit={handleConfirmSubmit} className="space-y-4">
              
              {/* 1.ประเภทรายการ Mode selectors (เบิกออก / รับเข้า) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-450 block uppercase tracking-wider">ประเภทรายการ</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode('ISSUE');
                    setSuccessMsg('');
                    setIsManualIssue(false);
                    setScanLotNumber('');
                    setExpiryDate('');
                  }}
                  className={`flex-1 flex justify-center items-center py-3.5 rounded-2xl font-black text-xs md:text-sm tracking-wider transition-all duration-200 shadow-sm active:scale-95 cursor-pointer ${
                    mode === 'ISSUE'
                      ? 'bg-[#fe155a] text-white shadow-lg shadow-pink-100 border border-[#fe155a]'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-150 border border-slate-200/50'
                  }`}
                >
                  เบิกออก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('RECEIVE');
                    setSuccessMsg('');
                    setIsManualIssue(false);
                    setScanLotNumber('');
                    setExpiryDate('');
                  }}
                  className={`flex-1 flex justify-center items-center py-3.5 rounded-2xl font-black text-xs md:text-sm tracking-wider transition-all duration-200 shadow-sm active:scale-95 cursor-pointer ${
                    mode === 'RECEIVE'
                      ? 'bg-[#00c07f] text-white shadow-lg shadow-emerald-100 border border-[#00c07f]'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-150 border border-slate-200/50'
                  }`}
                >
                  รับเข้า
                </button>
              </div>
            </div>

            {/* 2.เลือกรายการ dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-455 block uppercase tracking-wider">เลือกรายการ</label>
              <select
                required
                value={selectedItemId}
                onChange={(e) => handleDropdownChange(e.target.value)}
                className={`w-full bg-white border px-4 py-3.5 rounded-2xl text-slate-700 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 shadow-sm transition-all ${
                  scannedCode && matchedItem ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-slate-200'
                }`}
              >
                <option value="">-- ค้นหา เลือกรายการสินค้าที่ต้องการ --</option>
                {filteredItems.map(item => {
                  const cat = CATEGORIES.find(c => c.id === item.categoryId);
                  return (
                    <option key={item.id} value={item.id}>
                      {cat?.name || item.categoryId}: {item.name} ({item.id}) - คงเหลือ: {item.quantity} {item.unit}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Active matching product rich preview with Stock Quantity & Multi-Lot Details */}
            {matchedItem && (
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 animate-fade-in shadow-xs">
                {/* Header: Item Identity & Stock Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {CATEGORIES.find(c => c.id === matchedItem.categoryId)?.name || 'เวชภัณฑ์'} • รหัส {matchedItem.id}
                    </span>
                    <h4 className="text-base font-black text-slate-800 truncate" title={matchedItem.name}>
                      {matchedItem.name}
                    </h4>
                  </div>

                  {/* Stock Quantity Badge - Prominent */}
                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <div className="bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-xs text-right">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-400 block leading-tight">คงเหลือปัจจุบัน</span>
                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          เกณฑ์ {matchedItem.minStock ?? 10} - {matchedItem.maxStock ?? 100}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1 justify-end mt-0.5">
                        <span className={`text-xl font-black ${
                          matchedItem.quantity === 0 ? 'text-rose-600' :
                          matchedItem.quantity <= (matchedItem.minStock ?? 10) ? 'text-amber-600' : 
                          matchedItem.quantity > (matchedItem.maxStock ?? 100) ? 'text-sky-600' : 'text-emerald-600'
                        }`}>
                          {matchedItem.quantity}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{matchedItem.unit}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real-time Math Preview */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs px-3 py-2 bg-white rounded-xl border border-slate-200/70">
                  <span className="font-bold text-slate-600">คำนวณยอดหลังทำรายการ:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold">
                    <span className="text-slate-500">{matchedItem.quantity}</span>
                    <span className={mode === 'RECEIVE' ? 'text-emerald-600' : 'text-rose-600'}>
                      {mode === 'RECEIVE' ? '+' : '-'} {quantity}
                    </span>
                    <span className="text-slate-400">=</span>
                    {(() => {
                      const newTotal = mode === 'RECEIVE' ? matchedItem.quantity + quantity : Math.max(0, matchedItem.quantity - quantity);
                      const min = matchedItem.minStock ?? 10;
                      const max = matchedItem.maxStock ?? 100;
                      let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      let statusNote = '';
                      if (newTotal === 0) {
                        badgeClass = 'bg-rose-100 text-rose-700 border-rose-300';
                        statusNote = '(หมด)';
                      } else if (newTotal <= min) {
                        badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
                        statusNote = '(สต็อกต่ำ ≤ Min)';
                      } else if (newTotal > max) {
                        badgeClass = 'bg-sky-100 text-sky-800 border-sky-300';
                        statusNote = '(สต็อกเกิน > Max)';
                      }
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md font-black border ${badgeClass}`}>
                            {newTotal} {matchedItem.unit}
                          </span>
                          {statusNote && (
                            <span className="text-[10px] font-sans font-bold text-slate-500">{statusNote}</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Multi-Lot Breakdown & Expiry Dates */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Tag size={12} className="text-indigo-500" />
                      <span>วันหมดอายุและล็อตในคลัง ({matchedItem.lots?.length || (matchedItem.expiryDate ? 1 : 0)} ล็อต):</span>
                    </span>
                    <span className="text-[10px] text-slate-400">ระบบ FEFO (หมดอายุก่อน จ่ายก่อน)</span>
                  </div>

                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {matchedItem.lots && matchedItem.lots.length > 0 ? (
                      matchedItem.lots.map((lot, idx) => {
                        const isFirst = idx === 0;
                        return (
                          <div 
                            key={`${lot.lotNumber}_${lot.expiryDate}_${idx}`}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border ${
                              isFirst 
                                ? 'bg-rose-50/60 border-rose-200 text-rose-900 font-bold' 
                                : 'bg-white border-slate-200/70 text-slate-700 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] bg-white/80 px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                                {lot.lotNumber}
                              </span>
                              <span>หมดอายุ: <strong>{formatThaiDate(lot.expiryDate)}</strong></span>
                              {isFirst && (
                                <span className="text-[9px] bg-rose-200/60 text-rose-700 px-1.5 py-0.2 rounded font-black">
                                  🔴 หมดอายุก่อน
                                </span>
                              )}
                            </div>
                            <span className="font-mono font-bold">
                              {lot.quantity} {matchedItem.unit}
                            </span>
                          </div>
                        );
                      })
                    ) : matchedItem.expiryDate ? (
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-700 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">LOT-ตั้งต้น</span>
                          <span>หมดอายุ: <strong>{formatThaiDate(matchedItem.expiryDate)}</strong></span>
                        </div>
                        <span className="font-mono font-bold">{matchedItem.quantity} {matchedItem.unit}</span>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-[11px] text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                        ยังไม่มีการระบุล็อตและวันหมดอายุ (สามารถระบุด้านล่างได้)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3.จำนวน / ผู้ทำรายการ Column Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
                  จำนวน ({mode === 'RECEIVE' ? 'รับเข้า' : 'เบิกออก'})
                </label>
                <div className="flex items-center bg-slate-50/75 border border-slate-200 rounded-2xl px-2 h-12 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex justify-center items-center bg-white hover:bg-slate-100 text-slate-600 rounded-xl font-black text-sm border border-slate-200/50 shadow-sm hover:shadow active:scale-95 transition-all outline-none"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
                    className="w-full text-center bg-transparent border-none text-slate-800 focus:outline-none focus:ring-0 font-extrabold text-sm px-1 py-0"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex justify-center items-center bg-white hover:bg-slate-100 text-slate-650 rounded-xl font-black text-sm border border-slate-200/50 shadow-sm hover:shadow active:scale-95 transition-all outline-none"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 block uppercase tracking-wider">ผู้ทำรายการ</label>
                <input
                  type="text"
                  required
                  placeholder="ผู้เบิก/พยาบาล..."
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full bg-slate-50/75 border border-slate-200 px-4 py-3 rounded-2xl text-slate-700 text-xs md:text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 shadow-inner h-12 transition-all"
                />
              </div>
            </div>

            {/* 4. Multi-Lot & Expiry Management: RECEIVE vs ISSUE */}
            {mode === 'RECEIVE' ? (
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                    <Tag size={13} className="text-emerald-600" />
                    <span>ข้อมูลล็อตที่รับเข้า (Lot & Expiry)</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-100/70 px-2 py-0.5 rounded-full">
                    รองรับวันหมดอายุหลายล็อต
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>หมายเลขล็อต (Lot No.)</span>
                      <button
                        type="button"
                        onClick={() => {
                          const autoLot = generateLotNumber(expiryDate);
                          setScanLotNumber(autoLot);
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                      >
                        ⚡ สร้างเลขอัตโนมัติ
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="เช่น LOT-6702, B2408 (เว้นว่างได้)"
                      value={scanLotNumber}
                      onChange={(e) => setScanLotNumber(e.target.value)}
                      className="w-full bg-white border border-emerald-200 px-3.5 py-2.5 rounded-xl text-slate-800 font-mono text-xs font-bold focus:ring-2 focus:ring-emerald-200 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>วันหมดอายุของล็อตนี้</span>
                      {expiryDate && (
                        <button
                          type="button"
                          onClick={() => setExpiryDate('')}
                          className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          ล้างค่า
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full bg-white border border-emerald-200 px-3.5 py-2 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-emerald-200 outline-none cursor-pointer h-10"
                    />
                  </div>
                </div>

                <div className="p-2 bg-white/80 rounded-xl border border-emerald-200/60 text-[10px] text-emerald-800 leading-relaxed">
                  💡 <strong>กรณีวันหมดอายุแต่ละล็อตไม่เท่ากัน:</strong> กรอกวันหมดอายุและเลขล็อตของงวดนี้ได้เลย ระบบจะบันทึกแยกเก็บเป็นล็อตใหม่ให้อัตโนมัติ และคำนวณยอดสต็อกรวมให้
                </div>
              </div>
            ) : (
              /* ISSUE MODE: FEFO Lot Deduction & Custom Input */
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5 bg-rose-50/50 border border-rose-200/80 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} className="text-rose-600" />
                      <span>เลือกล็อตที่ต้องการตัดจ่าย (FEFO)</span>
                    </span>
                    <span className="text-[10px] text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full font-bold">
                      มาตรฐานสากล
                    </span>
                  </div>

                  <select
                    value={isManualIssue ? "__custom__" : scanLotNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__custom__") {
                        setIsManualIssue(true);
                        setScanLotNumber('');
                        setExpiryDate('');
                      } else {
                        setIsManualIssue(false);
                        setScanLotNumber(val);
                        const matchedLot = matchedItem?.lots?.find(l => l.lotNumber === val);
                        setExpiryDate(matchedLot?.expiryDate || '');
                      }
                    }}
                    className="w-full bg-white border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-200 h-10"
                  >
                    <option value="">
                      {matchedItem?.lots && matchedItem.lots.length > 0 
                        ? `⚡ อัตโนมัติ: ตัดจากล็อตหมดอายุเร็วที่สุดก่อน (FEFO: ${matchedItem.lots[0].lotNumber} หมดอายุ ${formatThaiDate(matchedItem.lots[0].expiryDate)})`
                        : "⭐ ตัดล็อตหมดอายุเร็วสุดอัตโนมัติ (FEFO: แนะนำ)"
                      }
                    </option>
                    {matchedItem?.lots && matchedItem.lots.map(lot => (
                      <option key={lot.lotNumber} value={lot.lotNumber}>
                        เจาะจงล็อต {lot.lotNumber} | หมดอายุ: {formatThaiDate(lot.expiryDate)} (คงเหลือ: {lot.quantity} {matchedItem.unit})
                      </option>
                    ))}
                    <option value="__custom__">✏️ ระบุล็อตและวันหมดอายุเอง (ระบุด้วยตนเอง)</option>
                  </select>

                  {/* Manual Input Fields for Issue Mode */}
                  {(isManualIssue || !matchedItem?.lots || matchedItem.lots.length <= 1) && (
                    <div className="space-y-3 bg-white/80 p-3 rounded-xl border border-rose-100">
                      <div className="text-[11px] font-bold text-rose-800 flex items-center gap-1.5">
                        <Tag size={13} className="text-rose-600" />
                        <span>กรอกล็อตและวันหมดอายุ (แบบระบุด้วยตนเอง)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">หมายเลขล็อต (Lot No.)</label>
                          <input
                            type="text"
                            placeholder="ระบุเลขล็อต..."
                            value={scanLotNumber}
                            onChange={(e) => setScanLotNumber(e.target.value)}
                            className="w-full bg-slate-50 border border-rose-200 px-3.5 py-2 rounded-xl text-slate-800 font-mono text-xs font-bold focus:ring-2 focus:ring-rose-200 outline-none h-10"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 block">วันหมดอายุ (Expiry Date)</label>
                          <input
                            type="date"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            className="w-full bg-slate-50 border border-rose-200 px-3.5 py-2 rounded-xl text-slate-800 text-xs font-bold focus:ring-2 focus:ring-rose-200 outline-none cursor-pointer h-10"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-rose-750 leading-normal">
                    🛡️ ระบบจะบันทึกการตัดจ่ายตามล็อตที่เลือกหรือกรอกข้อมูล และตัดจ่ายสต็อกจากล็อตดังกล่าวตามประวัติ
                  </p>
                </div>
              </div>
            )}

            {/* Error alerts */}
            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 text-xs font-bold flex items-start gap-1.5 animate-pulse">
                <Info size={14} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button - Color maps to Active Mode explicitly */}
            <div className="pt-2">
              <button
                type="submit"
                className={`w-full py-4 text-center text-white rounded-2xl font-black text-xs md:text-sm tracking-widest uppercase transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer ${
                  mode === 'RECEIVE'
                    ? 'bg-[#00c07f] hover:bg-[#00ab70] shadow-emerald-100 hover:shadow-emerald-250 border border-[#00ac72]'
                    : 'bg-[#fe155a] hover:bg-[#e10d4c] shadow-pink-100 hover:shadow-pink-250 border border-[#e21350]'
                }`}
              >
                ยืนยันรายการ
              </button>
            </div>

          </form>
          )}

          {/* REGISTER UNMATCHED CODE INLINE SYSTEM */}
          {isRegistering && scannedCode && (
            <form onSubmit={handleRegisterNewItem} className="bg-slate-50 border border-slate-200 rounded-[28px] p-4 md:p-5 space-y-4 animate-fade-in shadow-inner">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
                <Plus size={16} className="text-indigo-600" />
                <span className="font-black text-slate-800 text-xs tracking-wide">ลงทะเบียนรหัสเวชภัณฑ์ใหม่เข้าระบบคลังด่วน</span>
              </div>

              {regError && (
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 text-xs font-bold">
                  {regError}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-500">
                  <span>รหัสสินค้า / รหัสบาร์โค้ด <span className="font-normal text-slate-400">(เว้นว่างได้)</span></span>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = regCategory.substring(0, 3).toUpperCase();
                      setScannedCode(`${prefix}-${Math.floor(100000 + Math.random() * 900000)}`);
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 transition-colors"
                  >
                    <Zap size={11} className="text-amber-500" />
                    <span>⚡ สร้างรหัสอัตโนมัติ (ไม่มีบาร์โค้ด)</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="สแกน หรือเว้นว่างเพื่อสร้างรหัสอัตโนมัติ..."
                    value={scannedCode}
                    onChange={(e) => setScannedCode(isNumericOnly ? extractBarcodeDigits(e.target.value) : normalizeBarcode(e.target.value))}
                    className="w-full bg-white border border-indigo-200 text-indigo-700 px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold h-10 focus:ring-2 focus:ring-indigo-100 outline-none"
                  />
                  {scannedCode && (
                    <button
                      type="button"
                      onClick={() => setScannedCode('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {containsThai(scannedCode) && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5 animate-fadeIn">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px]">
                      <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                      <span>ตรวจพบอักษรไทยจากเครื่องสแกน</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setScannedCode(normalizeBarcode(scannedCode))}
                        className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[10px] shadow-sm cursor-pointer"
                      >
                        ✅ แปลงเป็น: {normalizeBarcode(scannedCode)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setScannedCode(extractBarcodeDigits(scannedCode))}
                        className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold text-[10px] shadow-sm cursor-pointer"
                      >
                        🔢 ตัวเลขล้วน: {extractBarcodeDigits(scannedCode)}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 block">ระบุชื่อรายการสินค้า/ยาเวชภัณฑ์</label>
                <input
                  autoFocus
                  type="text"
                  required
                  placeholder="เช่น พลาสเตอร์ปิดแผล, กระดาษ A4 80 แกรม, น้ำยาล้างจาน"
                  value={regName}
                  onChange={(e) => {
                    setRegName(e.target.value);
                    setRegError('');
                  }}
                  className="w-full bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold h-10 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">หมวดหมู่</label>
                  <select
                    value={regCategory}
                    onChange={(e) => setRegCategory(e.target.value as CategoryId)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-[11px] font-bold text-slate-700 h-10 focus:outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <UnitSelector
                  value={regUnit}
                  onChange={(u) => setRegUnit(u)}
                  label="หน่วยนับ"
                  compact={true}
                  selectClassName="bg-white border-slate-200 h-10 py-1.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">จำนวนรับเข้าเริ่มต้น</label>
                  <input
                    type="number"
                    min="0"
                    value={regQty}
                    onChange={(e) => setRegQty(parseInt(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-center text-xs font-bold text-slate-800 h-10 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">วันหมดอายุสินค้า</label>
                  <input
                    type="date"
                    value={regExpiry}
                    onChange={(e) => setRegExpiry(e.target.value)}
                    className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 h-10 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="flex-1 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] rounded-xl transition-all h-10"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl transition-all h-10 shadow-sm border border-indigo-700"
                >
                  ลงทะเบียนสินค้าสำเร็จ
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
