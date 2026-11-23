export type PricingRegion = 'HTG' | 'EUR' | 'USD';

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  aliases: string;
  region: PricingRegion;
}

export type PlanPriceId =
  | '10-folder'
  | '21-folder'
  | '36-folder'
  | '55-folder'
  | 'unlimited-vip';

export const SELECTED_COUNTRY_STORAGE_KEY = 'wesley_selected_country_code_v1';

export const POPULAR_COUNTRY_CODES = [
  'HT',
  'US',
  'BR',
  'CA',
  'FR',
  'DO',
  'CD',
  'CI',
  'NG',
  'SN',
  'GH',
  'CM',
  'GP',
  'MQ',
] as const;

export const EUROZONE_COUNTRY_CODES = new Set<string>([
  'FR',
  'BE',
  'DE',
  'ES',
  'IT',
  'PT',
  'NL',
  'AT',
  'IE',
  'FI',
  'GR',
  'LU',
  'SK',
  'SI',
  'EE',
  'LV',
  'LT',
  'CY',
  'MT',
  'HR',
  'BG',
  'AD',
  'MC',
  'SM',
  'VA',
  'ME',
  'XK',
  // French overseas territories & Euro departments
  'GP',
  'MQ',
  'GF',
  'RE',
  'YT',
  'MF',
  'BL',
  'PM',
]);

export function countryCodeToFlag(code: string): string {
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return '🌐';
  return String.fromCodePoint(
    0x1f1e6 + upper.charCodeAt(0) - 65,
    0x1f1e6 + upper.charCodeAt(1) - 65
  );
}

export function getPricingRegion(countryCode: string): PricingRegion {
  const upper = countryCode.trim().toUpperCase();
  if (upper === 'HT') return 'HTG';
  if (EUROZONE_COUNTRY_CODES.has(upper)) return 'EUR';
  return 'USD';
}

export const REGIONAL_PLAN_PRICES: Record<
  PricingRegion,
  Record<PlanPriceId, string>
> = {
  HTG: {
    '10-folder': '500 HTG / 100 Dola HT',
    '21-folder': '1,000 HTG / 200 Dola HT',
    '36-folder': '1,500 HTG / 300 Dola HT',
    '55-folder': '2,000 HTG / 400 Dola HT',
    'unlimited-vip': '7,800 HTG / 1,560 Dola HT',
  },
  EUR: {
    '10-folder': '10 €',
    '21-folder': '20 €',
    '36-folder': '30 €',
    '55-folder': '40 €',
    'unlimited-vip': '60 €',
  },
  USD: {
    '10-folder': '$10 USD',
    '21-folder': '$20 USD',
    '36-folder': '$30 USD',
    '55-folder': '$40 USD',
    'unlimited-vip': '$60 USD',
  },
};

export function getFormattedPlanPrice(planId: string, countryCode: string): string {
  const region = getPricingRegion(countryCode);
  const map = REGIONAL_PLAN_PRICES[region];
  if (
    planId === '10-folder' ||
    planId === '21-folder' ||
    planId === '36-folder' ||
    planId === '55-folder' ||
    planId === 'unlimited-vip'
  ) {
    return map[planId];
  }
  return map['21-folder'];
}

export function getRegionCurrencyBadge(countryCode: string): string {
  const region = getPricingRegion(countryCode);
  if (region === 'HTG') return 'HTG / Dola HT';
  if (region === 'EUR') return 'EUR €';
  return 'USD $';
}

// Tuple format: [ISO_CODE, DISPLAY_NAME, SEARCH_ALIASES]
const RAW_WORLD_COUNTRIES: ReadonlyArray<readonly [string, string, string]> = [
  ['AF', 'Afghanistan', 'afganistan'],
  ['ZA', 'South Africa', 'afrique du sud afrik disid'],
  ['AL', 'Albania', 'albanie albani'],
  ['DZ', 'Algeria', 'algerie aljeri'],
  ['DE', 'Germany', 'allemagne almay deutschland euro'],
  ['AD', 'Andorra', 'andorre'],
  ['AO', 'Angola', 'angola'],
  ['AI', 'Anguilla', 'anguilla'],
  ['AG', 'Antigua and Barbuda', 'antigua barbuda'],
  ['SA', 'Saudi Arabia', 'arabie saoudite'],
  ['AR', 'Argentina', 'argentine ajantin'],
  ['AM', 'Armenia', 'armenie'],
  ['AW', 'Aruba', 'aruba karayib'],
  ['AU', 'Australia', 'australie ostrali'],
  ['AT', 'Austria', 'autriche otrich euro'],
  ['AZ', 'Azerbaijan', 'azerbaidjan'],
  ['HT', 'Ayiti', 'haiti haitian peyi'],
  ['BS', 'Bahamas', 'bahamas karayib'],
  ['BH', 'Bahrain', 'bahrein'],
  ['BD', 'Bangladesh', 'bangladesh'],
  ['BB', 'Barbados', 'barbade babad karayib'],
  ['BE', 'Belgium', 'belgique beljik euro'],
  ['BZ', 'Belize', 'belize'],
  ['BJ', 'Benin', 'benin benen'],
  ['BM', 'Bermuda', 'bermudes'],
  ['BT', 'Bhutan', 'bhoutan'],
  ['BY', 'Belarus', 'bielorussie'],
  ['BO', 'Bolivia', 'bolivie'],
  ['BA', 'Bosnia and Herzegovina', 'bosnie'],
  ['BW', 'Botswana', 'botswana'],
  ['BR', 'Brésil', 'brazil brezil brasil'],
  ['BN', 'Brunei', 'brunei'],
  ['BG', 'Bulgaria', 'bulgarie euro'],
  ['BF', 'Burkina Faso', 'burkina faso'],
  ['BI', 'Burundi', 'burundi'],
  ['KH', 'Cambodia', 'cambodge'],
  ['CM', 'Cameroun', 'cameroon kameroun'],
  ['CA', 'Canada', 'canada kanada quebec montreal'],
  ['CV', 'Cabo Verde', 'cap-vert cape verde'],
  ['CF', 'Central African Republic', 'centrafrique'],
  ['CL', 'Chile', 'chili'],
  ['CN', 'China', 'chine chin'],
  ['CY', 'Cyprus', 'chypre euro'],
  ['CO', 'Colombia', 'colombie kolonbi'],
  ['KM', 'Comoros', 'comores'],
  ['CG', 'Congo', 'congo-brazzaville'],
  ['KR', 'South Korea', 'coree du sud korea'],
  ['KP', 'North Korea', 'coree du nord'],
  ['CR', 'Costa Rica', 'costa rica'],
  ['CI', "Côte d'Ivoire", 'ivory coast kot divwa abidjan'],
  ['HR', 'Croatia', 'croatie euro'],
  ['CU', 'Cuba', 'cuba kiba'],
  ['CW', 'Curaçao', 'curacao karayib'],
  ['DK', 'Denmark', 'danemark'],
  ['DJ', 'Djibouti', 'djibouti'],
  ['DM', 'Dominica', 'dominique dominik'],
  ['EG', 'Egypt', 'egypte ejip'],
  ['SV', 'El Salvador', 'salvador'],
  ['AE', 'United Arab Emirates', 'emirats arabes unis dubai uae'],
  ['EC', 'Ecuador', 'equateur'],
  ['ER', 'Eritrea', 'erythree'],
  ['ES', 'Spain', 'espagne espany espana euro'],
  ['EE', 'Estonia', 'estonie euro'],
  ['SZ', 'Eswatini', 'eswatini swaziland'],
  ['US', 'États-Unis', 'united states usa america etazini miami new york boston'],
  ['ET', 'Ethiopia', 'ethiopie etyopi'],
  ['FJ', 'Fiji', 'fidji'],
  ['FI', 'Finland', 'finlande fenland euro'],
  ['FR', 'France', 'frans paris lyon euro'],
  ['GA', 'Gabon', 'gabon'],
  ['GM', 'Gambia', 'gambie'],
  ['GE', 'Georgia', 'georgie'],
  ['GH', 'Ghana', 'ghana accra'],
  ['GI', 'Gibraltar', 'gibraltar'],
  ['GR', 'Greece', 'grece gres euro'],
  ['GD', 'Grenada', 'grenade grenad'],
  ['GL', 'Greenland', 'groenland'],
  ['GP', 'Guadeloupe', 'gwadeloup gwadloup antilles karayib euro'],
  ['GU', 'Guam', 'guam'],
  ['GT', 'Guatemala', 'guatemala'],
  ['GN', 'Guinea', 'guinee gine conakry'],
  ['GQ', 'Equatorial Guinea', 'guinee equatoriale'],
  ['GW', 'Guinea-Bissau', 'guinee-bissau'],
  ['GY', 'Guyana', 'guyana'],
  ['GF', 'French Guiana', 'guyane francaise cayenne euro'],
  ['HN', 'Honduras', 'honduras'],
  ['HK', 'Hong Kong', 'hong kong'],
  ['HU', 'Hungary', 'hongrie'],
  ['KY', 'Cayman Islands', 'iles caimans'],
  ['FO', 'Faroe Islands', 'iles feroe'],
  ['SB', 'Solomon Islands', 'iles salomon'],
  ['TC', 'Turks and Caicos Islands', 'turks caicos'],
  ['VG', 'British Virgin Islands', 'virgin islands'],
  ['VI', 'U.S. Virgin Islands', 'us virgin islands'],
  ['IN', 'India', 'inde end'],
  ['ID', 'Indonesia', 'indonesie'],
  ['IQ', 'Iraq', 'irak'],
  ['IR', 'Iran', 'iran'],
  ['IE', 'Ireland', 'irlande iland euro'],
  ['IS', 'Iceland', 'islande'],
  ['IL', 'Israel', 'israel'],
  ['IT', 'Italy', 'italie itali italia euro'],
  ['JM', 'Jamaica', 'jamaique jamayik kingston'],
  ['JP', 'Japan', 'japon japon'],
  ['JO', 'Jordan', 'jordanie'],
  ['KZ', 'Kazakhstan', 'kazakhstan'],
  ['KE', 'Kenya', 'kenya nairobi'],
  ['KG', 'Kyrgyzstan', 'kirghizistan'],
  ['KI', 'Kiribati', 'kiribati'],
  ['XK', 'Kosovo', 'kosovo euro'],
  ['KW', 'Kuwait', 'koweit'],
  ['LA', 'Laos', 'laos'],
  ['LS', 'Lesotho', 'lesotho'],
  ['LV', 'Latvia', 'lettonie euro'],
  ['LB', 'Lebanon', 'liban'],
  ['LR', 'Liberia', 'liberia'],
  ['LY', 'Libya', 'libye'],
  ['LI', 'Liechtenstein', 'liechtenstein'],
  ['LT', 'Lithuania', 'lituanie euro'],
  ['LU', 'Luxembourg', 'luxembourg euro'],
  ['MO', 'Macau', 'macao'],
  ['MK', 'North Macedonia', 'macedoine du nord'],
  ['MG', 'Madagascar', 'madagascar'],
  ['MY', 'Malaysia', 'malaisie'],
  ['MW', 'Malawi', 'malawi'],
  ['MV', 'Maldives', 'maldives'],
  ['ML', 'Mali', 'mali bamako'],
  ['MT', 'Malta', 'malte euro'],
  ['MA', 'Morocco', 'maroc mawok casablanca'],
  ['MH', 'Marshall Islands', 'marshall'],
  ['MQ', 'Martinique', 'matinik martinik antilles karayib euro'],
  ['MU', 'Mauritius', 'maurice'],
  ['MR', 'Mauritania', 'mauritanie'],
  ['YT', 'Mayotte', 'mayotte euro'],
  ['MX', 'Mexico', 'mexique meksik mexico'],
  ['FM', 'Micronesia', 'micronesie'],
  ['MD', 'Moldova', 'moldavie'],
  ['MC', 'Monaco', 'monaco euro'],
  ['MN', 'Mongolia', 'mongolie'],
  ['ME', 'Montenegro', 'montenegro euro'],
  ['MS', 'Montserrat', 'montserrat'],
  ['MZ', 'Mozambique', 'mozambique'],
  ['MM', 'Myanmar', 'birmanie myanmar'],
  ['NA', 'Namibia', 'namibie'],
  ['NR', 'Nauru', 'nauru'],
  ['NP', 'Nepal', 'nepal'],
  ['NI', 'Nicaragua', 'nicaragua'],
  ['NE', 'Niger', 'niger'],
  ['NG', 'Nigeria', 'nigeria lagos'],
  ['NO', 'Norway', 'norvege'],
  ['NZ', 'New Zealand', 'nouvelle-zelande'],
  ['OM', 'Oman', 'oman'],
  ['UG', 'Uganda', 'ouganda'],
  ['UZ', 'Uzbekistan', 'ouzbekistan'],
  ['PK', 'Pakistan', 'pakistan'],
  ['PW', 'Palau', 'palaos'],
  ['PS', 'Palestine', 'palestine'],
  ['PA', 'Panama', 'panama'],
  ['PG', 'Papua New Guinea', 'papouasie'],
  ['PY', 'Paraguay', 'paraguay'],
  ['NL', 'Netherlands', 'pays-bas holland netherlands euro'],
  ['PE', 'Peru', 'perou'],
  ['PH', 'Philippines', 'philippines'],
  ['PL', 'Poland', 'pologne poland'],
  ['PR', 'Puerto Rico', 'porto rico puerto rico'],
  ['PT', 'Portugal', 'portugal potigal euro'],
  ['QA', 'Qatar', 'qatar'],
  ['CD', 'RD Congo', 'democratic republic congo kinshasa zaire rdc'],
  ['DO', 'République Dominicaine', 'dominican republic sen domeng santo domingo'],
  ['CZ', 'Czechia', 'republique tcheque czech republic'],
  ['RE', 'Réunion', 'reunion euro'],
  ['RO', 'Romania', 'roumanie'],
  ['GB', 'United Kingdom', 'royaume-uni uk england london angleterre'],
  ['RU', 'Russia', 'russie'],
  ['RW', 'Rwanda', 'rwanda kigali'],
  ['BL', 'Saint Barthélemy', 'saint-barthelemy euro'],
  ['KN', 'Saint Kitts and Nevis', 'saint-kitts'],
  ['SM', 'San Marino', 'saint-marin euro'],
  ['MF', 'Saint Martin', 'saint-martin sint maarten euro'],
  ['PM', 'Saint Pierre and Miquelon', 'saint-pierre euro'],
  ['VC', 'Saint Vincent and the Grenadines', 'saint-vincent'],
  ['LC', 'Saint Lucia', 'sainte-lucie'],
  ['WS', 'Samoa', 'samoa'],
  ['ST', 'Sao Tome and Principe', 'sao tome'],
  ['SN', 'Sénégal', 'senegal dakar'],
  ['RS', 'Serbia', 'serbie'],
  ['SC', 'Seychelles', 'seychelles'],
  ['SL', 'Sierra Leone', 'sierra leone'],
  ['SG', 'Singapore', 'singapour'],
  ['SX', 'Sint Maarten', 'sint maarten'],
  ['SK', 'Slovakia', 'slovaquie euro'],
  ['SI', 'Slovenia', 'slovenie euro'],
  ['SO', 'Somalia', 'somalie'],
  ['SD', 'Sudan', 'soudan'],
  ['SS', 'South Sudan', 'soudan du sud'],
  ['LK', 'Sri Lanka', 'sri lanka'],
  ['SE', 'Sweden', 'suede sweden'],
  ['CH', 'Switzerland', 'suisse switzerland geneve zurich'],
  ['SR', 'Suriname', 'suriname'],
  ['SY', 'Syria', 'syrie'],
  ['TJ', 'Tajikistan', 'tadjikistan'],
  ['TW', 'Taiwan', 'taiwan'],
  ['TZ', 'Tanzania', 'tanzanie'],
  ['TD', 'Chad', 'tchad chad'],
  ['TH', 'Thailand', 'thailande'],
  ['TL', 'Timor-Leste', 'timor oriental'],
  ['TG', 'Togo', 'togo lome'],
  ['TO', 'Tonga', 'tonga'],
  ['TT', 'Trinidad and Tobago', 'trinite-et-tobago trinidad'],
  ['TN', 'Tunisia', 'tunisie'],
  ['TM', 'Turkmenistan', 'turkmenistan'],
  ['TR', 'Turkey', 'turquie turkiye'],
  ['TV', 'Tuvalu', 'tuvalu'],
  ['UA', 'Ukraine', 'ukraine'],
  ['UY', 'Uruguay', 'uruguay'],
  ['VU', 'Vanuatu', 'vanuatu'],
  ['VA', 'Vatican City', 'vatican euro'],
  ['VE', 'Venezuela', 'venezuela'],
  ['VN', 'Vietnam', 'vietnam'],
  ['YE', 'Yemen', 'yemen'],
  ['ZM', 'Zambia', 'zambie'],
  ['ZW', 'Zimbabwe', 'zimbabwe'],
];

export const ALL_COUNTRIES: CountryOption[] = RAW_WORLD_COUNTRIES.map(
  ([code, name, aliases]) => ({
    code,
    name,
    flag: countryCodeToFlag(code),
    aliases,
    region: getPricingRegion(code),
  })
).sort((a, b) => a.name.localeCompare(b.name, 'fr'));

const COUNTRY_BY_CODE = new Map<string, CountryOption>(
  ALL_COUNTRIES.map((c) => [c.code, c])
);

export const POPULAR_COUNTRIES: CountryOption[] = POPULAR_COUNTRY_CODES.map(
  (code) => COUNTRY_BY_CODE.get(code)!
).filter(Boolean);

export function getCountryByCode(code: string | null | undefined): CountryOption {
  const upper = (code || 'HT').trim().toUpperCase();
  return COUNTRY_BY_CODE.get(upper) ?? COUNTRY_BY_CODE.get('HT')!;
}

export function normalizeCountrySearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterCountries(query: string): CountryOption[] {
  const q = normalizeCountrySearch(query);
  if (!q) return ALL_COUNTRIES;
  return ALL_COUNTRIES.filter((c) => {
    const haystack = normalizeCountrySearch(`${c.name} ${c.code} ${c.aliases}`);
    return haystack.includes(q);
  });
}

export function loadSelectedCountryCode(): string {
  try {
    const saved = window.localStorage.getItem(SELECTED_COUNTRY_STORAGE_KEY);
    if (saved && COUNTRY_BY_CODE.has(saved.toUpperCase())) {
      return saved.toUpperCase();
    }
  } catch {
    // ignore storage errors
  }
  return 'HT';
}

export function saveSelectedCountryCode(code: string): string {
  const upper = code.trim().toUpperCase();
  const valid = COUNTRY_BY_CODE.has(upper) ? upper : 'HT';
  try {
    window.localStorage.setItem(SELECTED_COUNTRY_STORAGE_KEY, valid);
  } catch {
    // ignore storage errors
  }
  return valid;
}
