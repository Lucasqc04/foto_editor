import React, { useState } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { Download, Loader2, CheckCircle, RefreshCw, FileText, Eye, Package } from 'lucide-react';
import FileUpload from './FileUpload';
import DownloadModal from './DownloadModal';

interface EtiquetaMLProps {
  onConversionComplete?: () => void;
}

interface ProcessedPDF {
  id: string;
  originalName: string;
  url: string;
  blob: Blob;
}

const EtiquetaML: React.FC<EtiquetaMLProps> = ({ onConversionComplete }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processedPDFs, setProcessedPDFs] = useState<ProcessedPDF[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [downloadFilename, setDownloadFilename] = useState<string>('');

  const handleFileSelect = (files: File[]) => {
    setUploadedFiles(files);
    setProcessedPDFs([]);
    setError(null);
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    if (newFiles.length === 0) {
      setProcessedPDFs([]);
    }
  };

  const processSinglePDF = async (file: File): Promise<ProcessedPDF> => {
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
    
    // Primeiro: Coloca a segunda página (declaração) mais à direita com 50% do tamanho e rotacionada
    const embeddedPage2 = await newPdf.embedPage(page2);
    newPage.drawPage(embeddedPage2, {
      x: width - (embeddedPage2.height * 0.5) + 510,
      y: height - (embeddedPage2.width * 0.5) - 200,
      xScale: 0.8,
      yScale: 0.8,
      rotate: degrees(90),
    });
    
    // Segundo: Coloca a primeira página (etiqueta) rotacionada e posicionada corretamente
    const embeddedPage1 = await newPdf.embedPage(page1);
    newPage.drawPage(embeddedPage1, {
      x: embeddedPage1.height + 140,
      y: 45,
      xScale: 1,
      yScale: 1,
      rotate: degrees(90),
    });
    
    // Salva o PDF
    const pdfBytes = await newPdf.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
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

  const combineAllPDFs = async () => {
    if (processedPDFs.length === 0) return;

    try {
      const combinedPdf = await PDFDocument.create();
      
      for (const processedPDF of processedPDFs) {
        const arrayBuffer = await processedPDF.blob.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = await combinedPdf.copyPages(pdfDoc, [0]);
        pages.forEach(page => combinedPdf.addPage(page));
      }
      
      const pdfBytes = await combinedPdf.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setDownloadUrl(url);
      setDownloadFilename('etiquetas-ml-combinadas');
      setShowDownloadModal(true);
    } catch (err) {
      console.error('Erro ao combinar PDFs:', err);
      setError('Erro ao combinar os PDFs.');
    }
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

  const downloadIndividual = (processedPDF: ProcessedPDF) => {
    setDownloadUrl(processedPDF.url);
    setDownloadFilename(`etiqueta-${processedPDF.originalName.replace('.pdf', '-otimizada')}`);
    setShowDownloadModal(true);
  };

  const printPDF = (url: string) => {
    window.open(url, '_blank');
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
          <button
            onClick={processAllPDFs}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                onClick={combineAllPDFs}
                className="bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <Package className="h-5 w-5" />
                Combinar Todos em um PDF
              </button>
              <button
                onClick={() => processedPDFs.forEach(pdf => printPDF(pdf.url))}
                className="bg-orange-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="h-5 w-5" />
                Imprimir Todos
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

      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={handleDownload}
        defaultFilename={downloadFilename}
        fileExtension="pdf"
      />
    </div>
  );
}

export default EtiquetaML;
