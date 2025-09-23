import React, { useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { Download, Loader2, CheckCircle, RefreshCw, FileText, Eye, Package } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';
import Tesseract from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface EtiquetaMLProps {
  onConversionComplete?: () => void;
}

interface ProcessedPDF {
  id: string;
  originalName: string;
  url: string;
  blob: Blob;
}

const defaultAdvancedConfig = {
  page1: { x: 121, y: 45, xScale: 1, yScale: 1 },
  page2: { x: 731, y: -16, xScale: 0.78, yScale: 0.78 },
};

function getInitialAdvancedConfig() {
  const saved = localStorage.getItem('etiquetaML_advancedConfig');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return defaultAdvancedConfig;
    }
  }
  return defaultAdvancedConfig;
}

const EtiquetaML: React.FC<EtiquetaMLProps> = ({ onConversionComplete }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processedPDFs, setProcessedPDFs] = useState<ProcessedPDF[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [downloadFilename, setDownloadFilename] = useState<string>('');
  const [advancedConfig, setAdvancedConfig] = useState(getInitialAdvancedConfig());
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewFullScreen, setPreviewFullScreen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [combinedPdfUrl, setCombinedPdfUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<{ file: string; date: number }[]>(() => {
    const saved = localStorage.getItem('etiquetaML_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyFilter, setHistoryFilter] = useState('');
  const [historyPageSize, setHistoryPageSize] = useState(10); // novo estado para quantidade por página
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const pageSize = 10;

  // --- NOVOS ESTADOS ---
  const [isCombining, setIsCombining] = useState(false);
  const [combineProgress, setCombineProgress] = useState(0);
  const [userMessage, setUserMessage] = useState<string | null>(null);
  // ---------------------

  // Alerta ao fechar a página se o OCR estiver rodando
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (ocrStatus) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [ocrStatus]);

  const handleFileSelect = (files: File[]) => {
    setUploadedFiles(files);
    setProcessedPDFs([]);
    setError(null);
    // Aviso de duplicidade
    if (files.length > 0) {
      const fileNames = files.map(f => f.name);
      const duplicates = fileNames.filter(name => history.some(h => h.file === name));
      if (duplicates.length > 0) {
        setDuplicateWarning(`Atenção: O(s) arquivo(s) ${duplicates.join(', ')} já existem no histórico!`);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    if (newFiles.length === 0) {
      setProcessedPDFs([]);
    }
  };

  React.useEffect(() => {
    localStorage.setItem('etiquetaML_advancedConfig', JSON.stringify(advancedConfig));
  }, [advancedConfig]);

  React.useEffect(() => {
    localStorage.setItem('etiquetaML_history', JSON.stringify(history));
  }, [history]);

  const handleAdvancedConfigChange = (page: 'page1' | 'page2', field: string, value: number) => {
    setAdvancedConfig((prev) => ({
      ...prev,
      [page]: { ...prev[page], [field]: value },
    }));
  };

  // Salva no histórico ao processar PDFs (sem OCR)
  const processSinglePDF = async (file: File, config = advancedConfig): Promise<ProcessedPDF> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    
    if (pdfDoc.getPageCount() < 2) {
      throw new Error(`${file.name}: PDF deve ter pelo menos 2 páginas`);
    }

    // Extrai as duas primeiras páginas
    const [page1, page2] = await pdfDoc.copyPages(pdfDoc, [0, 1]);
    const newPdf = await PDFDocument.create();
    
    // Página A4
    const width = 595.28; // A4 width pt
    const height = 841.89; // A4 height pt
    const newPage = newPdf.addPage([width, height]);
    
    // Primeiro: Coloca a segunda página (declaração) com config customizável
    const embeddedPage2 = await newPdf.embedPage(page2);
    newPage.drawPage(embeddedPage2, {
      x: width - (embeddedPage2.height * config.page2.xScale) + config.page2.x,
      y: height - (embeddedPage2.width * config.page2.yScale) + config.page2.y,
      xScale: config.page2.xScale,
      yScale: config.page2.yScale,
      rotate: degrees(90),
    });
    
    // Segundo: Coloca a primeira página (etiqueta) com config customizável
    const embeddedPage1 = await newPdf.embedPage(page1);
    newPage.drawPage(embeddedPage1, {
      x: embeddedPage1.height + config.page1.x,
      y: config.page1.y,
      xScale: config.page1.xScale,
      yScale: config.page1.yScale,
      rotate: degrees(90),
    });
    
    // Salva o PDF
    const pdfBytes = await newPdf.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // Salva no histórico apenas nome e data
    setHistory((prev) => [
      ...prev,
      { file: file.name, date: Date.now() }
    ]);

    return {
      id: `${Date.now()}-${Math.random()}`,
      originalName: file.name,
      url,
      blob
    };
  };

  const processAllPDFs = async () => {
    if (uploadedFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);
    
    try {
      const processed: ProcessedPDF[] = [];
      
      for (const file of uploadedFiles) {
        const processedPDF = await processSinglePDF(file);
        processed.push(processedPDF);
      }
      
      setProcessedPDFs(processed);
      
      if (onConversionComplete) {
        onConversionComplete();
      }
    } catch (err: unknown) {
      console.error('Erro ao processar PDFs:', err);
      setError(err instanceof Error ? err.message : 'Erro ao processar os PDFs. Verifique se todos os arquivos são válidos.');
    } finally {
      setIsProcessing(false);
    }
  };

  async function pdfPageToImage(pdfBlob: Blob): Promise<string> {
    try {
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      // Cria um canvas para a página original
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Não foi possível obter o contexto do canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: context, viewport }).promise;
      // Cria um novo canvas rotacionado 90 graus
      const rotatedCanvas = document.createElement('canvas');
      rotatedCanvas.width = canvas.height;
      rotatedCanvas.height = canvas.width;
      const rotatedContext = rotatedCanvas.getContext('2d');
      if (!rotatedContext) throw new Error('Não foi possível obter o contexto do canvas rotacionado');
      // Rotaciona 90 graus sentido horário
      rotatedContext.save();
      rotatedContext.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
      rotatedContext.rotate(90 * Math.PI / 180);
      rotatedContext.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
      rotatedContext.restore();
      const imageData = rotatedCanvas.toDataURL('image/jpeg', 0.85);
      return imageData;
    } catch (error) {
      console.error('Erro ao converter PDF para imagem:', error);
      return '';
    }
  }

  

  const combineAllPDFs = async (openAfterCombine = false, preOpenedWin?: Window | null) => {
    if (processedPDFs.length === 0) {
      setUserMessage('Nenhum PDF processado para combinar.');
      return;
    }
    setIsCombining(true);
    setCombineProgress(0);
    setUserMessage(null);
    try {
      const combinedPdf = await PDFDocument.create();
      for (let i = 0; i < processedPDFs.length; i++) {
        const processedPDF = processedPDFs[i];
        setCombineProgress(Math.round(((i) / processedPDFs.length) * 100));
        const arrayBuffer = await processedPDF.blob.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = await combinedPdf.copyPages(pdfDoc, [0]);
        pages.forEach(page => combinedPdf.addPage(page));
        // Não faz mais OCR nem histórico aqui
      }
      setCombineProgress(100);
      const pdfBytes = await combinedPdf.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setDownloadFilename('etiquetas-ml-combinadas');
      setCombinedPdfUrl(url);

      if (openAfterCombine) {
        if (preOpenedWin && !preOpenedWin.closed) {
          preOpenedWin.location.href = url;
        } else {
          const w = window.open(url, '_blank');
          if (!w) setUserMessage('Popup bloqueado. Libere popups para visualizar/imprimir.');
        }
      } else {
        setShowDownloadModal(true);
      }
    } catch (err) {
      console.error('Erro ao combinar PDFs:', err);
      setError('Erro ao combinar os PDFs.');
      setUserMessage('Falha ao combinar. Verifique os arquivos e tente novamente.');
    } finally {
      setIsCombining(false);
      setTimeout(() => setCombineProgress(0), 1200);
    }
  };

  const printAllCombined = async () => {
    if (processedPDFs.length === 0) {
      setUserMessage('Você precisa processar os PDFs antes de imprimir todos.');
      return;
    }
    // Se já existe combinado, abre diretamente (sem recriar)
    if (combinedPdfUrl) {
      const w = window.open(combinedPdfUrl, '_blank');
      if (!w) setUserMessage('Popup bloqueado. Libere popups para impressão.');
      return;
    }
    // Abre janela imediatamente (para não ser bloqueada)
    const preWin = window.open('', '_blank');
    if (!preWin) {
      setUserMessage('Popup bloqueado. Libere popups para impressão.');
      // ainda assim tenta combinar para disponibilizar download
      await combineAllPDFs(false);
      return;
    }
    // mostra mensagem temporária enquanto gera
    preWin.document.write('<html><head><title>Gerando...</title></head><body><p style="font-family: sans-serif;">Gerando PDF combinado, aguarde...</p></body></html>');
    await combineAllPDFs(true, preWin);
  };

  // Filtro e paginação do histórico
  const filteredHistory = history
    .filter(item =>
      item.file.toLowerCase().includes(historyFilter.toLowerCase())
    )
    .sort((a, b) => b.date - a.date);

  const totalPages = Math.ceil(filteredHistory.length / historyPageSize) || 1;
  const paginatedHistory = filteredHistory.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);

  const handleDeleteHistory = (idx: number) => {
    setHistory(prev => prev.filter((_, i) => i !== idx + (historyPage - 1) * historyPageSize));
  };

  const handleEditHistory = (idx: number) => {
    setEditIdx(idx);
    setEditValue(paginatedHistory[idx].file);
  };

  const handleSaveEditHistory = (idx: number) => {
    const globalIdx = (historyPage - 1) * historyPageSize + idx;
    setHistory(prev => prev.map((item, i) => i === globalIdx ? { ...item, file: editValue } : item));
    setEditIdx(null);
    setEditValue('');
  };

  const handleCancelEditHistory = () => {
    setEditIdx(null);
    setEditValue('');
  };

  const handleDownload = (filename: string) => {
    if (!downloadUrl) return;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowDownloadModal(false);
    setDownloadUrl('');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Etiqueta ML (Mercado Livre)</h2>
        <p className="text-gray-600">
          Otimize sua etiqueta do Mercado Livre para impressão em uma única folha A4
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Package className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-800 mb-1">Como funciona:</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Remove automaticamente a terceira página (não utilizada)</li>
              <li>• Mantém a etiqueta intacta na parte superior da folha</li>
              <li>• Coloca a declaração de conteúdo rotacionada na parte inferior</li>
              <li>• Resultado: uma folha A4 otimizada para impressão</li>
            </ul>
          </div>
        </div>
      </div>

      <FileUpload
        onFileSelect={handleFileSelect}
        fileType="pdf"
        uploadedFiles={uploadedFiles}
        onRemoveFile={handleRemoveFile}
        accept="application/pdf"
        maxSize={50 * 1024 * 1024} // 50MB
        multiple={true}
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <div className="bg-red-100 p-1 rounded-full">
              <FileText className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {uploadedFiles.length > 0 && processedPDFs.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-6">
          {uploadedFiles.map((file, idx) => {
            const isDuplicate = history.some(h => h.file === file.name);
            return (
              <div key={file.name} className={`flex items-center justify-between mb-2 p-3 rounded-lg border ${isDuplicate ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <FileText className={`h-5 w-5 ${isDuplicate ? 'text-yellow-600' : 'text-gray-600'}`} />
                  <span className="font-medium text-gray-800">{file.name}</span>
                  {isDuplicate && <span className="ml-2 text-xs text-yellow-800 font-semibold bg-yellow-200 px-2 py-0.5 rounded">Já existe no histórico</span>}
                </div>
                <button onClick={() => handleRemoveFile(idx)} className="text-red-600 hover:underline text-sm">Remover</button>
              </div>
            );
          })}
          <button
            onClick={processAllPDFs}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processando {uploadedFiles.length} PDF{uploadedFiles.length > 1 ? 's' : ''}...
              </>
            ) : (
              <>
                <RefreshCw className="h-5 w-5" />
                Processar {uploadedFiles.length} Etiqueta{uploadedFiles.length > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}

      {processedPDFs.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          {/* MENSAGEM / STATUS DE COMBINAÇÃO */}
          {isCombining && (
            <div className="mb-4 flex items-center gap-2 text-sm text-purple-800 bg-purple-50 border border-purple-200 rounded p-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Combinando PDFs... {combineProgress}%</span>
            </div>
          )}
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">
              {processedPDFs.length} PDF{processedPDFs.length > 1 ? 's' : ''} processado{processedPDFs.length > 1 ? 's' : ''} com sucesso!
            </h3>
          </div>
          
          {/* Botões de ação global */}
          {processedPDFs.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => combineAllPDFs()}
                disabled={isCombining}
                className={`bg-purple-600 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isCombining ? 'opacity-60 cursor-not-allowed' : 'hover:bg-purple-700'}`}
              >
                {isCombining ? <Loader2 className="h-5 w-5 animate-spin" /> : <Package className="h-5 w-5" />}
                {isCombining ? 'Combinando...' : 'Combinar Todos em um PDF'}
              </button>
              <button
                onClick={printAllCombined}
                disabled={isCombining}
                className={`bg-orange-600 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${isCombining ? 'opacity-60 cursor-not-allowed' : 'hover:bg-orange-700'}`}
              >
                {isCombining ? <Loader2 className="h-5 w-5 animate-spin" /> : <Eye className="h-5 w-5" />}
                {isCombining ? 'Preparando...' : 'Imprimir Todos'}
              </button>
            </div>
          )}
          
          {/* Lista de PDFs processados */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700">Arquivos processados:</h4>
            {processedPDFs.map((pdf) => (
              <div key={pdf.id} className="bg-white p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{pdf.originalName}</p>
                      <p className="text-sm text-gray-600">Pronto para impressão</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => printPDF(pdf.url)}
                      className="bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Imprimir
                    </button>
                    <button
                      onClick={() => downloadIndividual(pdf)}
                      className="bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                    >
                      <Download className="h-4 w-4" />
                      Baixar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-100 border border-gray-200 rounded-xl p-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-2 font-medium text-gray-700 mb-2 focus:outline-none hover:text-blue-700"
        >
          <span>{showAdvanced ? '▼' : '▶'}</span>
          Configurações Avançadas
        </button>
        {showAdvanced && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-semibold text-gray-800 mb-1">Etiqueta (Primeira Página)</h5>
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col text-xs">x
                    <div className="flex items-center gap-2">
                      <input type="range" min="0" max="2000" value={advancedConfig.page1.x} onChange={e => handleAdvancedConfigChange('page1', 'x', Number(e.target.value))} className="w-80" />
                      <input type="number" min="0" max="2000" value={advancedConfig.page1.x} onChange={e => handleAdvancedConfigChange('page1', 'x', Number(e.target.value))} className="border rounded px-2 py-1 w-20" />
                    </div>
                  </label>
                  <label className="flex flex-col text-xs">y
                    <div className="flex items-center gap-2">
                      <input type="range" min="-2000" max="2000" value={advancedConfig.page1.y} onChange={e => handleAdvancedConfigChange('page1', 'y', Number(e.target.value))} className="w-80" />
                      <input type="number" min="-2000" max="2000" value={advancedConfig.page1.y} onChange={e => handleAdvancedConfigChange('page1', 'y', Number(e.target.value))} className="border rounded px-2 py-1 w-20" />
                    </div>
                  </label>
                  <label className="flex flex-col text-xs">xScale
                    <div className="flex items-center gap-2">
                      <input type="range" min="0.1" max="2" step="0.01" value={advancedConfig.page1.xScale} onChange={e => handleAdvancedConfigChange('page1', 'xScale', Number(e.target.value))} className="w-80" />
                      <input type="number" min="0.1" max="2" step="0.01" value={advancedConfig.page1.xScale} onChange={e => handleAdvancedConfigChange('page1', 'xScale', Number(e.target.value))} className="border rounded px-2 py-1 w-20" />
                    </div>
                  </label>
                  <label className="flex flex-col text-xs">yScale
                    <div className="flex items-center gap-2">
                      <input type="range" min="0.1" max="2" step="0.01" value={advancedConfig.page1.yScale} onChange={e => handleAdvancedConfigChange('page1', 'yScale', Number(e.target.value))} className="w-80" />
                      <input type="number" min="0.1" max="2" step="0.01" value={advancedConfig.page1.yScale} onChange={e => handleAdvancedConfigChange('page1', 'yScale', Number(e.target.value))} className="border rounded px-2 py-1 w-20" />
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <h5 className="font-semibold text-gray-800 mb-1">Declaração (Segunda Página)</h5>
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col text-xs">x
                    <div className="flex items-center gap-2">
                      <input type="range" min="0" max="2000" value={advancedConfig.page2.x} onChange={e => handleAdvancedConfigChange('page2', 'x', Number(e.target.value))} className="w-80" />
                      <input type="number" min="0" max="2000" value={advancedConfig.page2.x} onChange={e => handleAdvancedConfigChange('page2', 'x', Number(e.target.value))} className="border rounded px-2 py-1 w-20" />
                    </div>
                  </label>
                  <label className="flex flex-col text-xs">y
                    <div className="flex items-center gap-2">
                      <input type="range" min="-2000" max="2000" value={advancedConfig.page2.y} onChange={e => handleAdvancedConfigChange('page2', 'y', Number(e.target.value))} className="w-80" />
                      <input type="number" min="-2000" max="2000" value={advancedConfig.page2.y} onChange={e => handleAdvancedConfigChange('page2', 'y', Number(e.target.value))} className="border rounded px-2 py-1 w-20" />
                    </div>
                  </label>
                  <label className="flex flex-col text-xs">xScale
                    <div className="flex items-center gap-2">
                      <input type="range" min="0.1" max="2" step="0.01" value={advancedConfig.page2.xScale} onChange={e => handleAdvancedConfigChange('page2', 'xScale', Number(e.target.value))} className="w-80" />
                      <input type="number" min="0.1" max="2" step="0.01" value={advancedConfig.page2.xScale} onChange={e => handleAdvancedConfigChange('page2', 'xScale', Number(e.target.value))} className="border rounded px-2 py-1 w-20" />
                    </div>
                  </label>
                  <label className="flex flex-col text-xs">yScale
                    <div className="flex items-center gap-2">
                      <input type="range" min="0.1" max="2" step="0.01" value={advancedConfig.page2.yScale} onChange={e => handleAdvancedConfigChange('page2', 'yScale', Number(e.target.value))} className="w-80" />
                      <input type="number" min="0.1" max="2" step="0.01" value={advancedConfig.page2.yScale} onChange={e => handleAdvancedConfigChange('page2', 'yScale', Number(e.target.value))} className="border rounded px-2 py-1 w-20" />
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="previewFullScreen"
                checked={previewFullScreen}
                onChange={e => setPreviewFullScreen(e.target.checked)}
                className="accent-blue-600"
              />
              <label htmlFor="previewFullScreen" className="text-sm text-gray-700 select-none cursor-pointer">Pré-visualização tela cheia</label>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={previewAllPDFs}
                disabled={isProcessing || uploadedFiles.length === 0}
                className="bg-blue-500 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-600 transition-all disabled:opacity-50"
              >
                Pré-visualizar
              </button>
              <button
                onClick={() => setAdvancedConfig(defaultAdvancedConfig)}
                type="button"
                className="bg-gray-300 text-gray-800 py-2 px-6 rounded-lg font-medium hover:bg-gray-400 transition-all"
              >
                Redefinir padrão
              </button>
            </div>
          </>
        )}
      </div>

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        defaultFilename={downloadFilename}
        fileExtension="pdf"
      />

      {showPreviewModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50`}>
          <div className={`bg-white rounded-lg shadow-lg ${previewFullScreen ? 'w-[99vw] h-[99vh] max-w-none max-h-none' : 'max-w-3xl'} w-full p-6 relative flex flex-col`}>
            <button onClick={() => setShowPreviewModal(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-800">Fechar</button>
            <h3 className="text-lg font-bold mb-4">Pré-visualização do PDF</h3>
            <div className={`${previewFullScreen ? 'flex-1 overflow-y-auto' : 'space-y-4 max-h-[70vh] overflow-y-auto'}`}>
              {previewUrls.map((url, idx) => (
                <iframe key={idx} src={url} title={`Prévia ${idx + 1}`} className={`w-full ${previewFullScreen ? 'h-[95vh]' : 'h-96'} border rounded`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Etiquetas */}
      {history.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-6">
          <h4 className="font-medium text-gray-700 mb-2">Histórico de Etiquetas</h4>
          <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
            <input
              type="text"
              placeholder="Filtrar por arquivo..."
              value={historyFilter}
              onChange={e => { setHistoryFilter(e.target.value); setHistoryPage(1); }}
              className="border rounded px-2 py-1 text-sm w-full md:w-64"
            />
            <div className="flex items-center gap-2">
              <label htmlFor="pageSize" className="text-xs text-gray-600">Por página:</label>
              <select
                id="pageSize"
                value={historyPageSize}
                onChange={e => { setHistoryPageSize(Number(e.target.value)); setHistoryPage(1); }}
                className="border rounded px-2 py-1 text-sm"
              >
                {[5, 10, 20, 50, 100].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-4">Arquivo</th>
                  <th className="py-2 pr-4">Data/Hora</th>
                  <th className="py-2 pr-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium text-gray-800">
                      {editIdx === idx ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="border rounded px-2 py-1 text-sm w-40"
                        />
                      ) : (
                        item.file
                      )}
                    </td>
                    <td className="py-2 pr-4 text-gray-700">
                      {new Date(item.date).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 pr-4 flex gap-2">
                      {editIdx === idx ? (
                        <>
                          <button onClick={() => handleSaveEditHistory(idx)} className="text-green-700 font-bold">Salvar</button>
                          <button onClick={handleCancelEditHistory} className="text-gray-500">Cancelar</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => handleEditHistory(idx)} className="text-blue-700">Editar</button>
                          <button onClick={() => handleDeleteHistory(idx)} className="text-red-700">Excluir</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Paginação */}
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-gray-600">Página {historyPage} de {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="px-2 py-1 text-sm rounded border bg-white disabled:opacity-50">Anterior</button>
              <button onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))} disabled={historyPage === totalPages} className="px-2 py-1 text-sm rounded border bg-white disabled:opacity-50">Próxima</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EtiquetaML;
   