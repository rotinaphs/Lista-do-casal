
import { supabase } from './supabaseClient';

/**
 * Redimensiona e comprime uma imagem.
 * Retorna um Blob para upload ou Base64 para preview imediato.
 */
export const resizeImage = (base64Str: string, maxWidth = 1280, maxHeight = 1280): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

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
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
      resolve(compressedBase64);
    };
    img.onerror = (err) => reject(err);
  });
};

/**
 * Converte Base64 para Blob para upload
 */
export const base64ToBlob = (base64: string): Blob => {
  const byteString = atob(base64.split(',')[1]);
  const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
};

/**
 * Faz upload de uma imagem para o Supabase Storage e retorna a URL pública
 */
export const uploadToSupabase = async (userId: string, folder: string, base64Data: string): Promise<string> => {
  const blob = base64ToBlob(base64Data);
  const fileName = `${userId}/${folder}/${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from('couple_assets')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: true
    });

  if (error) throw error;

  const { data: publicUrlData } = supabase.storage
    .from('couple_assets')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
};
