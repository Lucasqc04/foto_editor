import React, { useState } from 'react';
import { Download, Loader2, CheckCircle, FileText, Scissors, Plus, Layers, Eye } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';

interface PdfToolsProps {
  onConversionComplete: () => void;
}

const PdfTools: React.FC<PdfToolsProps> = ({ onConversionComplete }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedFile, setProcessedFile] = useState<Blob | null>(null);
  const [toolMode, setToolMode] = useState<'merge' | 'split' | 'extract-text'>('merge');
  const [splitPages, setSplitPages] = useState<string>('1-5');
  const [extractedText, setExtractedText] = useState<string>('');
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);

  const handleFileSelect = (files: File[]) => {
    if (toolMode === 'merge') {
      setUploadedFiles(prev => [...prev, ...files]);
    } else {
      setUploadedFiles(files.slice(0, 1));
      if (files.length > 0) {
        loadPdfPreview(files[0]);
      }
    }
    setProcessedFile(null);
    setExtractedText('');
  };

  const loadPdfPreview = async (file: File) => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      setTotalPages(pdf.numPages);
      
      const previews: string[] = [];
      const maxPreviewPages = Math.min(5, pdf.numPages); // Mostrar no máximo 5 páginas
      
      for (let i = 1; i <= maxPreviewPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        previews.push(canvas.toDataURL());
      }
      
      setPdfPreview(previews);
    } catch (error) {
      console.error('Erro ao carregar preview do PDF:', error);
    }
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    if (toolMode !== 'merge') {
      setPdfPreview([]);
      setTotalPages(0);
    }
  };

  const mergePdfs = async () => {
    if (uploadedFiles.length < 2) {
      alert('Selecione pelo menos 2 arquivos PDF para mesclar.');
      return;
    }

    setIsProcessing(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      
      const mergedPdf = await PDFDocument.create();
      
      for (const file of uploadedFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }
      
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedFile(blob);
      onConversionComplete();
    } catch (error) {
      console.error('Erro na mesclagem:', error);
      alert('Erro ao mesclar PDFs. Verifique se os arquivos são válidos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const splitPdf = async () => {
    if (uploadedFiles.length === 0) {
      alert('Selecione um arquivo PDF para dividir.');
      return;
    }

    setIsProcessing(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      
      const file = uploadedFiles[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      
      const pageNumbers = parsePagesRange(splitPages, pdf.getPageCount());
      
      if (pageNumbers.length === 0) {
        alert('Nenhuma página válida especificada.');
        setIsProcessing(false);
        return;
      }
      
      const newPdf = await PDFDocument.create();
      const pages = await newPdf.copyPages(pdf, pageNumbers.map(n => n - 1)); // Converter para índice baseado em 0
      pages.forEach((page) => newPdf.addPage(page));
      
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setProcessedFile(blob);
      onConversionComplete();
    } catch (error) {
      console.error('Erro na divisão:', error);
      alert('Erro ao dividir PDF. Verifique o formato das páginas.');
    } finally {
      setIsProcessing(false);
    }
  };

  const extractTextFromPdf = async () => {
    if (uploadedFiles.length === 0) {
      alert('Selecione um arquivo PDF para extrair texto.');
      return;
    }

    setIsProcessing(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      
      const file = uploadedFiles[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += `Página ${i}:\n${pageText}\n\n`;
      }
      
      setExtractedText(fullText);
      onConversionComplete();
    } catch (error) {
      console.error('Erro na extração:', error);
      alert('Erro ao extrair texto do PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const parsePagesRange = (range: string, totalPages: number): number[] => {
    const pages: number[] = [];
    const parts = range.split(',');
    
    for (const part of parts) {
      const trimmedPart = part.trim();
      if (trimmedPart.includes('-')) {
        const [start, end] = trimmedPart.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= Math.min(end, totalPages); i++) {
            if (i > 0) pages.push(i);
          }
        }
      } else {
        const pageNum = parseInt(trimmedPart);
        if (!isNaN(pageNum) && pageNum > 0 && pageNum <= totalPages) {
          pages.push(pageNum);
        }
      }
    }
    
    return [...new Set(pages)].sort((a, b) => a - b);
  };

  const handleProcess = () => {
    switch (toolMode) {
      case 'merge':
        mergePdfs();
        break;
      case 'split':
        splitPdf();
        break;
      case 'extract-text':
        extractTextFromPdf();
        break;
    }
  };

  const handleDownload = (filename: string) => {
    if (!processedFile) return;

    const url = URL.createObjectURL(processedFile);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyText = () => {
    navigator.clipboard.writeText(extractedText);
    alert('Texto copiado para a área de transferência!');
  };

  const downloadText = () => {
    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'texto-extraido.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Ferramentas PDF</h2>
        <p className="text-gray-600">
          Mescle, divida e extraia texto de arquivos PDF
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          { id: 'merge', label: 'Mesclar PDFs', icon: Plus },
          { id: 'split', label: 'Dividir PDF', icon: Scissors },
          { id: 'extract-text', label: 'Extrair Texto', icon: FileText },
        ].map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              onClick={() => {
                setToolMode(mode.id as any);
                setUploadedFiles([]);
                setProcessedFile(null);
                setExtractedText('');
                setPdfPreview([]);
                setTotalPages(0);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                toolMode === mode.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {mode.label}
            </button>
          );
        })}
      </div>

      <FileUpload
        onFileSelect={handleFileSelect}
        fileType="pdf"
        multiple={toolMode === 'merge'}
        uploadedFiles={uploadedFiles}
        onRemoveFile={handleRemoveFile}
      />

      {uploadedFiles.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-6 space-y-4">
          {toolMode === 'merge' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 mb-2">Mesclagem de PDFs</h3>
              <p className="text-sm text-blue-700">
                Os arquivos serão mesclados na ordem em que foram adicionados.
                Arraste para reordenar se necessário.
              </p>
            </div>
          )}

          {toolMode === 'split' && (
            <div className="space-y-4">
              {totalPages > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-800">
                      PDF com {totalPages} páginas
                    </span>
                  </div>
                  {pdfPreview.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                      {pdfPreview.map((preview, index) => (
                        <div key={index} className="text-center">
                          <img
                            src={preview}
                            alt={`Página ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <span className="text-xs text-gray-600">Pág. {index + 1}</span>
                        </div>
                      ))}
                      {totalPages > 5 && (
                        <div className="flex items-center justify-center bg-gray-100 rounded border h-20">
                          <span className="text-xs text-gray-500">
                            +{totalPages - 5} páginas
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Páginas para extrair
                </label>
                <input
                  type="text"
                  value={splitPages}
                  onChange={(e) => setSplitPages(e.target.value)}
                  placeholder="Ex: 1-5 ou 1,3,5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use formato: 1-5 (páginas 1 a 5) ou 1,3,5 (páginas específicas)
                  {totalPages > 0 && ` • Total: ${totalPages} páginas`}
                </p>
              </div>
            </div>
          )}

          {toolMode === 'extract-text' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-2">Extração de Texto</h3>
              <p className="text-sm text-yellow-700">
                Esta ferramenta extrai texto de PDFs que contêm texto selecionável.
                Para PDFs escaneados, use a ferramenta de OCR.
              </p>
              {totalPages > 0 && (
                <p className="text-sm text-yellow-700 mt-2">
                  PDF carregado com {totalPages} páginas.
                </p>
              )}
            </div>
          )}

          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Layers className="h-5 w-5" />
                {toolMode === 'merge' && 'Mesclar PDFs'}
                {toolMode === 'split' && 'Dividir PDF'}
                {toolMode === 'extract-text' && 'Extrair Texto'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {processedFile && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">
              {toolMode === 'merge' && 'PDFs mesclados com sucesso!'}
              {toolMode === 'split' && 'PDF dividido com sucesso!'}
            </h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-700 mb-1">
                Arquivo processado
              </p>
              <p className="text-sm text-gray-500">
                Tamanho: {(processedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            
            <button
              onClick={() => setShowDownloadModal(true)}
              className="bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="h-5 w-5" />
              Baixar PDF
            </button>
          </div>
        </div>
      )}

      {extractedText && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-medium text-green-800">Texto extraído com sucesso!</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 border max-h-60 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-800">
                {extractedText}
              </pre>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={copyText}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Copiar Texto
              </button>
              <button
                onClick={downloadText}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Baixar TXT
              </button>
            </div>
          </div>
        </div>
      )}

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        defaultFilename={`pdf-${toolMode}`}
        fileExtension="pdf"
      />
    </div>
  );
};

export default PdfTools;