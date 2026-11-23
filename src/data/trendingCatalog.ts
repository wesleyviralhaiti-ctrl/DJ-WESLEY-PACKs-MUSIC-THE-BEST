import { getCountryByCode } from './countries';
import { MusicPack } from './musicPacks';

interface TrendingPackSeed {
  title: string;
  genre: string;
}

const HAITI_DIASPORA_SEEDS: TrendingPackSeed[] = [
  { title: 'Konpa_Gouyad_Hits_2026', genre: 'Konpa / Gouyad' },
  { title: 'Raboday_Kanaval_Viral_2026', genre: 'Rabòday / Kanaval' },
  { title: 'Rap_Kreyol_Top_50', genre: 'Rap Kreyòl / Trap' },
  { title: 'Zouk_Love_Classics_VIP', genre: 'Zouk / Douceur' },
  { title: 'Afrobeats_Konpa_Fusion', genre: 'Afrobeats / Konpa' },
  { title: 'Konpa_Live_Bal_2026', genre: 'Konpa Live' },
  { title: 'Gouyad_Douceur_Night_VIP', genre: 'Gouyad / Slow' },
  { title: 'Raboday_TikTok_Challenges_2026', genre: 'Rabòday / Viral' },
  { title: 'Rap_Kreyol_Drill_Street_VIP', genre: 'Rap Kreyòl / Drill' },
  { title: 'Shatta_Bouyon_Antilles_2026', genre: 'Shatta / Bouyon' },
  { title: 'Konpa_Old_School_Gold_VIP', genre: 'Konpa Retro' },
  { title: 'Rara_Racine_Lajan_Mix_2026', genre: 'Rara / Racine' },
  { title: 'French_Afro_Club_Hits_2026', genre: 'Afro / Urbain FR' },
  { title: 'HipHop_RnB_Club_Bangers_USA', genre: 'Hip-Hop / R&B' },
  { title: 'Amapiano_Diaspora_Remix_2026', genre: 'Amapiano / Afro' },
  { title: 'Dancehall_Soca_Caribbean_VIP', genre: 'Dancehall / Soca' },
  { title: 'Konpa_Remix_Intros_Outtros_DJ', genre: 'DJ Transitions' },
  { title: 'Zouk_Kompa_Retro_90s_2000s', genre: 'Zouk / Konpa' },
];

const BRAZIL_SEEDS: TrendingPackSeed[] = [
  { title: 'Baile_Funk_Brazil_Top50_2026', genre: 'Baile Funk' },
  { title: 'Phonk_Viral_BR_Club', genre: 'Brazilian Phonk' },
  { title: 'Sertanejo_Universitario_Hits', genre: 'Sertanejo' },
  { title: 'Funk_Mandelao_DJ_Pack', genre: 'Funk Mandelão' },
  { title: 'Pagode_Remix_2026', genre: 'Pagode / Samba' },
  { title: 'Funk_Automotivo_Grave_Forte', genre: 'Funk Automotivo' },
  { title: 'Brega_Funk_Recife_Viral_2026', genre: 'Brega Funk' },
  { title: 'Piseiro_Forro_Eletronico_VIP', genre: 'Piseiro / Forró' },
  { title: 'MTG_TikTok_Brazil_Mashups', genre: 'MTG / Viral BR' },
  { title: 'Trap_BR_Mandela_Hits_2026', genre: 'Trap Brazil' },
  { title: 'Electro_Funk_Mega_Rave_BR', genre: 'Electro Funk' },
  { title: 'Samba_Pagode_Classics_VIP', genre: 'Samba / Pagode' },
  { title: 'Axe_Carnaval_Salvador_2026', genre: 'Axé / Carnaval' },
  { title: 'Tecno_Brega_Para_Club_Mix', genre: 'Tecno Brega' },
  { title: 'Brazilian_Bass_House_VIP_2026', genre: 'Brazilian Bass' },
  { title: 'Funk_150_BPM_DJ_Transitions', genre: 'DJ Transitions' },
];

const AFRICA_SEEDS: TrendingPackSeed[] = [
  { title: 'Amapiano_SouthAfrica_Top50', genre: 'Amapiano' },
  { title: 'Afrobeats_Naija_Club_2026', genre: 'Afrobeats / Naija' },
  { title: 'Coupe_Decale_Abidjan_Hits', genre: 'Coupé-Décalé' },
  { title: 'Ndombolo_Rumba_Congo_VIP', genre: 'Ndombolo / Rumba' },
  { title: 'Mbalax_Dakar_Mix_2026', genre: 'Mbalax / Sénégal' },
  { title: 'Azonto_Ghana_Highlife_2026', genre: 'Azonto / Highlife' },
  { title: 'Bikutsi_Makossa_Cameroun_VIP', genre: 'Makossa / Bikutsi' },
  { title: 'Afro_House_Kuduro_Luanda_2026', genre: 'Afro House / Kuduro' },
  { title: 'Bongo_Flava_EastAfrica_Hits', genre: 'Bongo Flava' },
  { title: 'Afro_Trap_Francophone_Club', genre: 'Afro Trap' },
  { title: 'Yoruba_Street_Pop_Lagos_2026', genre: 'Street Pop / Naija' },
  { title: 'Zouglou_Classics_Abidjan_VIP', genre: 'Zouglou' },
  { title: 'Amapiano_Private_School_Groove', genre: 'Amapiano / Deep' },
  { title: 'Kizomba_Tarraxinha_Douceur', genre: 'Kizomba / Tarraxinha' },
  { title: 'Afrobeats_TikTok_Viral_2026', genre: 'Afrobeats / Viral' },
  { title: 'Gqom_Durban_Bass_Club_VIP', genre: 'Gqom / Afro Club' },
];

const LATIN_RD_SEEDS: TrendingPackSeed[] = [
  { title: 'Dembow_RD_Calle_Top50', genre: 'Dembow RD' },
  { title: 'Reggaeton_Perreo_2026', genre: 'Reggaeton / Perreo' },
  { title: 'Bachata_Sensual_VIP', genre: 'Bachata' },
  { title: 'Salsa_Dura_Classics', genre: 'Salsa Dura' },
  { title: 'Merengue_Tipico_Fiesta_2026', genre: 'Merengue Típico' },
  { title: 'Dembow_TikTok_Viral_2026', genre: 'Dembow / Viral' },
  { title: 'Latin_Trap_Urbano_Hits', genre: 'Latin Trap' },
  { title: 'Cumbia_Sonidera_Remix_2026', genre: 'Cumbia Remix' },
  { title: 'Guaracha_Aleteo_Club_VIP', genre: 'Guaracha / Aleteo' },
  { title: 'Reggaeton_Old_School_2000s', genre: 'Reggaeton Retro' },
  { title: 'Mambo_Merengue_Electronico', genre: 'Merengue Urbano' },
  { title: 'Salsa_Romantica_DJ_Pack', genre: 'Salsa Romántica' },
  { title: 'Corridos_Tumbados_VIP_2026', genre: 'Regional Urbano' },
  { title: 'Reparto_Cubano_Calle_2026', genre: 'Reparto / Cubaton' },
  { title: 'Latin_House_Festival_2026', genre: 'Latin House' },
  { title: 'Perreo_Intenso_Transitions', genre: 'DJ Transitions' },
];

const CARIBBEAN_ENGLISH_SEEDS: TrendingPackSeed[] = [
  { title: 'Dancehall_Jamaica_Top50_2026', genre: 'Dancehall' },
  { title: 'Soca_Carnival_Road_Mix_2026', genre: 'Soca / Carnival' },
  { title: 'Roots_Reggae_Classics_VIP', genre: 'Roots Reggae' },
  { title: 'Bashment_Club_Anthems_2026', genre: 'Bashment / Dancehall' },
  { title: 'Bouyon_Dominica_Shatta_VIP', genre: 'Bouyon / Shatta' },
  { title: 'Afro_Dancehall_Fusion_2026', genre: 'Afro-Dancehall' },
  { title: 'Lovers_Rock_Reggae_Gold', genre: 'Lovers Rock' },
  { title: 'Zouk_Konpa_Caribbean_Mix', genre: 'Zouk / Konpa' },
  { title: 'Trap_Dancehall_Badman_2026', genre: 'Trap Dancehall' },
  { title: 'Power_Soca_Gym_Fete_Pack', genre: 'Power Soca' },
  { title: 'Groovy_Soca_Sunset_VIP', genre: 'Groovy Soca' },
  { title: '90s_Dancehall_Juggling_Gold', genre: 'Classic Dancehall' },
  { title: 'Dennery_Segment_StLucia_VIP', genre: 'Dennery Segment' },
  { title: 'Calypso_Retro_Island_Pack', genre: 'Calypso' },
  { title: 'Caribbean_TikTok_Viral_2026', genre: 'Viral Caribbean' },
];

const AFRICA_COUNTRY_CODES = new Set([
  'NG', 'CI', 'CD', 'SN', 'GH', 'CM', 'ZA', 'CG', 'BJ', 'TG',
  'BF', 'ML', 'GN', 'GA', 'KE', 'TZ', 'UG', 'RW', 'AO', 'MZ',
  'CV', 'GM', 'SL', 'LR', 'NE', 'TD', 'BI', 'ZM', 'ZW', 'BW',
  'NA', 'ET', 'MA', 'DZ', 'TN', 'EG', 'MG', 'MU', 'DJ', 'ER',
  'GQ', 'GW', 'KM', 'LS', 'LY', 'MR', 'MW', 'SC', 'SD', 'SO',
  'SS', 'ST', 'SZ',
]);

const LATIN_COUNTRY_CODES = new Set([
  'DO', 'PR', 'CO', 'VE', 'MX', 'CU', 'PA', 'AR', 'CL', 'PE',
  'EC', 'GT', 'HN', 'SV', 'NI', 'CR', 'UY', 'PY', 'BO', 'ES',
]);

const HAITI_DIASPORA_CODES = new Set([
  'HT', 'US', 'CA', 'FR', 'GP', 'MQ', 'GF', 'RE', 'YT', 'BL', 'MF', 'BE', 'CH',
]);

const CARIBBEAN_EN_CODES = new Set([
  'JM', 'TT', 'BB', 'BS', 'LC', 'GD', 'DM', 'VC', 'AG', 'KN', 'GY', 'BZ', 'AW', 'CW', 'SR',
]);

function sanitizeCountrySlug(name: string): string {
  const cleaned = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'Global';
}

function buildGenericCountrySeeds(countryCode: string, countryName: string): TrendingPackSeed[] {
  const slug = sanitizeCountrySlug(countryName);
  return [
    { title: `${slug}_Club_Top50_2026`, genre: `${countryName} Top 50` },
    { title: `${slug}_Radio_Hits_Viral_2026`, genre: 'Radio Hits' },
    { title: 'TikTok_Global_Viral_Remixes_2026', genre: 'TikTok Viral' },
    { title: `House_TechHouse_Club_${slug}`, genre: 'House / Tech House' },
    { title: `Urban_HipHop_Trap_${slug}_2026`, genre: 'Hip-Hop / Trap' },
    { title: 'Afrobeats_Amapiano_World_VIP', genre: 'Afrobeats / Amapiano' },
    { title: 'Electronic_EDM_Festival_2026', genre: 'EDM / Festival' },
    { title: 'Afro_House_Melodic_Sunset_VIP', genre: 'Afro House' },
    { title: 'RnB_Soul_Night_Lounge_2026', genre: 'R&B / Lounge' },
    { title: 'Reggaeton_Latin_Club_Worldwide', genre: 'Reggaeton / Latin' },
    { title: 'Dancehall_Reggae_Island_VIP', genre: 'Dancehall / Reggae' },
    { title: 'Throwback_2000s_Club_Classics', genre: 'Retro Club Classics' },
    { title: `Pop_Dance_Remixes_${slug}`, genre: 'Pop / Dance' },
    { title: 'Drum_Bass_Garage_UK_Energy', genre: 'Bass / Garage' },
    { title: `DJ_OpenFormat_Intros_${countryCode}`, genre: 'DJ Transitions' },
    { title: 'Konpa_Zouk_Tropical_Discovery', genre: 'Konpa / Tropical' },
  ];
}

export function getCountryTrendingSeeds(countryCode: string): TrendingPackSeed[] {
  const upper = (countryCode || 'HT').trim().toUpperCase();
  const country = getCountryByCode(upper);

  if (HAITI_DIASPORA_CODES.has(upper)) {
    // Give US/CA/FR a slight local flavor bump while keeping all core Haitian/diaspora hits
    if (upper === 'US' || upper === 'CA') {
      return [
        ...HAITI_DIASPORA_SEEDS.slice(0, 5),
        { title: 'HipHop_Trap_Club_USA_2026', genre: 'Hip-Hop / Trap' },
        { title: 'RnB_SlowJams_Night_VIP', genre: 'R&B / Slow Jams' },
        ...HAITI_DIASPORA_SEEDS.slice(5, 16),
      ];
    }
    if (upper === 'FR') {
      return [
        ...HAITI_DIASPORA_SEEDS.slice(0, 5),
        { title: 'Afro_French_Rap_Paris_2026', genre: 'Rap FR / Afro' },
        { title: 'Zouk_Shatta_Antilles_Club', genre: 'Zouk / Shatta' },
        ...HAITI_DIASPORA_SEEDS.slice(5, 16),
      ];
    }
    return HAITI_DIASPORA_SEEDS;
  }

  if (upper === 'BR') return BRAZIL_SEEDS;
  if (AFRICA_COUNTRY_CODES.has(upper)) return AFRICA_SEEDS;
  if (LATIN_COUNTRY_CODES.has(upper)) return LATIN_RD_SEEDS;
  if (CARIBBEAN_EN_CODES.has(upper)) return CARIBBEAN_ENGLISH_SEEDS;

  return buildGenericCountrySeeds(country.code, country.name);
}

export function buildCountryTrendingComingSoonPacks(
  countryCode: string,
  existingPackFilenamesOrTitles: Set<string>
): MusicPack[] {
  const upper = (countryCode || 'HT').trim().toUpperCase();
  const seeds = getCountryTrendingSeeds(upper);
  const result: MusicPack[] = [];

  for (let idx = 0; idx < seeds.length; idx++) {
    const seed = seeds[idx];
    const normTitle = seed.title.toLowerCase().replace(/\.zip$/i, '');
    if (existingPackFilenamesOrTitles.has(normTitle)) {
      continue;
    }

    const slug = seed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    result.push({
      id: `trending-${upper.toLowerCase()}-${slug}`,
      slug,
      title: seed.title,
      filename: `${seed.title}.zip`,
      subtitle: '⏳ Folder an preparasyon — mizik yo ap disponib byento.',
      genre: seed.genre,
      trackCount: 0,
      fileSize: 'An Preparasyon',
      bitrate: 'Ap Vini Byento',
      bpmRange: 'An Preparasyon',
      coverImage: '/src/assets/images/hero_studio_console_1795118961756.jpg',
      tracks: [],
      isComingSoon: true,
    });
  }

  return result;
}
