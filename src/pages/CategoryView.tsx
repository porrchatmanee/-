import React, { useState, useEffect } from 'react';
import { useInventory } from '../lib/store';
import { CATEGORIES } from '../lib/constants';
import { 
  Search, Plus, LayoutGrid, Package, ArrowLeftRight, FileText, 
  ArrowDownLeft, ArrowUpRight, AlertTriangle, Clock, Target, 
  Layers, CircleDollarSign, Calendar, Info, X, Check, Save, Camera, RefreshCcw, Trash2, Edit, Scan
} from 'lucide-react';
import { InventoryItem } from '../types';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export function CategoryView({ categoryId }: { categoryId: string }) {
  const { items, transactions, addItem, processTransaction, deleteItem, updateItem } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'RECEIVE' | 'ISSUE'>('RECEIVE');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustExpiry, setAdjustExpiry] = useState('');

  const [isDirectEditModalOpen, setIsDirectEditModalOpen] = useState(false);
  const [directEditItem, setDirectEditItem] = useState<InventoryItem | null>(null);
  const [directEditQty, setDirectEditQty] = useState(0);

  // New Item Form
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(0);
  const [newUnit, setNewUnit] = useState('กล่อง');
  const [newExpiry, setNewExpiry] = useState('');
  const [addError, setAddError] = useState('');
  
  const addItemBarcodeRef = React.useRef<HTMLInputElement>(null);
  const newItemNameRef = React.useRef<HTMLInputElement>(null);

  // Camera Reader inside Add New Item registration screen
  const [isAddCameraActive, setIsAddCameraActive] = useState<boolean>(false);
  const [addCameraLoading, setAddCameraLoading] = useState<boolean>(false);
  const [addCameraError, setAddCameraError] = useState<string>('');
  const [addCameras, setAddCameras] = useState<MediaDeviceInfo[]>([]);
  const [addActiveCameraId, setAddActiveCameraId] = useState<string>('');

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
      console.warn('AudioContext not supported', e);
    }
  };

  // Run camera scanner inside Add Item modal when active
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    
    if (isAddModalOpen && isAddCameraActive) {
      setAddCameraLoading(true);
      setAddCameraError('');
      
      const timer = setTimeout(() => {
        const elementId = "add-item-camera-view";
        const element = document.getElementById(elementId);
        if (!element) {
          setAddCameraLoading(false);
          return;
        }

        if (!navigator.mediaDevices) {
          setAddCameraLoading(false);
          setAddCameraError("เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้องถ่ายรูป");
          return;
        }

        try {
          html5QrCode = new Html5Qrcode(elementId, {
            verbose: false,
            useBarCodeDetectorIfSupported: true,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.QR_CODE
            ]
          });

          const startFallbackAddScanner = () => {
            const container = document.getElementById(elementId);
            if (container) {
              container.innerHTML = "";
            }
            html5QrCode?.start(
              { facingMode: "environment" },
              {
                fps: 10,
              },
              (decodedText) => {
                if (decodedText && decodedText.trim()) {
                  playBeep();
                  setNewId(decodedText.trim().toUpperCase());
                  setIsAddCameraActive(false); // Stop camera immediately on clean barcode scan
                  if (navigator.vibrate) {
                    navigator.vibrate(100);
                  }
                }
              },
              () => {}
            ).then(() => {
              setAddCameraLoading(false);
              // Gracefully list cameras after startup to let user cycle if needed
              Html5Qrcode.getCameras().then(devices => {
                if (devices && devices.length > 0) {
                  setAddCameras(devices);
                }
              }).catch(e => console.warn("Failed to query cameras post fallback start in register modal", e));
            }).catch(err => {
              setAddCameraLoading(false);
              console.error("Add item fallback start failed:", err);
              setAddCameraError(
                "ไม่ได้รับสิทธิเข้าถึงกล้อง\n" +
                "👉 หากใช้แอป LINE/Facebook กดจุด 3 จุดล่างขวา แล้วเลือก 'เปิดในเบราว์เซอร์อื่น'\n" +
                "👉 หากเปิดในแอปค้นหา ให้กดที่แม่กุญแจ 🔒 ที่แถบ URL ด้านบน เลือก 'อนุญาต' (Allow)"
              );
            });
          };

          // Try standard camera list first
          Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length > 0) {
              setAddCameras(devices);
              
              // environmental back camera or default to index 0
              const backCam = devices.find(device => 
                device.label.toLowerCase().includes('back') || 
                device.label.toLowerCase().includes('environment') ||
                device.label.toLowerCase().includes('rear') ||
                device.label.toLowerCase().includes('กล้องหลัง')
              );
              
              // Use "{ facingMode: "environment" }" by default if no addActiveCameraId is set yet.
              const targetConstraint = addActiveCameraId ? addActiveCameraId : { facingMode: "environment" };

              // iOS/Android Safari WebKit compatibility: clear container elements first
              const container = document.getElementById(elementId);
              if (container) {
                container.innerHTML = "";
              }
              
              html5QrCode?.start(
                targetConstraint,
                {
                  fps: 10,
                },
                (decodedText) => {
                  if (decodedText && decodedText.trim()) {
                    playBeep();
                    setNewId(decodedText.trim().toUpperCase());
                    setIsAddCameraActive(false); // Stop camera immediately on clean barcode scan
                    if (navigator.vibrate) {
                      navigator.vibrate(100);
                    }
                  }
                },
                () => {}
              ).then(() => {
                setAddCameraLoading(false);
              }).catch(err => {
                console.warn("Category register camera start constraint mismatch, trying fallback:", err);
                startFallbackAddScanner();
              });
            } else {
              // No cameras listed pre-stream, try direct environment boot
              startFallbackAddScanner();
            }
          }).catch(err => {
            console.warn("getCameras failed in register modal, starting with fallback:", err);
            startFallbackAddScanner();
          });
        } catch (err) {
          setAddCameraLoading(false);
          console.error("General camera setup error in register modal:", err);
          setAddCameraError("ระบบล้มเหลวในการเซ็ตอัพอุปกรณ์กล้องถ่ายภาพ");
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode) {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().catch(e => console.warn("Add item scanner wrap up error:", e));
          }
        }
      };
    }
  }, [isAddModalOpen, isAddCameraActive, addActiveCameraId]);

  // Handle clean reset when opening / closing Modal
  useEffect(() => {
    if (!isAddModalOpen) {
      setIsAddCameraActive(false);
      setAddCameraLoading(false);
      setAddCameraError('');
      setAddActiveCameraId('');
      // focus logic happens when opening so not here
    } else {
      // Auto focus the input field for physical barcode scanners
      setTimeout(() => {
        addItemBarcodeRef.current?.focus();
      }, 350);
    }
  }, [isAddModalOpen]);

  // Capture current camera stream frame as image file & scan it offline
  const handleAddCaptureFrame = () => {
    const videoEl = document.querySelector('#add-item-camera-view video') as HTMLVideoElement;
    if (!videoEl) {
      setAddCameraError('กรุณาเปิดใช้งานและรอกล้องถ่ายภาพแสดงวิดีโอก่อนกดจับภาพ');
      return;
    }
    setAddCameraError('');
    setAddCameraLoading(true);

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
          const tempScanner = new Html5Qrcode("hidden-category-file-scanner", {
            verbose: false,
            useBarCodeDetectorIfSupported: true,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.ITF,
              Html5QrcodeSupportedFormats.QR_CODE
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
              setAddCameraLoading(false);
              setAddCameraError("ไม่สามารถตรวจพบบาร์โค้ดในภาพแคปเจอร์จับภาพสดนี้ได้ 💡 แนะนำถือกล้องให้นิ่งและตั้งบาร์โค้ดขนานกับช่องมองขีดแดง หรือกดปุ่ม 'ถ่ายกล้องมือถือตรง' ขวามือเพื่อใช้โหมดภาพถ่ายเต็มความละเอียด");
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
                console.warn("Capture preprocessing filter in Category modal failed:", err);
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
                    setAddCameraLoading(false);
                    playBeep();
                    setNewId(decodedText.trim().toUpperCase());
                    setIsAddCameraActive(false); // Done
                    if (navigator.vibrate) navigator.vibrate(100);
                    return; // Done
                  }
                }
              } catch (nativeErr) {
                console.warn("Native BarcodeDetector pass failed on Category, trying fallback:", nativeErr);
              }
            }

            // 2. FALLBACK TO OFFLINE JS-BASED HTML5QRCODE DECODER
            passCanvas.toBlob((blob) => {
              if (!blob) {
                tryPass(passIdx + 1);
                return;
              }

              const testFile = new File([blob], `capture_add_pass_${currentPass.name}.jpg`, { type: 'image/jpeg' });
              tempScanner.scanFile(testFile, false)
                .then(decodedText => {
                  if (decodedText && decodedText.trim()) {
                    setAddCameraLoading(false);
                    playBeep();
                    setNewId(decodedText.trim().toUpperCase());
                    setIsAddCameraActive(false); // Can turn off camera on successful scan
                    if (navigator.vibrate) navigator.vibrate(100);
                  } else {
                    tryPass(passIdx + 1);
                  }
                })
                .catch(err => {
                  console.warn(`Category capture scan pass "${currentPass.name}" failed:`, err);
                  tryPass(passIdx + 1);
                });
            }, 'image/jpeg', 0.95);
          };

          tryPass(0);
        };
        img.onerror = () => {
          setAddCameraLoading(false);
          setAddCameraError("เกิดข้อผิดพลาดในการโหลดรูปภาพเฟรมสดเพื่อสแกน");
        };
        img.src = dataUrl;
      } else {
        setAddCameraLoading(false);
        setAddCameraError("ไม่สามารถดึงภาพวิดีโอมาประมวลผลขนาดได้");
      }
    } catch (e) {
      setAddCameraLoading(false);
      console.error(e);
      setAddCameraError("เกิดข้อผิดพลาดในการดึงรูปสัญญาณภาพนิ่งสด");
    }
  };

  // Upload/Direct scan via environment-capture native phone camera
  const handleAddFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAddCameraError('');
    setAddCameraLoading(true);

    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const tempScanner = new Html5Qrcode("hidden-category-file-scanner", {
          verbose: false,
          useBarCodeDetectorIfSupported: true,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.QR_CODE
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
            setAddCameraLoading(false);
            setAddCameraError("วิเคราะห์รหัสบาร์โค้ดจากภาพถ่ายไม่สำเร็จ 💡 แนะนำป้อนชุดรหัสสินค้าเวชภัณฑ์โดยตรง หรือถ่ายให้เข้มขวางกล้องตรงๆ ในจุดที่มีแสงสว่างเพียงพอ");
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
              console.warn("Failed to apply preprocessing filters in Category register modal:", err);
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
                  setAddCameraLoading(false);
                  playBeep();
                  setNewId(decodedText.trim().toUpperCase());
                  setIsAddCameraActive(false); // Stop live stream securely
                  if (navigator.vibrate) navigator.vibrate(100);
                  return; // Done
                }
              }
            } catch (nativeErr) {
              console.warn("Native BarcodeDetector file pass failed on Category, trying fallback:", nativeErr);
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
                  setAddCameraLoading(false);
                  playBeep();
                  setNewId(decodedText.trim().toUpperCase());
                  setIsAddCameraActive(false); // Stop live stream securely
                  if (navigator.vibrate) navigator.vibrate(100);
                } else {
                  tryPass(passIdx + 1);
                }
              })
              .catch(err => {
                console.warn(`Category Scan pass "${currentPass.name}" failed:`, err);
                tryPass(passIdx + 1);
              });
          }, 'image/jpeg', 0.95);
        };

        tryPass(0);
      };

      img.onerror = () => {
        setAddCameraLoading(false);
        setAddCameraError("ดึงสัดส่วนขนาดภาพต้นฉบับไม่สำเร็จ");
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        setAddCameraLoading(false);
        setAddCameraError("ข้อมูลรูปภาพไม่ถูกต้อง");
      }
    };
    reader.onerror = () => {
      setAddCameraLoading(false);
      setAddCameraError("ล้มเหลวในการอ่านข้อมูลภาพ");
    };
    reader.readAsDataURL(file);
  };

  const category = CATEGORIES.find(c => c.id === categoryId);
  
  if (!category) return null;

  // Filter items in this category
  const categoryItems = items.filter(i => i.categoryId === categoryId);
  const filteredItems = categoryItems.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to estimate price/value for items
  const getItemPrice = (id: string) => {
    if (id === 'M001') return 20;
    if (id === 'M002') return 85; 
    if (id === 'M003') return 120;
    if (id === 'M004') return 55;
    return 50; // Fallback price
  };

  // 1. Calculations for upper summary cards (Matching screenshot)
  const totalItems = categoryItems.length;
  const lowStockCount = categoryItems.filter(i => i.quantity < 10).length;
  const expiringCount = categoryItems.filter(i => i.expiryDate).length; // any with expiry
  
  // Filter today's transactions for this category's items
  const todayStr = new Date().toISOString().split('T')[0];
  const categoryItemIds = categoryItems.map(i => i.id);
  
  const todayTransactions = transactions.filter(t => {
    const isToday = t.timestamp.startsWith(todayStr);
    const isThisCategory = categoryItemIds.includes(t.itemId);
    return isToday && isThisCategory;
  });

  const receivesToday = todayTransactions
    .filter(t => t.type === 'RECEIVE')
    .reduce((acc, curr) => acc + curr.quantity, 0);

  const issuesToday = todayTransactions
    .filter(t => t.type === 'ISSUE')
    .reduce((acc, curr) => acc + curr.quantity, 0);

  const issuedValueToday = todayTransactions
    .filter(t => t.type === 'ISSUE')
    .reduce((acc, curr) => acc + (curr.quantity * getItemPrice(curr.itemId)), 0);

  const overStockCount = categoryItems.filter(i => i.quantity > 100).length;

  const getStatus = (quantity: number) => {
    if (quantity < 10) return { label: 'สต๊อกต่ำ', class: 'bg-rose-50 text-rose-600 border border-rose-200' };
    if (quantity > 100) return { label: 'สต๊อกเกิน', class: 'bg-indigo-50 text-indigo-600 border border-indigo-200' };
    return { label: 'ปกติ', class: 'bg-emerald-50 text-emerald-600 border border-emerald-200' };
  };

  // Top usage item based on today's issue transactions
  const issueCounts: { [key: string]: number } = {};
  todayTransactions.filter(t => t.type === 'ISSUE').forEach(t => {
    issueCounts[t.itemId] = (issueCounts[t.itemId] || 0) + t.quantity;
  });
  
  const topUsedItems = Object.entries(issueCounts)
    .map(([itemId, qty]) => {
      const item = categoryItems.find(i => i.id === itemId);
      return {
        id: itemId,
        name: item?.name || 'รายการสินค้า',
        quantity: qty,
        unit: item?.unit || 'ชิ้น',
        value: qty * getItemPrice(itemId)
      };
    })
    .sort((a, b) => b.value - a.value);

  // Expiry styling
  const formatThaiDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', { 
      year: '2-digit', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newId.replace(/\s+/g, '').toUpperCase();
    if (!cleanId || !newName) {
      setAddError('กรุณากรอกรหัสและชื่อรายการ');
      return;
    }

    if (items.some(i => i.id.toLowerCase() === cleanId.toLowerCase())) {
      setAddError('รหัสสินค้านี้มีอยู่ในระบบแล้ว');
      return;
    }

    addItem({
      id: cleanId,
      name: newName.trim(),
      categoryId: categoryId as any,
      quantity: newQty,
      unit: newUnit,
      expiryDate: newExpiry || undefined
    });

    // Reset Form
    setNewId('');
    setNewName('');
    setNewQty(0);
    setNewUnit('กล่อง');
    setNewExpiry('');
    setAddError('');
    setIsAddModalOpen(false);
  };

  const handleQuickAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;

    processTransaction({
      itemId: adjustItem.id,
      type: adjustType,
      quantity: adjustQty,
      expiryDate: adjustType === 'RECEIVE' && adjustExpiry ? adjustExpiry : undefined
    });

    setIsAdjustModalOpen(false);
    setAdjustItem(null);
    setAdjustQty(1);
    setAdjustExpiry('');
  };

  const handleDirectEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directEditItem) return;

    updateItem(directEditItem.id, { quantity: directEditQty });
    
    setIsDirectEditModalOpen(false);
    setDirectEditItem(null);
    setDirectEditQty(0);
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรายการ "${name}" ?`)) {
      deleteItem(id);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-full flex flex-col pt-6 md:pt-10">
      
      {/* Header with Title and Custom Modern Tabs */}
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight mb-4 md:mb-6">{category.name}</h1>
        
        <div className="flex overflow-x-auto gap-2 bg-white rounded-3xl p-1.5 shadow-sm border border-slate-100 w-fit max-w-full pb-2 md:pb-1.5 hide-scrollbar">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'overview' 
                ? 'bg-rose-50 text-semibold text-rose-500 shadow-sm border border-rose-100' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid size={16} />
            <span>ภาพรวม</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'items' 
                ? 'bg-rose-50 text-semibold text-rose-500 shadow-sm border border-rose-100' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Package size={16} />
            <span>รายการสินค้า</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'transactions' 
                ? 'bg-rose-50 text-semibold text-rose-500 shadow-sm border border-rose-100' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <ArrowLeftRight size={16} />
            <span>เบิกจ่าย</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === 'reports' 
                ? 'bg-rose-50 text-semibold text-rose-500 shadow-sm border border-rose-100' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileText size={16} />
            <span>รายงาน</span>
          </button>
        </div>
      </header>

      {/* Primary Action Button: Add New Item */}
      <div className="flex justify-end mb-6">
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all shadow-md shadow-rose-200 active:scale-[0.98]"
        >
          <Plus size={18} />
          <span>เพิ่มรายการใหม่</span>
        </button>
      </div>

      {/* -------------------- TAB: OVERVIEW (ภาพรวม) -------------------- */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-8">
          {/* Top horizontal scannable Cards / Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            
            {/* Card 1: จำนวนเวชภัณฑ์ */}
            <div className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-3">
                <Package size={22} />
              </div>
              <span className="text-xs text-slate-400 font-bold tracking-wide">จำนวน{category.name.replace('คลัง', '')}</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-800">{totalItems}</span>
                <span className="text-xs text-slate-400 font-bold">รายการ</span>
              </div>
            </div>

            {/* Card 2: สต๊อกต่ำ */}
            <div className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-3">
                <AlertTriangle size={22} />
              </div>
              <span className="text-xs text-slate-400 font-bold tracking-wide">สต๊อกต่ำ</span>
              <div className="mt-2">
                <span className="text-2xl font-black text-slate-850">{lowStockCount}</span>
              </div>
            </div>

            {/* Card 3: แจ้งหมดอายุ */}
            <div className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-12 h-12 bg-rose-50 text-rose-450 rounded-2xl flex items-center justify-center mb-3">
                <Clock size={22} className="text-rose-400" />
              </div>
              <span className="text-xs text-slate-400 font-bold tracking-wide">แจ้งหมดอายุ</span>
              <div className="mt-2">
                <span className="text-2xl font-black text-slate-850">{expiringCount}</span>
              </div>
            </div>

            {/* Card 4: รับเข้าวันนี้ */}
            <div className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-3">
                <ArrowDownLeft size={22} />
              </div>
              <span className="text-xs text-slate-400 font-bold tracking-wide">รับเข้าวันนี้</span>
              <div className="mt-2">
                <span className="text-2xl font-black text-slate-850">{receivesToday}</span>
              </div>
            </div>

            {/* Card 5: เบิกจ่ายวันนี้ */}
            <div className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-12 h-12 bg-fuchsia-100/60 text-fuchsia-500 rounded-2xl flex items-center justify-center mb-3">
                <ArrowUpRight size={22} />
              </div>
              <span className="text-xs text-slate-400 font-bold tracking-wide">เบิกจ่ายวันนี้</span>
              <div className="mt-2">
                <span className="text-2xl font-black text-slate-850">{issuesToday}</span>
              </div>
            </div>

            {/* Card 6: มูลค่าเบิกจ่าย */}
            <div className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-3">
                <CircleDollarSign size={22} />
              </div>
              <span className="text-xs text-slate-400 font-bold tracking-wide">มูลค่าเบิกจ่าย</span>
              <div className="mt-2 flex items-baseline gap-1 justify-center">
                <span className="text-2xl font-black text-amber-650">{issuedValueToday}</span>
                <span className="text-xs text-slate-400 font-bold">บาท</span>
              </div>
            </div>

            {/* Card 7: สต๊อกเกิน */}
            <div className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-12 h-12 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center mb-3">
                <Layers size={22} />
              </div>
              <span className="text-xs text-slate-400 font-bold tracking-wide">สต๊อกเกิน</span>
              <div className="mt-2 flex items-baseline gap-1 justify-center">
                <span className="text-2xl font-black text-slate-850">{overStockCount}</span>
              </div>
            </div>

          </div>

          {/* Bottom Grid: 4 Panels matching screenshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Panel 1: รายการที่มีการใช้สูงสุด (วันนี้) */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col min-h-[300px] min-w-0">
              <h3 className="text-amber-700 font-bold text-sm tracking-wide mb-5">รายการที่มีการใช้สูงสุด (วันนี้)</h3>
              
                          <div className="flex justify-between text-xs font-bold text-slate-400 border-b border-slate-50 pb-2 mb-3">
                <span className="flex-1 min-w-0">รายการ</span>
                <span>มูลค่า</span>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto min-w-0">
                {topUsedItems.length > 0 ? (
                  topUsedItems.map(item => (
                    <div key={item.id} className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-700 text-sm leading-snug truncate" title={item.name}>{item.name}</div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5">จำนวน {item.quantity} {item.unit}</div>
                      </div>
                      <div className="text-amber-650 font-extrabold text-sm whitespace-nowrap shrink-0">
                        ฿{item.value.toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 py-10 text-xs font-medium">ไม่มีรายการใช้งานวันนี้</div>
                )}
              </div>
            </div>

            {/* Panel 2: แจ้งเตือน: สต๊อกต่ำ */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col min-h-[300px] min-w-0">
              <h3 className="text-rose-500 font-bold text-sm tracking-wide mb-5">แจ้งเตือน: สต๊อกต่ำ</h3>
              
              <div className="flex text-xs font-bold text-slate-400 border-b border-slate-50 pb-2 mb-3 gap-2">
                <span className="w-16 shrink-0">รหัส</span>
                <span className="flex-1 min-w-0">รายการ</span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto min-w-0">
                {categoryItems.filter(i => i.quantity < 10).length > 0 ? (
                  categoryItems.filter(i => i.quantity < 10).map(item => (
                    <div key={item.id} className="flex text-sm items-center gap-2">
                      <span className="w-16 shrink-0 font-mono text-xs text-slate-400 font-semibold truncate" title={item.id}>{item.id}</span>
                      <span className="font-bold text-slate-700 truncate flex-1 min-w-0" title={item.name}>{item.name}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 py-10 text-xs font-medium">ไม่มีรายการสินค้าสต๊อกต่ำ</div>
                )}
              </div>
            </div>

            {/* Panel 3: แจ้งเตือน: สต๊อกเกิน */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col min-h-[300px] min-w-0">
              <h3 className="text-indigo-600 font-bold text-sm tracking-wide mb-5">แจ้งเตือน: สต๊อกเกิน</h3>
              
              <div className="flex text-xs font-bold text-slate-400 border-b border-slate-50 pb-2 mb-3 gap-2">
                <span className="w-14 shrink-0">รหัส</span>
                <span className="flex-1 min-w-0">รายการ</span>
                <span className="w-16 shrink-0 text-right">คงเหลือ</span>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto font-sans min-w-0">
                {categoryItems.filter(i => i.quantity > 100).length > 0 ? (
                  categoryItems.filter(i => i.quantity > 100).map(item => (
                    <div key={item.id} className="flex text-sm items-center gap-2">
                      <span className="w-14 shrink-0 font-mono text-xs text-slate-400 font-semibold truncate" title={item.id}>{item.id}</span>
                      <span className="font-bold text-slate-700 truncate flex-1 min-w-0" title={item.name}>{item.name}</span>
                      <span className="w-16 shrink-0 text-right font-bold text-indigo-600">{item.quantity}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 py-10 text-xs font-medium">ไม่มีรายการสินค้าสต๊อกเกิน</div>
                )}
              </div>
            </div>

            {/* Panel 4: แจ้งเตือน: วันหมดอายุ */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col min-h-[300px] min-w-0">
              <h3 className="text-rose-500 font-bold text-sm tracking-wide mb-5">แจ้งเตือน: วันหมดอายุ</h3>
              
              <div className="flex justify-between text-xs font-bold text-slate-400 border-b border-slate-50 pb-2 mb-3">
                <span className="flex-1 min-w-0">รายการ</span>
                <span className="text-right">วันหมดอายุ</span>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto min-w-0">
                {categoryItems.filter(i => i.expiryDate).length > 0 ? (
                  categoryItems.filter(i => i.expiryDate).map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm gap-2">
                      <span className="font-bold text-slate-700 truncate flex-1 min-w-0" title={item.name}>{item.name}</span>
                      <span className="font-extrabold text-rose-700 text-xs whitespace-nowrap bg-rose-50 px-2 py-1 rounded-md border border-rose-100 shrink-0">
                        {formatThaiDate(item.expiryDate!)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 py-10 text-xs font-medium">ไม่มีบันทึกข้อมูลวันหมดอายุ</div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* -------------------- TAB: ITEMS LIST (รายการสินค้า) -------------------- */}
      {activeTab === 'items' && (
        <div className="flex flex-col gap-6">
          {/* Search container */}
          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm mb-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="ค้นหาตามรหัส หรือ ชื่อรายการ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 transition-all text-sm"
              />
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden flex-1">
            <div className="overflow-x-auto font-sans">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-sm font-bold">
                    <th className="p-5 pl-6 w-24">รหัส</th>
                    <th className="p-5">รายการ</th>
                    <th className="p-5 text-center w-32">คงเหลือ</th>
                    <th className="p-5 text-center w-40">วันหมดอายุ</th>
                    <th className="p-5 text-center w-32">สถานะ</th>
                    <th className="p-5 text-center w-48 pr-6">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.map((item) => {
                    const status = getStatus(item.quantity);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="p-5 pl-6 text-slate-400 font-mono text-sm font-medium">
                          {item.id}
                        </td>
                        <td className="p-5 font-bold text-slate-700">
                          {item.name}
                        </td>
                        <td className="p-5 text-center">
                          <span className="font-bold text-slate-800">{item.quantity}</span> <span className="text-slate-400 text-sm">{item.unit}</span>
                        </td>
                        <td className="p-5 text-center text-slate-500 text-sm font-semibold">
                          {item.expiryDate ? formatThaiDate(item.expiryDate) : '-'}
                        </td>
                        <td className="p-5 text-center">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${status.class}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="p-5 text-center pr-6">
                          <div className="flex items-center justify-center gap-1.5 w-fit mx-auto">
                            <button 
                              onClick={() => {
                                setAdjustItem(item);
                                setAdjustType('RECEIVE');
                                setIsAdjustModalOpen(true);
                              }}
                              className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-all border border-emerald-100 active:scale-95" 
                              title="รับเข้า"
                            >
                              <ArrowDownLeft size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                setAdjustItem(item);
                                setAdjustType('ISSUE');
                                setIsAdjustModalOpen(true);
                              }}
                              className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-all border border-rose-100 active:scale-95" 
                              title="เบิกจ่าย"
                            >
                              <ArrowUpRight size={16} />
                            </button>
                            <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
                            <button 
                              onClick={() => {
                                setDirectEditItem(item);
                                setDirectEditQty(item.quantity);
                                setIsDirectEditModalOpen(true);
                              }}
                              className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-slate-100 hover:text-indigo-600 transition-all border border-slate-100 active:scale-95" 
                              title="แก้ไขยอด"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="w-9 h-9 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all border border-slate-100 active:scale-95" 
                              title="ลบรายการ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-slate-400">
                        ไม่พบรายการสินค้า
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB: TRANSACTIONS (เบิกจ่าย/ประวัติ) -------------------- */}
      {activeTab === 'transactions' && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden p-6">
          <h3 className="font-bold text-lg text-slate-800 mb-4">ประวัติคลัง {category.name}</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-sm">
              <thead>
                <tr className="border-b border-slate-150 text-slate-450 font-bold pb-2">
                  <th className="pb-3 pl-2">วันเวลา</th>
                  <th className="pb-3">รหัสสินค้า</th>
                  <th className="pb-3">รายการ</th>
                  <th className="pb-3">ประเภท</th>
                  <th className="pb-3 text-right">จำนวน</th>
                  <th className="pb-3 text-right">วันหมดอายุบันทึก</th>
                  <th className="pb-3 text-right pr-2">ผู้ทำรายการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.filter(t => categoryItemIds.includes(t.itemId)).length > 0 ? (
                  transactions.filter(t => categoryItemIds.includes(t.itemId)).map(tx => {
                    const item = items.find(i => i.id === tx.itemId);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="py-4 pl-2 text-slate-500 font-semibold">
                          {new Date(tx.timestamp).toLocaleString('th-TH')}
                        </td>
                        <td className="py-4 font-mono font-medium text-slate-400">
                          {tx.itemId}
                        </td>
                        <td className="py-4 font-bold text-slate-700">
                          {item?.name || 'Unknown'}
                        </td>
                        <td className="py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            tx.type === 'RECEIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {tx.type === 'RECEIVE' ? 'รับเข้า' : 'เบิกจ่าย'}
                          </span>
                        </td>
                        <td className="py-4 text-right font-black text-slate-800">
                          {tx.type === 'RECEIVE' ? '+' : '-'}{tx.quantity} {item?.unit}
                        </td>
                        <td className="py-4 text-right text-slate-500">
                          {tx.expiryDate ? formatThaiDate(tx.expiryDate) : '-'}
                        </td>
                        <td className="py-4 text-right pr-2 text-slate-600 font-bold text-xs">
                          {tx.operator || 'พยาบาล'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-400 py-10 font-bold">
                      ยังไม่มีประวัติการทำรายการสำหรับหมวดหมู่นี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- TAB: REPORTS (รายงาน) -------------------- */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-lg text-slate-800 mb-4">รายงานสัดส่วนความคล่องคงเหลือ</h3>
            <div className="space-y-4">
              {categoryItems.map(item => {
                const maxQty = 200; // Reference max for percentage
                const pct = Math.min(100, Math.round((item.quantity / maxQty) * 100));
                return (
                  <div key={item.id} className="space-y-1.5 animate-fade-in">
                    <div className="flex justify-between items-center text-sm gap-4">
                      <span className="font-bold text-slate-700 truncate flex-1 min-w-0" title={item.name}>{item.name}</span>
                      <span className="font-mono text-slate-500 font-semibold shrink-0">{item.quantity} {item.unit} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.quantity < 10 ? 'bg-rose-500' : item.quantity > 100 ? 'bg-indigo-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {categoryItems.length === 0 && (
                <div className="text-center text-slate-450 py-10">ไม่มีข้อมูลผลิตภัณฑ์เพื่อวิเคราะห์การมองเห็นสัดส่วน</div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-lg text-slate-800 mb-4">สรุปคีย์ข้อมูลภาพรวมแบบเร็ว</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase">อัตราความเสี่ยงสินค้าขาดคลัง</p>
                <p className="text-3xl font-black text-rose-500 mt-1">{((lowStockCount / (totalItems || 1)) * 100).toFixed(1)}%</p>
                <p className="text-xs text-slate-400 mt-2">มี {lowStockCount} ในทั้งหมด {totalItems} รายการที่มีปริมาณต่ำกว่าเกณฑ์ควบคุม 10 หน่วย</p>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase">สัดส่วนสินค้าหมดอายุหลักล็อต</p>
                <p className="text-3xl font-black text-slate-700 mt-1">{((expiringCount / (totalItems || 1)) * 100).toFixed(1)}%</p>
                <p className="text-xs text-slate-400 mt-2">มี {expiringCount} รายการที่มีข้อมูลตรวจตราวันหมดอายุถาวรกำกับเรียบร้อย</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: ADD NEW ITEM -------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-850">เพิ่มรายการสินค้าใหม่</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddNewItem} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 text-xs font-bold flex items-center gap-1.5">
                  <Info size={14} />
                  <span>{addError}</span>
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 block flex items-center justify-between">
                  <span>รหัสสินค้า / รหัสบาร์โค้ด (เช่น M008)</span>
                  <button
                    type="button"
                    onClick={() => setIsAddCameraActive(!isAddCameraActive)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      isAddCameraActive 
                        ? 'bg-rose-500 text-white' 
                        : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  >
                    <Camera size={11} />
                    <span>{isAddCameraActive ? '🔒 ปิดกล้อง' : '📸 สแกนด้วยกล้อง'}</span>
                  </button>
                </label>

                {/* Collapsible live camera viewfinder frame */}
                {isAddCameraActive && (
                  <>
                    <div className="relative aspect-video w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-inner mb-2 group">
                    <div id="add-item-camera-view" className="w-full h-full object-cover"></div>
                    
                    {addCameras.length > 1 && !addCameraLoading && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          const currentIndex = addActiveCameraId 
                            ? addCameras.findIndex(c => c.id === addActiveCameraId)
                            : addCameras.findIndex(device => 
                                device.label.toLowerCase().includes('back') || 
                                device.label.toLowerCase().includes('environment') ||
                                device.label.toLowerCase().includes('rear') ||
                                device.label.toLowerCase().includes('กล้องหลัง')
                              );
                          const actualIndex = currentIndex >= 0 ? currentIndex : 0;
                          const nextIndex = (actualIndex + 1) % addCameras.length;
                          setAddActiveCameraId(addCameras[nextIndex].id);
                        }}
                        className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] px-3 py-1.5 rounded-full border border-slate-700 backdrop-blur-md font-bold flex items-center gap-1.5 hover:bg-slate-800 transition-all z-10 pointer-events-auto"
                      >
                        <RefreshCcw size={12} />
                        <span>สลับกล้อง ({addCameras.length})</span>
                      </button>
                    )}

                    {addCameraLoading && (
                      <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white gap-2 p-4 text-center">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-[10px] font-bold text-indigo-200">กำลังเชื่อมต่อภาพสดกล้อง...</p>
                      </div>
                    )}

                    {!addCameraLoading && !addCameraError && (
                      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                        <div className="w-[85%] h-[55%] border-2 border-indigo-400 rounded-xl relative flex flex-col justify-between items-center shadow-[0_0_0_1000px_rgba(15,23,42,0.4)]">
                          <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-[bounce_2s_infinite]" />
                        </div>
                      </div>
                    )}

                    {addCameraError && (
                      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-rose-200 p-3 text-center gap-2 overflow-y-auto w-full h-full">
                        <p className="text-xs font-black text-rose-450">ระบบกล้องไม่ตอบรับ</p>
                        <p className="text-[10px] text-rose-300 max-w-xs whitespace-pre-line text-left bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/30">{addCameraError}</p>
                        <button
                          type="button"
                          onClick={() => {
                            const nativeBtn = document.getElementById("category-native-camera-input");
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

                  {/* Add Item custom capture tools bar */}
                  <div className="space-y-2 mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleAddCaptureFrame}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2.5 px-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer border border-indigo-500"
                      >
                        <Camera size={13} className="animate-bounce" />
                        <span>กดถ่ายรูปตรวจจับ</span>
                      </button>

                      <label className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black py-2.5 px-3 rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95 cursor-pointer relative">
                        <Scan size={13} className="text-indigo-600" />
                        <span>ถ่ายกล้องมือถือตรง</span>
                        <input
                          id="category-native-camera-input"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleAddFileScan}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                      </label>
                    </div>

                    <p className="text-[9px] font-medium text-slate-400 text-center leading-normal">
                      💡 คำแนะนำ: หากวิดีโอสดตรวจบาร์โค้ดไม่ขึ้น ให้กด <span className="font-bold text-indigo-600">"ถ่ายกล้องมือถือตรง"</span> ถ่ายภาพระยะใกล้ ภาพคมชัดเต็มพิกเซลจะอ่านแม่นยำ 100%!
                    </p>

                    {/* Invisible files reader target element for Category view */}
                    <div id="hidden-category-file-scanner" className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden" />
                  </div>
                </>
              )}

                  <input
                    ref={addItemBarcodeRef}
                    type="text"
                    required
                    placeholder="สแกนหรือระบุรหัสสินค้า ตัวอย่าง M008"
                    value={newId}
                    onChange={(e) => {
                      setNewId(e.target.value);
                      setAddError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newItemNameRef.current) {
                          newItemNameRef.current.focus();
                        }
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300"
                  />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 block">ชื่อรายการสินค้า</label>
                <input
                  ref={newItemNameRef}
                  type="text"
                  required
                  placeholder="ระบุชื่อสินค้า..."
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setAddError('');
                  }}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-550 block">จำนวน</label>
                  <input
                    type="number"
                    min="0"
                    value={newQty}
                    onChange={(e) => setNewQty(parseInt(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-center font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-550 block">หน่วยนับ</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-700"
                  >
                    <option value="กล่อง">กล่อง</option>
                    <option value="ขวด">ขวด</option>
                    <option value="แผง">แผง</option>
                    <option value="กระปุก">กระปุก</option>
                    <option value="อัน">อัน</option>
                    <option value="ชิ้น">ชิ้น</option>
                    <option value="แกลลอน">แกลลอน</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 block">วันหมดอายุ (Expiry Date, กำจัดได้กี่วันก็ได้)</label>
                <input
                  type="date"
                  value={newExpiry}
                  onChange={(e) => setNewExpiry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-slate-700"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-250 text-slate-650 font-bold rounded-xl transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-all shadow-md shadow-rose-100 flex items-center justify-center gap-1.5"
                >
                  <Save size={18} />
                  <span>บันทึกข้อมูลทั่วไป</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: QUICK ADJUST STOCK (RECEIVE/ISSUE) -------------------- */}
      {isAdjustModalOpen && adjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-850">
                {adjustType === 'RECEIVE' ? 'รับเข้า (Receive)' : 'เบิกจ่าย (Issue)'}: {adjustItem.name}
              </h3>
              <button 
                onClick={() => {
                  setIsAdjustModalOpen(false);
                  setAdjustItem(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleQuickAdjust} className="p-6 space-y-4">
              <div className="p-3 bg-indigo-50/60 text-slate-700 rounded-xl border border-indigo-100 text-sm">
                ยอดคงเหลือปัจจุบัน: <strong className="text-indigo-600">{adjustItem.quantity} {adjustItem.unit}</strong>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 block">จำนวนที่ต้องการปรับปรุง</label>
                <div className="flex items-center">
                  <button 
                    type="button"
                    onClick={() => setAdjustQty(Math.max(1, adjustQty - 1))}
                    className="w-12 h-12 flex justify-center items-center bg-slate-100 text-slate-600 rounded-l-xl hover:bg-slate-200 active:bg-slate-300 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(parseInt(e.target.value) || 1)}
                    onFocus={(e) => e.target.select()}
                    className="w-full text-center bg-slate-50 border-y border-slate-200 text-slate-800 px-4 py-2.5 focus:outline-none font-bold text-lg h-12"
                  />
                  <button 
                    type="button"
                    onClick={() => setAdjustQty(adjustQty + 1)}
                    className="w-12 h-12 flex justify-center items-center bg-slate-100 text-slate-600 rounded-r-xl hover:bg-slate-200 active:bg-slate-300 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {adjustType === 'RECEIVE' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-550 block">วันหมดอายุล็อตนี้</label>
                  <input
                    type="date"
                    value={adjustExpiry}
                    onChange={(e) => setAdjustExpiry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
                  />
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdjustModalOpen(false);
                    setAdjustItem(null);
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 text-white font-bold rounded-xl transition-all shadow-md ${
                    adjustType === 'RECEIVE' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-100'
                  }`}
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: DIRECT EDIT QUANTITY -------------------- */}
      {isDirectEditModalOpen && directEditItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-850">แก้ไขยอดคงเหลือ</h3>
              <button 
                onClick={() => {
                  setIsDirectEditModalOpen(false);
                  setDirectEditItem(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleDirectEdit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 block">รายการสินค้า</label>
                <div className="p-3 bg-slate-50 text-slate-700 rounded-xl border border-slate-100 text-sm font-bold">
                  {directEditItem.name} 
                  <span className="text-slate-400 font-normal ml-2">({directEditItem.id})</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-550 block">ยอดคงเหลือสุทธิ (แก้ไขโดยตรง)</label>
                <div className="flex items-center relative">
                  <input
                    type="number"
                    min="0"
                    required
                    value={directEditQty}
                    onChange={(e) => setDirectEditQty(parseInt(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    className="w-full text-center bg-white border border-slate-200 focus:border-indigo-500 text-slate-800 px-4 py-3 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-xl transition-all"
                  />
                  <span className="absolute right-4 text-slate-400 font-semibold">{directEditItem.unit}</span>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDirectEditModalOpen(false);
                    setDirectEditItem(null);
                  }}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl transition-all hover:bg-slate-200 active:bg-slate-300"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-200 hover:bg-indigo-700 active:bg-indigo-800 flex justify-center items-center gap-2"
                >
                  <Save size={18} />
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
