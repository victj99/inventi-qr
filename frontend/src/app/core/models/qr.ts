import QRCode from 'qrcode';
import { Activo } from './tipos';
import { urlActivo } from './util';

// Genera el QR como data URL PNG en el navegador (sin build previo).
export async function qrDataUrl(a: Activo, size = 220): Promise<string> {
  return QRCode.toDataURL(urlActivo(a), { width: size, margin: 2, errorCorrectionLevel: 'M' });
}
