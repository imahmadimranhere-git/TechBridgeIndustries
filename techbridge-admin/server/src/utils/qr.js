import QRCode from 'qrcode';

/** QR code PNG as a data URI (black on white, no quiet zone; the PDF adds spacing) */
export function qrDataUri(text, { size = 220 } = {}) {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: size,
    color: { dark: '#111827', light: '#ffffff' },
  });
}