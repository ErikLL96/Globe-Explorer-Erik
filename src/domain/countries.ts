/**
 * Country normalization layer.
 *
 * Globe Explorer measures progress against 195 countries:
 * the 193 UN member states plus the 2 UN observer states (Holy See, Palestine).
 * Geographic datasets such as Natural Earth contain more polygons than that
 * (territories, dependencies, disputed areas), so every ISO code is passed
 * through `toCountedCountry` before it may affect the "world explored" figure.
 */

/** ISO 3166-1 alpha-2 codes and English short names of the 193 UN member states. */
export const UN_MEMBER_STATES: Readonly<Record<string, string>> = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AD: 'Andorra', AO: 'Angola',
  AG: 'Antigua and Barbuda', AR: 'Argentina', AM: 'Armenia', AU: 'Australia', AT: 'Austria',
  AZ: 'Azerbaijan', BS: 'Bahamas', BH: 'Bahrain', BD: 'Bangladesh', BB: 'Barbados',
  BY: 'Belarus', BE: 'Belgium', BZ: 'Belize', BJ: 'Benin', BT: 'Bhutan',
  BO: 'Bolivia', BA: 'Bosnia and Herzegovina', BW: 'Botswana', BR: 'Brazil', BN: 'Brunei',
  BG: 'Bulgaria', BF: 'Burkina Faso', BI: 'Burundi', CV: 'Cabo Verde', KH: 'Cambodia',
  CM: 'Cameroon', CA: 'Canada', CF: 'Central African Republic', TD: 'Chad', CL: 'Chile',
  CN: 'China', CO: 'Colombia', KM: 'Comoros', CG: 'Congo', CD: 'DR Congo',
  CR: 'Costa Rica', CI: "Côte d'Ivoire", HR: 'Croatia', CU: 'Cuba', CY: 'Cyprus',
  CZ: 'Czechia', DK: 'Denmark', DJ: 'Djibouti', DM: 'Dominica', DO: 'Dominican Republic',
  EC: 'Ecuador', EG: 'Egypt', SV: 'El Salvador', GQ: 'Equatorial Guinea', ER: 'Eritrea',
  EE: 'Estonia', SZ: 'Eswatini', ET: 'Ethiopia', FJ: 'Fiji', FI: 'Finland',
  FR: 'France', GA: 'Gabon', GM: 'Gambia', GE: 'Georgia', DE: 'Germany',
  GH: 'Ghana', GR: 'Greece', GD: 'Grenada', GT: 'Guatemala', GN: 'Guinea',
  GW: 'Guinea-Bissau', GY: 'Guyana', HT: 'Haiti', HN: 'Honduras', HU: 'Hungary',
  IS: 'Iceland', IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq',
  IE: 'Ireland', IL: 'Israel', IT: 'Italy', JM: 'Jamaica', JP: 'Japan',
  JO: 'Jordan', KZ: 'Kazakhstan', KE: 'Kenya', KI: 'Kiribati', KP: 'North Korea',
  KR: 'South Korea', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos', LV: 'Latvia',
  LB: 'Lebanon', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya', LI: 'Liechtenstein',
  LT: 'Lithuania', LU: 'Luxembourg', MG: 'Madagascar', MW: 'Malawi', MY: 'Malaysia',
  MV: 'Maldives', ML: 'Mali', MT: 'Malta', MH: 'Marshall Islands', MR: 'Mauritania',
  MU: 'Mauritius', MX: 'Mexico', FM: 'Micronesia', MD: 'Moldova', MC: 'Monaco',
  MN: 'Mongolia', ME: 'Montenegro', MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar',
  NA: 'Namibia', NR: 'Nauru', NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand',
  NI: 'Nicaragua', NE: 'Niger', NG: 'Nigeria', MK: 'North Macedonia', NO: 'Norway',
  OM: 'Oman', PK: 'Pakistan', PW: 'Palau', PA: 'Panama', PG: 'Papua New Guinea',
  PY: 'Paraguay', PE: 'Peru', PH: 'Philippines', PL: 'Poland', PT: 'Portugal',
  QA: 'Qatar', RO: 'Romania', RU: 'Russia', RW: 'Rwanda', KN: 'Saint Kitts and Nevis',
  LC: 'Saint Lucia', VC: 'Saint Vincent and the Grenadines', WS: 'Samoa', SM: 'San Marino',
  ST: 'São Tomé and Príncipe', SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia',
  SC: 'Seychelles', SL: 'Sierra Leone', SG: 'Singapore', SK: 'Slovakia', SI: 'Slovenia',
  SB: 'Solomon Islands', SO: 'Somalia', ZA: 'South Africa', SS: 'South Sudan', ES: 'Spain',
  LK: 'Sri Lanka', SD: 'Sudan', SR: 'Suriname', SE: 'Sweden', CH: 'Switzerland',
  SY: 'Syria', TJ: 'Tajikistan', TZ: 'Tanzania', TH: 'Thailand', TL: 'Timor-Leste',
  TG: 'Togo', TO: 'Tonga', TT: 'Trinidad and Tobago', TN: 'Tunisia', TR: 'Türkiye',
  TM: 'Turkmenistan', TV: 'Tuvalu', UG: 'Uganda', UA: 'Ukraine', AE: 'United Arab Emirates',
  GB: 'United Kingdom', US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan', VU: 'Vanuatu',
  VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen', ZM: 'Zambia', ZW: 'Zimbabwe',
};

/** The 2 UN General Assembly non-member observer states. */
export const UN_OBSERVER_STATES: Readonly<Record<string, string>> = {
  VA: 'Holy See (Vatican City)',
  PS: 'Palestine',
};

export const COUNTED_COUNTRIES: Readonly<Record<string, string>> = {
  ...UN_MEMBER_STATES,
  ...UN_OBSERVER_STATES,
};

export const TOTAL_COUNTRIES = 195;

/**
 * Territories and dependencies that Natural Earth draws as separate polygons.
 * Visiting one counts towards its sovereign state, e.g. Hong Kong → China.
 */
export const TERRITORY_SOVEREIGN: Readonly<Record<string, string>> = {
  HK: 'CN', MO: 'CN',
  PR: 'US', GU: 'US', VI: 'US', AS: 'US', MP: 'US', UM: 'US',
  GL: 'DK', FO: 'DK',
  PF: 'FR', NC: 'FR', WF: 'FR', PM: 'FR', BL: 'FR', MF: 'FR', TF: 'FR',
  BM: 'GB', KY: 'GB', GI: 'GB', VG: 'GB', TC: 'GB', FK: 'GB', AI: 'GB', MS: 'GB',
  SH: 'GB', PN: 'GB', IM: 'GB', JE: 'GB', GG: 'GB', IO: 'GB', GS: 'GB',
  AW: 'NL', CW: 'NL', SX: 'NL',
  AX: 'FI',
  NF: 'AU', HM: 'AU',
  CK: 'NZ', NU: 'NZ',
};

/** Display names for territories and regions outside the 195-country list. */
const OTHER_REGION_NAMES: Readonly<Record<string, string>> = {
  HK: 'Hong Kong', MO: 'Macao', PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands',
  AS: 'American Samoa', MP: 'Northern Mariana Islands', UM: 'U.S. Minor Outlying Islands',
  GL: 'Greenland', FO: 'Faroe Islands', PF: 'French Polynesia', NC: 'New Caledonia',
  WF: 'Wallis and Futuna', PM: 'Saint Pierre and Miquelon', BL: 'Saint Barthélemy',
  MF: 'Saint Martin', TF: 'French Southern Territories', BM: 'Bermuda', KY: 'Cayman Islands',
  GI: 'Gibraltar', VG: 'British Virgin Islands', TC: 'Turks and Caicos Islands',
  FK: 'Falkland Islands', AI: 'Anguilla', MS: 'Montserrat', SH: 'Saint Helena',
  PN: 'Pitcairn Islands', IM: 'Isle of Man', JE: 'Jersey', GG: 'Guernsey',
  IO: 'British Indian Ocean Territory', GS: 'South Georgia', AW: 'Aruba', CW: 'Curaçao',
  SX: 'Sint Maarten', AX: 'Åland Islands', NF: 'Norfolk Island', HM: 'Heard Island',
  CK: 'Cook Islands', NU: 'Niue', TW: 'Taiwan', XK: 'Kosovo', EH: 'Western Sahara',
  AQ: 'Antarctica',
};

export function normalizeCountryCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Maps any ISO code to the code that counts towards the 195, or `null`
 * when the region is not part of the convention (e.g. Antarctica, Kosovo, Taiwan).
 */
export function toCountedCountry(code: string): string | null {
  const iso = normalizeCountryCode(code);
  if (iso in COUNTED_COUNTRIES) return iso;
  const sovereign = TERRITORY_SOVEREIGN[iso];
  return sovereign && sovereign in COUNTED_COUNTRIES ? sovereign : null;
}

export function countryName(code: string): string {
  const iso = normalizeCountryCode(code);
  return COUNTED_COUNTRIES[iso] ?? OTHER_REGION_NAMES[iso] ?? iso;
}
