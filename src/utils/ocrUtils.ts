import Tesseract from 'tesseract.js';

export const extractTextFromImage = async (
  file: File, 
  onProgress?: (progress: number) => void,
  language: string = 'por'
): Promise<string> => {
  try {
    // Importar Tesseract.js dinamicamente
    const Tesseract = await import('tesseract.js');
    
    const worker = await Tesseract.createWorker({
      logger: (m: any) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress * 100);
        }
      }
    });

    try {
      await worker.loadLanguage(language);
      await worker.initialize(language);
      
      const { data } = await worker.recognize(file);
      
      return data.text || '';
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    console.error('Erro ao carregar Tesseract.js:', error);
    throw new Error('Erro ao carregar biblioteca de OCR. Verifique sua conexão com a internet.');
  }
};

export const extractTextFromImageWithWords = async (
  file: File, 
  onProgress?: (progress: number) => void,
  language: string = 'por'
): Promise<{ text: string; words: any[] }> => {
  try {
    const Tesseract = await import('tesseract.js');
    
    const worker = await Tesseract.createWorker({
      logger: (m: any) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress * 100);
        }
      }
    });

    try {
      await worker.loadLanguage(language);
      await worker.initialize(language);
      
      const { data } = await worker.recognize(file);
      
      return {
        text: data.text || '',
        words: data.words || []
      };
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    console.error('Erro ao carregar Tesseract.js:', error);
    throw new Error('Erro ao carregar biblioteca de OCR. Verifique sua conexão com a internet.');
  }
};