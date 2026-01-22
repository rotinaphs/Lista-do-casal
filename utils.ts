
/**
 * Redimensiona e comprime uma imagem em base64 para caber no localStorage.
 * Mantém uma resolução de até 1280px (HD) para permitir zoom e pan nos cards
 * sem estourar o limite de 5MB do navegador.
 */
export const resizeImage = (base64Str: string, maxWidth = 1280, maxHeight = 1280): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Cálculo de proporção para manter o aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Exporta como JPEG com qualidade 0.7 (excelente equilíbrio entre peso e nitidez)
      // JPEG é muito mais leve que PNG para fotos reais.
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
      resolve(compressedBase64);
    };
    img.onerror = (err) => reject(err);
  });
};

/**
 * Tenta salvar no localStorage com tratamento de erro de cota excedida.
 * Se falhar mesmo após a compressão, avisa o usuário.
 */
export const safeLocalStorageSet = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn('Cota do localStorage excedida. Tentando limpar dados antigos...');
      // Se for um item de checklist, poderíamos tentar uma limpeza automática aqui
      alert('O limite de armazenamento do seu navegador foi atingido. Tente usar fotos menores ou remover itens antigos.');
    }
    console.error('Erro crítico ao salvar no localStorage:', e);
  }
};
