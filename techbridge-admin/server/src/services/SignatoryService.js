import { User } from '../models/index.js';
import { svgToDataUri } from '../utils/dataUri.js';
import { generateStampSvg } from '../utils/stampSvg.js';
import { uploadToDataUri } from './BrandingService.js';
import { getSettings } from './SettingsService.js';

const ALL_ON = { showSignature: true, showStamp: true, showQr: true };

/** Settings toggles for one document type (missing toggles default to "on") */
export async function documentOptionsFor(documentType) {
  const { documentOptions } = await getSettings();
  return { ...ALL_ON, ...(documentOptions?.[documentType] ?? {}) };
}

/**
 * Company stamp as a data URI according to Settings:
 *   uploaded -> the uploaded PNG (falls back to auto if the file is missing)
 *   auto     -> generated round SVG stamp
 *   none     -> null
 */
export async function getCompanyStampDataUri(settings) {
  if (settings.stampMode === 'none') return null;

  if (settings.stampMode === 'uploaded') {
    const uploaded = await uploadToDataUri(settings.stampPath);
    if (uploaded) return uploaded;
  }

  return svgToDataUri(
    generateStampSvg({
      companyName: settings.companyName,
      city: settings.city,
      country: settings.country,
      color: settings.brandPrimaryColor,
    })
  );
}

// The admin who signed the document, else the default signatory from Settings
async function resolveSigner(signedBy, settings) {
  const candidates = [signedBy?._id ?? signedBy, settings.defaultSignatoryId].filter(Boolean);
  for (const id of candidates) {
    // Inactive admins are still shown: old documents must keep their original signer
    const user = await User.findById(id).lean();
    if (user) return user;
  }
  return null;
}

/**
 * Data for the {{> signatory}} partial.
 * signedBy: the user id saved on the record (invoice.signedBy, payment.signedBy, ...)
 */
export async function buildSignatory({ signedBy = null, documentType, date = new Date() }) {
  const settings = await getSettings();
  const options = await documentOptionsFor(documentType);
  const signer = await resolveSigner(signedBy, settings);

  const [signatureDataUri, companyStamp, personalStamp] = await Promise.all([
    options.showSignature ? uploadToDataUri(signer?.signaturePath) : null,
    options.showStamp ? getCompanyStampDataUri(settings) : null,
    options.showStamp ? uploadToDataUri(signer?.stampPath) : null,
  ]);

  return {
    label: settings.signatoryLabel,
    name: signer?.name ?? '',
    designation: signer?.designation ?? '',
    companyName: settings.companyName,
    date,
    signatureDataUri,
    // The company stamp wins; a personal stamp is used only when the company stamp is off ("none")
    stampDataUri: companyStamp ?? personalStamp,
    options,
  };
}