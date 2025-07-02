import jsPDF from 'jspdf';

interface PdfOptions {
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
}

export const convertImagesToPdf = async (
  files: File[],
  options: PdfOptions
): Promise<Blob> => {
  const { pageSize, orientation } = options;
  
  const pdf = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: pageSize.toLowerCase() as 'a4' | 'letter'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const maxWidth = pageWidth - 2 * margin;
  const maxHeight = pageHeight - 2 * margin;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Converter arquivo para base64
    const base64 = await fileToBase64(file);
    
    // Criar imagem para obter dimensões
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = base64;
    });

    // Calcular dimensões mantendo proporção
    const imgWidth = img.width;
    const imgHeight = img.height;
    const imgRatio = imgWidth / imgHeight;
    
    let finalWidth = maxWidth;
    let finalHeight = maxWidth / imgRatio;
    
    if (finalHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = maxHeight * imgRatio;
    }

    // Centralizar imagem na página
    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;

    // Adicionar nova página (exceto para a primeira imagem)
    if (i > 0) {
      pdf.addPage();
    }

    // Adicionar imagem ao PDF
    pdf.addImage(base64, 'JPEG', x, y, finalWidth, finalHeight);
  }

  return pdf.output('blob');
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};