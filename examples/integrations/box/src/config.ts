import dotenv from 'dotenv';

dotenv.config();

const {
  BROWSERBASE_API_KEY,
  BOX_CLIENT_ID,
  BOX_CLIENT_SECRET,
  BOX_ENTERPRISE_ID,
  BOX_FOLDER_ID,
} = process.env;

if (
  !BROWSERBASE_API_KEY ||
  !BOX_CLIENT_ID ||
  !BOX_CLIENT_SECRET ||
  !BOX_ENTERPRISE_ID ||
  !BOX_FOLDER_ID
) {
  throw new Error(
    'Missing a required environment variable. Check examples/integrations/box/.env.example.'
  );
}

export const config = {
  browserbaseApiKey: BROWSERBASE_API_KEY,
  boxClientId: BOX_CLIENT_ID,
  boxClientSecret: BOX_CLIENT_SECRET,
  boxEnterpriseId: BOX_ENTERPRISE_ID,
  boxFolderId: BOX_FOLDER_ID,
};

export type Source = {
  role: 'sds' | 'label';
  pageUrl: string;
  linkText: string;
};

export const sources: Source[] = [
  {
    role: 'sds',
    pageUrl:
      process.env.SDS_PAGE_URL ??
      'https://www.thecloroxcompany.com/sds/clorox-disinfecting-wipes1-fresh-scent/',
    linkText: process.env.SDS_LINK_TEXT ?? 'Download Safety Data Sheet',
  },
  {
    role: 'label',
    pageUrl:
      process.env.LABEL_PAGE_URL ??
      'https://www.epa.gov/safepestcontrol/why-read-labels',
    linkText: process.env.LABEL_LINK_TEXT ?? 'How to Read a Disinfectant Label',
  },
];
