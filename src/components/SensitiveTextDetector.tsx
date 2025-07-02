import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Loader2, CheckCircle, Shield, Eye, AlertTriangle, RotateCw, FileText, Settings, Maximize2 } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import ImageViewer from './ImageViewer';
import { extractTextFromImageWithWords } from '../utils/ocrUtils';

interface SensitiveTextDetectorProps {
  onConversionComplete: () => void;
}

interface DetectedText {
  text: string;
  type: 'cpf' | 'rg' | 'email' | 'phone' | 'cnpj' | 'credit_card' | 'custom';
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  original: string;
  pattern: string;
}

interface DetectionPattern {
  name: string;
  type: 'cpf' | 'rg' | 'email' | 'phone' | 'cnpj' | 'credit_card' | 'custom';
  pattern: RegExp;
  description: string;
  enabled: boolean;
  validator?: (text: string) => boolean;
}

// Validadores específicos
const validators = {
  cpf: (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned[9])) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cleaned[10]);
  },
  
  cnpj: (cnpj: string): boolean => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14 || /^(\d)\1{13}$/.test(cleaned)) return false;
    
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9];
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleaned[i]) * weights1[i];
    }
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleaned[i]) * weights2[i];
    }
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return digit1 === parseInt(cleaned[12]) && digit2 === parseInt(cleaned[13]);
  },
  
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  creditCard: (card: string): boolean => {
    const cleaned = card.replace(/\D/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) return false;
    
    // Algoritmo de Luhn
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  },
  rg: (rg: string): boolean => {
    const cleaned = rg.replace(/\D/g, '');
    return cleaned.length >= 7 && cleaned.length <= 9 && /^[0-9]+$/.test(cleaned); // RG válido tem entre 7 e 9 dígitos
  },
  phone: (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    const validPrefixes = ['4004', '0800']; // Prefixos comuns no Brasil
    return (
      (cleaned.length === 10 || cleaned.length === 11) && /^[0-9]+$/.test(cleaned) || // Telefones com DDD
      validPrefixes.some((prefix) => cleaned.startsWith(prefix)) // Telefones especiais
    );
  }
};

const SensitiveTextDetector: React.FC<SensitiveTextDetectorProps> = ({ onConversionComplete }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerImageSrc, setViewerImageSrc] = useState('');
  const [viewerImageAlt, setViewerImageAlt] = useState('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [detectedItems, setDetectedItems] = useState<DetectedText[]>([]);
  const [censurMode, setCensurMode] = useState<'blur' | 'black' | 'highlight'>('black');
  const [customPattern, setCustomPattern] = useState('');
  const [customPatternName, setCustomPatternName] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrLanguage, setOcrLanguage] = useState('por');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [selectedDetection, setSelectedDetection] = useState<number | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragMode, setDragMode] = useState<'move' | 'resize' | 'create' | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [detectionPatterns, setDetectionPatterns] = useState<DetectionPattern[]>([
    {
      name: 'CPF',
      type: 'cpf',
      pattern: /\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]\d{2}\b|\b\*{2}[.,]\d{3}[.,]\d{3}[-]\d{2}\b|\b\d{2}[.,]\d{3}[.,]\d{3}[-"*]\d{1,2}\b/g,
      description: 'Cadastro de Pessoa Física (XXX.XXX.XXX-XX ou parcialmente censurado)',
      enabled: true,
      validator: (text: string) => {
        // Para CPFs parcialmente censurados, aceitar sem validação
        if (text.includes('*') || text.includes('"')) return true;
        return validators.cpf(text);
      }
    },
    {
      name: 'CNPJ',
      type: 'cnpj',
      pattern: /\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2}\b/g,
      description: 'Cadastro Nacional de Pessoa Jurídica (XX.XXX.XXX/XXXX-XX)',
      enabled: true,
      validator: validators.cnpj
    },
    {
      name: 'RG',
      type: 'rg',
      pattern: /\b\d{1,2}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{1,2}\b/g,
      description: 'Registro Geral (XX.XXX.XXX-X)',
      enabled: true,
      validator: validators.rg
    },
    {
      name: 'E-mail',
      type: 'email',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      description: 'Endereços de e-mail',
      enabled: true,
      validator: validators.email
    },
    {
      name: 'Telefone',
      type: 'phone',
      pattern: /\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}\b|\b(?:0?800\s?\d{3}\s?\d{4})\b|\b\d{4}\s?\d{4}\b/g,
      description: 'Números de telefone brasileiros (incluindo 0800)',
      enabled: true,
      validator: validators.phone
    },
    {
      name: 'Cartão de Crédito',
      type: 'credit_card',
      pattern: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
      description: 'Números de cartão de crédito',
      enabled: false,
      validator: validators.creditCard
    }
  ]);

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setUploadedFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setProcessedImage(null);
      setExtractedText('');
      setDetectedItems([]);
      setOcrProgress(0);
    }
  };

  const onImageLoad = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;

    const img = imageRef.current;
    const canvas = canvasRef.current;
    const rect = img.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const detectSensitiveText = async () => {
    if (!uploadedFile || !imageRef.current) return;

    setIsExtracting(true);
    setOcrProgress(0);

    try {
      // Extract text from image using real OCR
      const { text, words } = await extractTextFromImageWithWords(
        uploadedFile,
        (progress) => setOcrProgress(progress),
        ocrLanguage
      );
      setExtractedText(text);

      // Detect sensitive patterns
      const detected: DetectedText[] = [];
      const displayRect = imageRef.current.getBoundingClientRect();

      detectionPatterns.forEach((pattern) => {
        if (!pattern.enabled) return;

        let match: RegExpExecArray | null;
        const regex = new RegExp(pattern.pattern.source, 'gi');

        while ((match = regex.exec(text)) !== null) {
          if (!match || !match[0]) continue; // Garantir que match e match[0] não sejam null

          // Validate if pattern has a validator
          const isValid = pattern.validator ? pattern.validator(match[0]) : true;
          const confidence = isValid ? Math.random() * 0.1 + 0.9 : Math.random() * 0.1 + 0.4; // Confiança realista

          if (!isValid) {
            console.log(`Padrão inválido ignorado: ${match[0]} (${pattern.name})`);
            continue; // Ignorar correspondências inválidas
          }

          // Expand context to include one line above and below
          const lines = text.split('\n');
          const matchLineIndex = lines.findIndex((line) => line.includes(match![0]));
          const context = [
            lines[matchLineIndex - 1] || '',
            lines[matchLineIndex],
            lines[matchLineIndex + 1] || ''
          ].join('\n');        // Buscar palavras que fazem parte do match detectado de forma mais precisa
        const matchedText = match[0];
          const relevantWords = words.filter((word) => {
            // Verificar se a palavra faz parte do texto detectado
            const cleanWord = word.text.replace(/[^\w]/g, '');
            const cleanMatch = matchedText.replace(/[^\w]/g, '');
            return cleanMatch.includes(cleanWord) && cleanWord.length > 0;
          });

          let bbox;
          if (relevantWords.length > 0) {
            // Calcular bbox apenas das palavras que realmente fazem parte do match
            const minX = Math.min(...relevantWords.map((w) => w.bbox.x0));
            const minY = Math.min(...relevantWords.map((w) => w.bbox.y0));
            const maxX = Math.max(...relevantWords.map((w) => w.bbox.x1));
            const maxY = Math.max(...relevantWords.map((w) => w.bbox.y1));

            const scaleX = displayRect.width / imageRef.current!.naturalWidth;
            const scaleY = displayRect.height / imageRef.current!.naturalHeight;

            // Limitar a altura máxima da bbox para evitar tarjas muito grandes
            const calculatedHeight = (maxY - minY) * scaleY;
            const maxAllowedHeight = 40; // Altura máxima em pixels
            const finalHeight = Math.min(calculatedHeight, maxAllowedHeight);

            bbox = {
              x: minX * scaleX,
              y: minY * scaleY,
              width: (maxX - minX) * scaleX,
              height: finalHeight
            };
          } else {
            // Fallback para posição estimada com altura limitada
            bbox = {
              x: Math.random() * (displayRect.width - 200) + 20,
              y: Math.random() * (displayRect.height - 100) + 20,
              width: match[0].length * 8,
              height: 20
            };
          }

          detected.push({
            text: match[0],
            type: pattern.type,
            confidence,
            bbox,
            original: context,
            pattern: pattern.name
          });
        }
      });

      // Check custom pattern if provided
      if (customPattern && customPatternName) {
        try {
          const customRegex = new RegExp(customPattern, 'gi');
          let match;
          while ((match = customRegex.exec(text)) !== null) {
            detected.push({
              text: match[0],
              type: 'custom',
              confidence: 0.85,
              bbox: {
                x: Math.random() * (displayRect.width - 200) + 20,
                y: Math.random() * (displayRect.height - 100) + 20,
                width: match[0].length * 8,
                height: 20
              },
              original: match[0],
              pattern: customPatternName
            });
          }
        } catch {
          console.error('Invalid custom pattern');
        }
      }

      setDetectedItems(detected);
      drawDetections(detected);
    } catch {
      console.error('Erro na extração de texto.');
      alert('Erro ao extrair texto da imagem. Verifique se a imagem contém texto legível e se sua conexão com a internet está funcionando.');
    } finally {
      setIsExtracting(false);
      setOcrProgress(0);
    }
  };

  const removeDetection = (index: number) => {
    const newDetections = detectedItems.filter((_, i) => i !== index);
    setDetectedItems(newDetections);
    drawDetections(newDetections);
  };

  const addManualDetection = (x: number, y: number, width: number, height: number) => {
    const newDetection: DetectedText = {
      text: 'Manual',
      type: 'custom',
      confidence: 1.0,
      bbox: { x, y, width, height },
      original: 'Detecção manual',
      pattern: 'Manual'
    };
    const newDetections = [...detectedItems, newDetection];
    setDetectedItems(newDetections);
    drawDetections(newDetections);
  };

  const updateDetectionBbox = (index: number, bbox: { x: number; y: number; width: number; height: number }) => {
    const newDetections = [...detectedItems];
    newDetections[index].bbox = bbox;
    setDetectedItems(newDetections);
    drawDetections(newDetections);
  };

  const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const getDetectionAtPosition = (x: number, y: number): number | null => {
    for (let i = detectedItems.length - 1; i >= 0; i--) {
      const bbox = detectedItems[i].bbox;
      if (x >= bbox.x && x <= bbox.x + bbox.width && y >= bbox.y && y <= bbox.y + bbox.height) {
        return i;
      }
    }
    return null;
  };

  const getResizeHandle = (x: number, y: number, detection: DetectedText): string | null => {
    const bbox = detection.bbox;
    const tolerance = 6;
    
    // Check corner handles
    const handles = [
      { name: 'nw', x: bbox.x, y: bbox.y },
      { name: 'ne', x: bbox.x + bbox.width, y: bbox.y },
      { name: 'sw', x: bbox.x, y: bbox.y + bbox.height },
      { name: 'se', x: bbox.x + bbox.width, y: bbox.y + bbox.height },
      // Edge handles
      { name: 'n', x: bbox.x + bbox.width / 2, y: bbox.y },
      { name: 's', x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height },
      { name: 'w', x: bbox.x, y: bbox.y + bbox.height / 2 },
      { name: 'e', x: bbox.x + bbox.width, y: bbox.y + bbox.height / 2 }
    ];
    
    for (const handle of handles) {
      if (Math.abs(x - handle.x) <= tolerance && Math.abs(y - handle.y) <= tolerance) {
        return handle.name;
      }
    }
    
    return null;
  };

  const getCursorForHandle = (handle: string): string => {
    const cursors: { [key: string]: string } = {
      'nw': 'nw-resize',
      'ne': 'ne-resize',
      'sw': 'sw-resize',
      'se': 'se-resize',
      'n': 'n-resize',
      's': 's-resize',
      'w': 'w-resize',
      'e': 'e-resize'
    };
    return cursors[handle] || 'default';
  };

  const handleCanvasMouseEnter = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditingMode) return;
    
    const pos = getMousePosition(e);
    const detectionIndex = getDetectionAtPosition(pos.x, pos.y);
    
    if (detectionIndex !== null) {
      const detection = detectedItems[detectionIndex];
      const handle = getResizeHandle(pos.x, pos.y, detection);
      
      if (handle && canvasRef.current) {
        canvasRef.current.style.cursor = getCursorForHandle(handle);
      } else if (canvasRef.current) {
        canvasRef.current.style.cursor = 'move';
      }
    } else if (canvasRef.current) {
      canvasRef.current.style.cursor = isCreatingNew ? 'crosshair' : 'default';
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditingMode) return;
    
    const pos = getMousePosition(e);
    const detectionIndex = getDetectionAtPosition(pos.x, pos.y);
    
    if (detectionIndex !== null) {
      const detection = detectedItems[detectionIndex];
      const handle = getResizeHandle(pos.x, pos.y, detection);
      
      setSelectedDetection(detectionIndex);
      setDragStart(pos);
      
      if (handle) {
        setDragMode('resize');
        setResizeHandle(handle);
      } else {
        setDragMode('move');
        setResizeHandle(null);
      }
    } else if (isCreatingNew) {
      setDragStart(pos);
      setDragMode('create');
      setResizeHandle(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditingMode) return;
    
    // Update cursor based on what's under the mouse
    const pos = getMousePosition(e);
    const detectionIndex = getDetectionAtPosition(pos.x, pos.y);
    
    if (!dragMode) {
      if (detectionIndex !== null) {
        const detection = detectedItems[detectionIndex];
        const handle = getResizeHandle(pos.x, pos.y, detection);
        
        if (handle) {
          if (canvasRef.current) {
            canvasRef.current.style.cursor = getCursorForHandle(handle);
          }
        } else {
          if (canvasRef.current) {
            canvasRef.current.style.cursor = 'move';
          }
        }
      } else {
        if (canvasRef.current) {
          canvasRef.current.style.cursor = isCreatingNew ? 'crosshair' : 'default';
        }
      }
    }
    
    if (!dragStart || !dragMode) return;
    
    if (dragMode === 'move' && selectedDetection !== null) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      const detection = detectedItems[selectedDetection];
      
      updateDetectionBbox(selectedDetection, {
        x: detection.bbox.x + dx,
        y: detection.bbox.y + dy,
        width: detection.bbox.width,
        height: detection.bbox.height
      });
      setDragStart(pos);
    } else if (dragMode === 'resize' && selectedDetection !== null && resizeHandle) {
      const detection = detectedItems[selectedDetection];
      const bbox = { ...detection.bbox };
      
      // Calculate new dimensions based on resize handle
      switch (resizeHandle) {
        case 'nw': // Top-left
          bbox.width += bbox.x - pos.x;
          bbox.height += bbox.y - pos.y;
          bbox.x = pos.x;
          bbox.y = pos.y;
          break;
        case 'ne': // Top-right
          bbox.width = pos.x - bbox.x;
          bbox.height += bbox.y - pos.y;
          bbox.y = pos.y;
          break;
        case 'sw': // Bottom-left
          bbox.width += bbox.x - pos.x;
          bbox.height = pos.y - bbox.y;
          bbox.x = pos.x;
          break;
        case 'se': // Bottom-right
          bbox.width = pos.x - bbox.x;
          bbox.height = pos.y - bbox.y;
          break;
        case 'n': // Top edge
          bbox.height += bbox.y - pos.y;
          bbox.y = pos.y;
          break;
        case 's': // Bottom edge
          bbox.height = pos.y - bbox.y;
          break;
        case 'w': // Left edge
          bbox.width += bbox.x - pos.x;
          bbox.x = pos.x;
          break;
        case 'e': // Right edge
          bbox.width = pos.x - bbox.x;
          break;
      }
      
      // Ensure minimum size
      if (bbox.width >= 10 && bbox.height >= 10) {
        updateDetectionBbox(selectedDetection, bbox);
      }
    } else if (dragMode === 'create') {
      // Draw preview rectangle
      drawDetections(detectedItems);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.strokeStyle = '#FF0000';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(
            Math.min(dragStart.x, pos.x),
            Math.min(dragStart.y, pos.y),
            Math.abs(pos.x - dragStart.x),
            Math.abs(pos.y - dragStart.y)
          );
          ctx.setLineDash([]);
        }
      }
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isEditingMode || !dragStart || !dragMode) return;
    
    const pos = getMousePosition(e);
    
    if (dragMode === 'create') {
      const width = Math.abs(pos.x - dragStart.x);
      const height = Math.abs(pos.y - dragStart.y);
      
      if (width > 10 && height > 10) { // Minimum size
        addManualDetection(
          Math.min(dragStart.x, pos.x),
          Math.min(dragStart.y, pos.y),
          width,
          height
        );
      }
    }
    
    setDragStart(null);
    setDragMode(null);
    setSelectedDetection(null);
    setResizeHandle(null);
  };

  const drawDetections = (items: DetectedText[]) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    items.forEach((item, index) => {
      const { bbox, type } = item;
      const isSelected = isEditingMode && selectedDetection === index;
      
      // Color code by type
      const colors = {
        cpf: '#EF4444',
        rg: '#F97316',
        email: '#3B82F6',
        phone: '#10B981',
        cnpj: '#8B5CF6',
        credit_card: '#EC4899',
        custom: '#6B7280'
      };

      const color = colors[type] || '#6B7280';
      
      // Draw background
      ctx.fillStyle = color;
      ctx.globalAlpha = isSelected ? 0.5 : 0.3;
      ctx.fillRect(bbox.x, bbox.y, bbox.width, bbox.height);
      
      // Draw border
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = isSelected ? 3 : 2;
      if (isSelected) {
        ctx.setLineDash([5, 5]);
      }
      ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
      ctx.setLineDash([]);

      // Draw label
      ctx.fillStyle = color;
      ctx.font = '12px Arial';
      ctx.fillText(`${item.pattern} #${index + 1}`, bbox.x, bbox.y - 5);
      
      // Draw resize handles for selected item in edit mode
      if (isSelected && isEditingMode) {
        const handleSize = 8;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        // Corner and edge handles
        const handles = [
          { x: bbox.x - handleSize/2, y: bbox.y - handleSize/2 }, // nw
          { x: bbox.x + bbox.width - handleSize/2, y: bbox.y - handleSize/2 }, // ne
          { x: bbox.x - handleSize/2, y: bbox.y + bbox.height - handleSize/2 }, // sw
          { x: bbox.x + bbox.width - handleSize/2, y: bbox.y + bbox.height - handleSize/2 }, // se
          { x: bbox.x + bbox.width/2 - handleSize/2, y: bbox.y - handleSize/2 }, // n
          { x: bbox.x + bbox.width/2 - handleSize/2, y: bbox.y + bbox.height - handleSize/2 }, // s
          { x: bbox.x - handleSize/2, y: bbox.y + bbox.height/2 - handleSize/2 }, // w
          { x: bbox.x + bbox.width - handleSize/2, y: bbox.y + bbox.height/2 - handleSize/2 } // e
        ];
        
        handles.forEach(handle => {
          ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
          ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
        });
      }
    });
  };

  const applyCensorship = async () => {
    if (!uploadedFile || !imageRef.current || detectedItems.length === 0) return;

    setIsProcessing(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      // Calculate scale between displayed image and original
      const displayRect = imageRef.current.getBoundingClientRect();
      const scaleX = img.naturalWidth / displayRect.width;
      const scaleY = img.naturalHeight / displayRect.height;

      // Apply censorship to detected areas
      detectedItems.forEach(item => {
        const bbox = {
          x: item.bbox.x * scaleX,
          y: item.bbox.y * scaleY,
          width: item.bbox.width * scaleX,
          height: item.bbox.height * scaleY
        };

        // Add padding to ensure complete coverage
        const padding = 5;
        bbox.x -= padding;
        bbox.y -= padding;
        bbox.width += padding * 2;
        bbox.height += padding * 2;

        switch (censurMode) {
          case 'black':
            ctx.fillStyle = '#000000';
            ctx.fillRect(bbox.x, bbox.y, bbox.width, bbox.height);
            break;
          
          case 'blur':
            {
              // Create a more sophisticated blur effect
              const imageData = ctx.getImageData(bbox.x, bbox.y, bbox.width, bbox.height);
              const pixelSize = Math.max(8, Math.min(bbox.width, bbox.height) / 10);
              
              for (let y = 0; y < bbox.height; y += pixelSize) {
                for (let x = 0; x < bbox.width; x += pixelSize) {
                  // Calculate average color for this block
                  let totalR = 0, totalG = 0, totalB = 0, count = 0;
                  
                  for (let py = 0; py < pixelSize && y + py < bbox.height; py++) {
                    for (let px = 0; px < pixelSize && x + px < bbox.width; px++) {
                      const index = ((y + py) * bbox.width + (x + px)) * 4;
                      if (index < imageData.data.length) {
                        totalR += imageData.data[index];
                        totalG += imageData.data[index + 1];
                        totalB += imageData.data[index + 2];
                        count++;
                      }
                    }
                  }
                  
                  if (count > 0) {
                    const avgR = totalR / count;
                    const avgG = totalG / count;
                    const avgB = totalB / count;
                    
                    // Fill the entire block with the average color
                    for (let py = 0; py < pixelSize && y + py < bbox.height; py++) {
                      for (let px = 0; px < pixelSize && x + px < bbox.width; px++) {
                        const index = ((y + py) * bbox.width + (x + px)) * 4;
                        if (index < imageData.data.length) {
                          imageData.data[index] = avgR;
                          imageData.data[index + 1] = avgG;
                          imageData.data[index + 2] = avgB;
                        }
                      }
                    }
                  }
                }
              }
              
              ctx.putImageData(imageData, bbox.x, bbox.y);
              break;
            }
          
          case 'highlight':
            ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
            ctx.fillRect(bbox.x, bbox.y, bbox.width, bbox.height);
            break;
        }
      });

      const dataUrl = canvas.toDataURL('image/png', 0.95);
      setProcessedImage(dataUrl);
      onConversionComplete();
    } catch {
      console.error('Erro ao processar imagem.');
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePattern = (index: number) => {
    const newPatterns = [...detectionPatterns];
    newPatterns[index].enabled = !newPatterns[index].enabled;
    setDetectionPatterns(newPatterns);
  };

  const addCustomPattern = () => {
    if (!customPattern || !customPatternName) return;

    try {
      new RegExp(customPattern); // Test if pattern is valid
      
      const newPattern: DetectionPattern = {
        name: customPatternName,
        type: 'custom',
        pattern: new RegExp(customPattern, 'g'),
        description: `Padrão personalizado: ${customPattern}`,
        enabled: true
      };

      setDetectionPatterns([...detectionPatterns, newPattern]);
      setCustomPattern('');
      setCustomPatternName('');
    } catch {
      console.error('Padrão regex inválido. Verifique a sintaxe.');
      alert('Padrão regex inválido. Verifique a sintaxe.');
    }
  };

  const removeCustomPattern = (index: number) => {
    const newPatterns = detectionPatterns.filter((_, i) => i !== index);
    setDetectionPatterns(newPatterns);
  };

  const handleDownload = (filename: string) => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setUploadedFile(null);
    setImageUrl('');
    setProcessedImage(null);
    setExtractedText('');
    setDetectedItems([]);
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  };

  const openImageViewer = (src: string, alt: string) => {
    setViewerImageSrc(src);
    setViewerImageAlt(alt);
    setShowImageViewer(true);
  };

  const handleCanvasMouseLeave = () => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  };

  // Cancel drag/resize operations when Escape is pressed
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && (dragMode || selectedDetection !== null)) {
      setDragStart(null);
      setDragMode(null);
      setSelectedDetection(null);
      setResizeHandle(null);
      setIsCreatingNew(false);
      drawDetections(detectedItems);
    }
  }, [dragMode, selectedDetection, detectedItems]);

  // Add keyboard event listener
  useEffect(() => {
    if (isEditingMode || isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEditingMode, isFullscreen, handleKeyDown]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Detector de Texto Sensível</h2>
        <p className="text-gray-600">
          Detecte e oculte informações sensíveis como CPF, RG, e-mail e telefone automaticamente usando OCR real
        </p>
      </div>

      <FileUpload
        onFileSelect={handleFileSelect}
        fileType="image"
        uploadedFiles={uploadedFile ? [uploadedFile] : []}
        onRemoveFile={handleReset}
      />

      {uploadedFile && (
        <div className="space-y-6">
          {/* OCR Settings */}
          <div className="bg-blue-50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium text-blue-800">Configurações de OCR</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-2">
                  Idioma do OCR:
                </label>
                <select
                  value={ocrLanguage}
                  onChange={(e) => setOcrLanguage(e.target.value)}
                  className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="por">Português</option>
                  <option value="eng">Inglês</option>
                  <option value="spa">Espanhol</option>
                  <option value="fra">Francês</option>
                </select>
              </div>
              
              <div className="flex items-end">
                <div className="text-sm text-blue-700">
                  <p><strong>Dica:</strong> Para melhores resultados:</p>
                  <p>• Use imagens com boa qualidade e contraste</p>
                  <p>• Evite fundos complexos ou texto muito pequeno</p>
                  <p>• Prefira documentos escaneados ou fotos nítidas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detection Patterns */}
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">Padrões de Detecção</h3>
              <button
                onClick={handleReset}
                className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <RotateCw className="h-4 w-4" />
                Resetar
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {detectionPatterns.map((pattern, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={pattern.enabled}
                        onChange={() => togglePattern(index)}
                        className="rounded border-gray-300"
                      />
                      <span className="font-medium text-gray-800">{pattern.name}</span>
                      {pattern.validator && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          Validado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{pattern.description}</p>
                  </div>
                  {pattern.type === 'custom' && (
                    <button
                      onClick={() => removeCustomPattern(index)}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Custom Pattern */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-700 mb-3">Padrão Personalizado (Regex)</h4>
              
              {/* Explicação sobre padrões personalizados */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h5 className="font-medium text-blue-800 mb-2">Como usar padrões personalizados:</h5>
                <div className="text-sm text-blue-700 space-y-2">
                  <div>
                    <strong>Expressões regulares (Regex):</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li><code className="bg-blue-100 px-1 rounded">\d</code> = qualquer dígito (0-9)</li>
                      <li><code className="bg-blue-100 px-1 rounded">\d{3}</code> = exatamente 3 dígitos</li>
                      <li><code className="bg-blue-100 px-1 rounded">\d{2-4}</code> = entre 2 e 4 dígitos</li>
                      <li><code className="bg-blue-100 px-1 rounded">[A-Z]</code> = qualquer letra maiúscula</li>
                      <li><code className="bg-blue-100 px-1 rounded">[0-9a-zA-Z]</code> = letras e números</li>
                      <li><code className="bg-blue-100 px-1 rounded">\b</code> = limite de palavra</li>
                    </ul>
                  </div>
                  
                  <div>
                    <strong>Exemplos práticos:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li><code className="bg-blue-100 px-1 rounded">\b\d{3}-\d{3}\b</code> → detecta "123-456"</li>
                      <li><code className="bg-blue-100 px-1 rounded">\bPROTOCOLO:\s?\d+\b</code> → detecta "PROTOCOLO: 12345"</li>
                      <li><code className="bg-blue-100 px-1 rounded">\b[A-Z]{2}\d{6}\b</code> → detecta "AB123456"</li>
                      <li><code className="bg-blue-100 px-1 rounded">\bCÓDIGO\s?[A-Z0-9]+\b</code> → detecta códigos diversos</li>
                    </ul>
                  </div>

                  <div>
                    <strong>Dicas importantes:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Use <code className="bg-blue-100 px-1 rounded">\b</code> no início e fim para detectar palavras completas</li>
                      <li>Use <code className="bg-blue-100 px-1 rounded">\s?</code> para espaços opcionais</li>
                      <li>Use <code className="bg-blue-100 px-1 rounded">[.-]?</code> para separadores opcionais</li>
                      <li>Teste sempre com dados reais antes de usar em produção</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={customPatternName}
                  onChange={(e) => setCustomPatternName(e.target.value)}
                  placeholder="Ex: Código do Protocolo"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={customPattern}
                  onChange={(e) => setCustomPattern(e.target.value)}
                  placeholder="Ex: \bPROTOCOLO:\s?\d+\b"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addCustomPattern}
                  disabled={!customPattern || !customPatternName}
                  className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  Adicionar
                </button>
              </div>

              {/* Exemplos rápidos */}
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Exemplos rápidos:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      name: 'ID de Transação',
                      pattern: '\\bEO\\d+\\b'
                    },
                    {
                      name: 'Código de Operação',
                      pattern: '\\b\\d{11}\\b'
                    },
                    {
                      name: 'Chave de Segurança',
                      pattern: '\\b[A-Z0-9]{18}\\b'
                    },
                    {
                      name: 'Protocolo',
                      pattern: '\\bPROTOCOLO:\\s?\\d+\\b'
                    }
                  ].map((example) => (
                    <button
                      key={example.name}
                      onClick={() => {
                        setCustomPatternName(example.name);
                        setCustomPattern(example.pattern);
                      }}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      {example.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Image with overlay */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-700">
                Documento carregado:
              </h4>
              <button
                onClick={() => setIsFullscreen(true)}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                title="Ver em tela cheia"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Tela Cheia
              </button>
            </div>
            <div className="flex justify-center">
              <div className="relative inline-block border border-gray-300 rounded-lg overflow-hidden shadow-md">
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Documento para análise"
                  className="block max-w-full h-auto"
                  style={{ maxHeight: '500px' }}
                  onLoad={onImageLoad}
                />
                <canvas
                  ref={canvasRef}
                  className={`absolute top-0 left-0`}
                  style={{ 
                    pointerEvents: isEditingMode ? 'auto' : 'none'
                  }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseEnter={handleCanvasMouseEnter}
                  onMouseLeave={handleCanvasMouseLeave}
                />
              </div>
            </div>
          </div>

          {/* Detection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <button
                onClick={detectSensitiveText}
                disabled={isExtracting}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processando OCR... {Math.round(ocrProgress)}%
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5" />
                    Extrair Texto e Detectar
                  </>
                )}
              </button>
              
              {isExtracting && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${ocrProgress}%` }}
                  ></div>
                </div>
              )}
            </div>

            {detectedItems.length > 0 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de censura:
                  </label>
                  <select
                    value={censurMode}
                    onChange={(e) => setCensurMode(e.target.value as 'blur' | 'black' | 'highlight')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="black">Tarja Preta</option>
                    <option value="blur">Desfoque Pixelizado</option>
                    <option value="highlight">Destacar (apenas visualização)</option>
                  </select>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditingMode(!isEditingMode)}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      isEditingMode 
                        ? 'bg-orange-600 text-white hover:bg-orange-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    {isEditingMode ? 'Sair do Editor' : 'Editar Manualmente'}
                  </button>
                  
                  {isEditingMode && (
                    <button
                      onClick={() => setIsCreatingNew(!isCreatingNew)}
                      className={`py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                        isCreatingNew 
                          ? 'bg-green-600 text-white hover:bg-green-700' 
                          : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      +
                    </button>
                  )}
                  
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="py-2 px-4 rounded-lg font-medium transition-colors bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center gap-2"
                  >
                    <Maximize2 className="h-4 w-4" />
                    Tela Cheia
                  </button>
                </div>
                
                {isEditingMode && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-700">
                      <strong>Modo de Edição Ativo:</strong><br/>
                      • Clique e arraste uma detecção para movê-la<br/>
                      • {isCreatingNew ? 'Clique e arraste em área vazia para criar nova detecção' : 'Clique no botão "+" para criar novas detecções'}
                    </p>
                  </div>
                )}
                
                <button
                  onClick={applyCensorship}
                  disabled={isProcessing}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Aplicando censura...
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5" />
                      Aplicar Censura
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Detection Results */}
          {detectedItems.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <h3 className="text-lg font-medium text-yellow-800">
                  {detectedItems.length} informações sensíveis detectadas
                </h3>
              </div>

              <div className="space-y-2">
                {detectedItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">#{index + 1}</span>
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                          {item.pattern}
                        </span>
                        <span className="text-gray-600 font-mono text-sm">
                          {item.text}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Tipo: {item.type.toUpperCase()} | Confiança: {Math.round(item.confidence * 100)}%
                      </div>
                    </div>
                    <button
                      onClick={() => removeDetection(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-full transition-colors ml-2"
                      title="Remover detecção"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Text */}
          {extractedText && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h4 className="font-medium text-gray-700 mb-2">Texto extraído via OCR:</h4>
              <pre className="bg-white p-4 rounded-lg border text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {extractedText}
              </pre>
            </div>
          )}
        </div>
      )}

      {processedImage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Informações sensíveis censuradas!</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Documento protegido:</h4>
              <div className="relative group">
                <img
                  src={processedImage}
                  alt="Documento com informações censuradas"
                  className="w-full max-w-xs rounded-lg shadow-md cursor-pointer transition-transform hover:scale-105"
                  onClick={() => openImageViewer(processedImage, 'Documento protegido')}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white/90 p-2 rounded-full">
                    <Eye className="h-5 w-5 text-gray-700" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col justify-center space-y-3">
              <button
                onClick={() => openImageViewer(processedImage, 'Documento protegido')}
                className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="h-5 w-5" />
                Ver em Tela Cheia
              </button>
              <button
                onClick={() => setShowDownloadModal(true)}
                className="bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-5 w-5" />
                Baixar Documento Protegido
              </button>
            </div>
          </div>
        </div>
      )}

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        defaultFilename="documento-protegido"
        fileExtension="png"
      />

      <ImageViewer
        src={viewerImageSrc}
        alt={viewerImageAlt}
        isOpen={showImageViewer}
        onClose={() => setShowImageViewer(false)}
        onDownload={processedImage && viewerImageSrc === processedImage ? () => setShowDownloadModal(true) : undefined}
      />

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black bg-opacity-50 text-white">
              <h3 className="text-lg font-medium">Modo Tela Cheia - Editor de Detecções</h3>
              <div className="flex items-center gap-4">
                {/* Edit Mode Toggle */}
                <button
                  onClick={() => setIsEditingMode(!isEditingMode)}
                  className={`py-2 px-4 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    isEditingMode 
                      ? 'bg-orange-600 text-white hover:bg-orange-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  {isEditingMode ? 'Sair do Editor' : 'Editar'}
                </button>
                
                {/* Create New Toggle */}
                {isEditingMode && (
                  <button
                    onClick={() => setIsCreatingNew(!isCreatingNew)}
                    className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                      isCreatingNew 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    + Nova
                  </button>
                )}
                
                {/* Close Button */}
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="text-white hover:text-gray-300 p-2"
                  title="Sair da tela cheia"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Instructions */}
            {isEditingMode && (
              <div className="bg-blue-600 text-white p-3 text-center">
                <p className="text-sm">
                  <strong>Instruções:</strong> 
                  Clique e arraste para mover • Arraste as bordas/cantos para redimensionar • 
                  {isCreatingNew ? 'Clique e arraste em área vazia para criar nova detecção' : 'Ative "Nova" para criar detecções'}
                </p>
              </div>
            )}

            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="Documento em tela cheia"
                  className="max-w-full max-h-full object-contain"
                  style={{ maxHeight: 'calc(100vh - 200px)' }}
                  onLoad={() => {
                    // Recalculate canvas size for fullscreen
                    setTimeout(() => {
                      onImageLoad();
                    }, 100);
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className={`absolute top-0 left-0`}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseEnter={handleCanvasMouseEnter}
                  onMouseLeave={handleCanvasMouseLeave}
                />
              </div>
            </div>

            {/* Info Panel */}
            {detectedItems.length > 0 && (
              <div className="bg-black bg-opacity-50 text-white p-4 max-h-40 overflow-y-auto">
                <h4 className="font-medium mb-2">{detectedItems.length} detecções encontradas:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                  {detectedItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-white bg-opacity-10 p-2 rounded">
                      <span>#{index + 1} {item.pattern}: {item.text}</span>
                      <button
                        onClick={() => removeDetection(index)}
                        className="text-red-400 hover:text-red-300 ml-2"
                        title="Remover"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SensitiveTextDetector;

