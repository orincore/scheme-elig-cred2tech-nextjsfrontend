// Helpers for showing which of a scheme's required documents the user
// already has, based on what we know from their verified profile.

export interface OwnedDocs {
  pan: boolean;
  aadhaar: boolean;
  gst: boolean;
  udyam: boolean;
  bankAccount: boolean;
}

// Document "categories" we can confidently say the user holds, derived from
// their profile. Each has the keywords we look for in a scheme's
// `documentsRequired` text.
const DOC_KEYWORDS: { key: keyof OwnedDocs; label: string; keywords: string[] }[] = [
  { key: 'pan',         label: 'PAN Card',            keywords: ['pan'] },
  { key: 'aadhaar',     label: 'Aadhaar Card',        keywords: ['aadhaar', 'aadhar'] },
  { key: 'gst',         label: 'GST Certificate',     keywords: ['gst', 'gstin'] },
  { key: 'udyam',       label: 'Udyam / MSME Registration', keywords: ['udyam', 'udyog', 'msme registration', 'msme certificate'] },
  { key: 'bankAccount', label: 'Bank Account',        keywords: ['bank account', 'bank passbook', 'cancelled cheque', 'bank statement'] },
];

/** Determine which documents the user already holds from their profile. */
export function getOwnedDocs(profile: any): OwnedDocs {
  if (!profile) {
    return { pan: false, aadhaar: false, gst: false, udyam: false, bankAccount: false };
  }
  return {
    pan: Boolean(profile.panVerified || profile.panNumber || profile.pan),
    aadhaar: Boolean(profile.aadharAuthenticated || profile.ekycAuthenticated || profile.aadhaarVerified),
    gst: Boolean(profile.gstinVerified || profile.gstin),
    udyam: Boolean(profile.udyamVerified || profile.udyamNumber || profile.udyamRegistered),
    // We don't track bank details, but every MSME applicant effectively has one.
    bankAccount: false,
  };
}

/** Parse a scheme's `documentsRequired` (stripped markdown) into clean list items. */
export function parseRequiredDocuments(raw: string): string[] {
  if (!raw || typeof raw !== 'string') return [];
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map((line) =>
      line
        .replace(/^#{1,6}\s*/g, '')
        .replace(/^\s*\d+[.)]\s*/, '')
        .replace(/^[\s•\-\*]+/, '')
        .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
        .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .trim(),
    )
    .filter((l) => l.length > 2);
}

/** Returns the matched OwnedDocs key for a document line, or null if none. */
export function matchDocument(docText: string, owned: OwnedDocs): keyof OwnedDocs | null {
  const lc = docText.toLowerCase();
  for (const { key, keywords } of DOC_KEYWORDS) {
    if (owned[key] && keywords.some((kw) => lc.includes(kw))) return key;
  }
  return null;
}

export interface DocMatch {
  text: string;
  matchedKey: keyof OwnedDocs | null;
}

/** Parse + match in one pass. */
export function buildDocMatches(raw: string, owned: OwnedDocs): DocMatch[] {
  return parseRequiredDocuments(raw).map((text) => ({
    text,
    matchedKey: matchDocument(text, owned),
  }));
}
