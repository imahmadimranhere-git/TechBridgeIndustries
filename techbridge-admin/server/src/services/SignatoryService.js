import { User } from '../models/index.js';
import { svgToDataUri } from '../utils/dataUri.js';
import { generateStampSvg } from '../utils/stampSvg.js';
import { uploadToDataUri } from './BrandingService.js';
import { getSettings } from './SettingsService.js';

const ALL_ON = { showSignature: true, showCoSignature: true, showStamp: true, showQr: true };
const MAX_CO_SIGNERS = 2;

const unique = (ids) => [...new Set(ids.filter(Boolean).map(String))];

/** Settings toggles for one document type (missing toggles default to "on") */
export async function documentOptionsFor(documentType) {
  const { documentOptions } = await getSettings();
  return { ...ALL_ON, ...(documentOptions?.[documentType] ?? {}) };
}

/** Other founders from Settings (new list, or the older single value) */
function configuredCoSignatoryIds(settings) {
  const ids = settings.coSignatoryIds?.length ? settings.coSignatoryIds : [settings.coSignatoryId];
  return unique(ids);
}

/** Users in the same order as the ids (missing ones are skipped) */
async function loadUsersInOrder(ids) {
  if (!ids.length) return [];
  const users = await User.find({ _id: { $in: ids } }).lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
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
 * The other founders who sign next to the main signer.
 * Everyone from Settings (other signatories + default signatory) except the main signer,
 * so all founders always appear once, whoever created the document.
 */
async function resolveCoSigners(settings, signer, options) {
  if (!options.showCoSignature) return [];
  const configured = configuredCoSignatoryIds(settings);
  if (!configured.length) return [];

  const ids = unique([...configured, settings.defaultSignatoryId])
    .filter((id) => id !== String(signer?._id))
    .slice(0, MAX_CO_SIGNERS);

  const users = await loadUsersInOrder(ids);
  return Promise.all(
    users.map(async (user) => ({
      name: user.name,
      designation: user.designation ?? '',
      signatureDataUri: options.showSignature ? await uploadToDataUri(user.signaturePath) : null,
    }))
  );
}

/**
 * Founders / points of contact for letters and emails: the given person first,
 * then the default signatory and the other signatories from Settings.
 */
export async function getLeadershipContacts(primaryUserId = null) {
  const settings = await getSettings();
  const ids = unique([primaryUserId, settings.defaultSignatoryId, ...configuredCoSignatoryIds(settings)]);
  const users = await loadUsersInOrder(ids);
  return users.map((user) => ({
    id: String(user._id),
    name: user.name,
    designation: user.designation ?? '',
    phone: user.phone ?? '',
    email: user.email ?? '',
  }));
}

/**
 * Data for the {{> signatory}} partial.
 * signedBy: the user id saved on the record (invoice.signedBy, payment.signedBy, ...)
 */
export async function buildSignatory({ signedBy = null, documentType, date = new Date() }) {
  const settings = await getSettings();
  const options = await documentOptionsFor(documentType);
  const signer = await resolveSigner(signedBy, settings);

  const [signatureDataUri, companyStamp, personalStamp, coSigners] = await Promise.all([
    options.showSignature ? uploadToDataUri(signer?.signaturePath) : null,
    options.showStamp ? getCompanyStampDataUri(settings) : null,
    options.showStamp ? uploadToDataUri(signer?.stampPath) : null,
    resolveCoSigners(settings, signer, options),
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
    coSigners,
    options,
  };
}
