/**
 * INTERNATIONALIZATION ENGINE — Verify Sentinel
 * Supports: English (en), Luganda (lg), Swahili (sw), French (fr)
 * Target markets: Uganda, Kenya, Rwanda, DRC
 */

export const LANGUAGES = {
  en: { name: 'English', flag: '🇺🇬', dir: 'ltr' },
  lg: { name: 'Luganda', flag: '🇺🇬', dir: 'ltr' },
  sw: { name: 'Kiswahili', flag: '🇰🇪', dir: 'ltr' },
  fr: { name: 'Français', flag: '🇷🇼', dir: 'ltr' }
};

export const t = {
  en: {
    // Navigation
    nav_home: 'Home',
    nav_get_id: 'Get My ID',
    nav_verify: 'Verify Client',
    nav_dashboard: 'My Address',
    nav_tagline: 'Digital Identity Layer for East Africa',

    // Landing
    hero_headline: 'Your Location,\nMathematically Proven.',
    hero_sub: 'A permanent, tamper-proof digital address built on H3 hexagonal geometry. Works offline. Trusted by banks, accepted by couriers.',
    cta_individual: 'Get My Sentinel ID',
    cta_business: 'Verify a Client',
    persona_individual: 'Individual',
    persona_individual_sub: 'Get a permanent digital address in 3 minutes',
    persona_business: 'Business',
    persona_business_sub: 'Instantly verify any client\'s location identity',

    // ID Forge
    forge_title: 'ID Forge',
    forge_sub: 'Acquiring GPS signal from satellite constellation',
    forge_step1: 'Locate',
    forge_step2: 'Anchor',
    forge_step3: 'Certify',
    forge_acquiring: 'Acquiring GPS Signal...',
    forge_locked: 'Hex Locked',
    forge_your_id: 'Your Sentinel ID',
    forge_offline_safe: 'Works Offline',
    forge_offline_sub: 'ID generated from pure GPS — no data needed',
    forge_accuracy: 'GPS Accuracy',
    forge_resolution: 'Resolution',
    forge_hex_area: 'Hex Area ~174m²',

    // Landmark Mapper
    landmark_title: 'Landmark Mapper',
    landmark_sub: 'Add 2–3 physical anchors so others can find you',
    landmark_type: 'What is nearby?',
    landmark_direction: 'Which direction?',
    landmark_distance: 'How far? (meters)',
    landmark_describe: 'Describe it in your words',
    landmark_add: 'Add Landmark',
    landmark_ai_normalizing: 'AI is standardizing your description...',
    landmark_count_min: 'Add at least 2 landmarks to continue',

    // Dashboard
    dash_title: 'My Sentinel Address',
    dash_trust: 'Trust Score',
    dash_nights: 'Nights Verified',
    dash_vouches: 'Neighbor Vouches',
    dash_status_pending: 'Pending',
    dash_status_partial: 'Partial',
    dash_status_verified: 'Verified',
    dash_persistence: 'Persistence Verification',
    dash_persistence_sub: 'Stay at this location for 3 consecutive nights',
    dash_night: 'Night',
    dash_checkin: 'Check In Now',
    dash_anchors: 'Physical Anchors',
    dash_deep_link: 'Share Location',
    dash_google_maps: 'Open in Google Maps',
    dash_apple_maps: 'Open in Apple Maps',
    dash_copy_id: 'Copy Sentinel ID',

    // Verify
    verify_title: 'Client Verification Oracle',
    verify_sub: 'Enter a Sentinel ID to verify location identity',
    verify_placeholder: 'e.g. 8921-F3A2-B100-9E7',
    verify_search: 'Verify',
    verify_verified: 'VERIFIED',
    verify_pending: 'PENDING',
    verify_not_found: 'ID Not Found',
    verify_trust_score: 'Trust Score',
    verify_last_seen: 'Last Verified',
    verify_anchors: 'Physical Anchors',
    verify_blueprint: 'Last-Mile Blueprint',

    // Status
    status_acquiring: 'Acquiring...',
    status_locked: 'Locked',
    status_error: 'GPS Error — Enable location access',

    // Errors
    err_gps_denied: 'Location access denied. Please enable GPS permissions.',
    err_gps_unavailable: 'GPS unavailable on this device.',
    err_no_address: 'No Sentinel Address found. Generate your ID first.',
  },

  lg: {
    nav_home: 'Ennyumba',
    nav_get_id: 'Nfune ID Yange',
    nav_verify: 'Kakasa Omuwaabi',
    nav_dashboard: 'Endabirirwa Yange',
    nav_tagline: 'Ekibonerezo kya Digital mu Afrika Eya Bugwanjuba',
    hero_headline: 'Eddwaliro Lyo,\nLikyusibwa mu Zzimu.',
    hero_sub: 'Endabirirwa ya digital ennungi eyazimbwa ku H3 hexagonal geometry. Ekola nga tewali data. Emirimu mu banki.',
    cta_individual: 'Nfune Sentinel ID Yange',
    cta_business: 'Kakasa Omuwaabi',
    persona_individual: 'Omuntu',
    persona_individual_sub: 'Funa endabirirwa ya digital mu minzaana 3',
    persona_business: 'Bizinensi',
    persona_business_sub: 'Kakasa endabirirwa y\'omuwaabi wakyo mu kaseera',
    forge_title: 'Zingira ID',
    forge_acquiring: 'Nkwata Signal ya GPS...',
    forge_locked: 'Hex Efungiddwa',
    forge_your_id: 'Sentinel ID Yo',
    forge_offline_safe: 'Ekola nga tewali data',
    dash_trust: 'Buyizi',
    dash_nights: 'Ekiro ekyakakasibwa',
    dash_verified: 'Ekyakakasibwa',
    verify_title: 'Oracle y\'Okukakasa Omuwaabi',
    verify_search: 'Kakasa',
    verify_verified: 'EKYAKAKASIBWA',
    verify_pending: 'KITEEKATEEKA',
  },

  sw: {
    nav_home: 'Nyumbani',
    nav_get_id: 'Pata ID Yangu',
    nav_verify: 'Thibitisha Mteja',
    nav_dashboard: 'Anwani Yangu',
    nav_tagline: 'Safu ya Utambulisho wa Kidijitali Afrika Mashariki',
    hero_headline: 'Mahali Pako,\nKimethibitishwa Kihisabati.',
    hero_sub: 'Anwani ya kidijitali isiyobadilika iliyojengwa juu ya H3 hexagonal geometry. Inafanya kazi bila data. Inakubalika na mabenki na washirikishi.',
    cta_individual: 'Pata Sentinel ID Yangu',
    cta_business: 'Thibitisha Mteja',
    persona_individual: 'Mtu Binafsi',
    persona_individual_sub: 'Pata anwani ya kudumu ya kidijitali kwa dakika 3',
    persona_business: 'Biashara',
    persona_business_sub: 'Thibitisha mara moja utambulisho wa mahali pa mteja',
    forge_title: 'Forge ya ID',
    forge_acquiring: 'Inapata Ishara ya GPS...',
    forge_locked: 'Hex Imefungwa',
    forge_your_id: 'Sentinel ID Yako',
    forge_offline_safe: 'Inafanya kazi Nje ya Mtandao',
    dash_trust: 'Alama ya Uaminifu',
    dash_nights: 'Usiku Uliothibitishwa',
    dash_verified: 'Imethibitishwa',
    verify_title: 'Oracle ya Kuthibitisha Mteja',
    verify_search: 'Thibitisha',
    verify_verified: 'IMETHIBITISHWA',
    verify_pending: 'INASUBIRI',
  },

  fr: {
    nav_home: 'Accueil',
    nav_get_id: 'Obtenir Mon ID',
    nav_verify: 'Vérifier un Client',
    nav_dashboard: 'Mon Adresse',
    nav_tagline: 'Couche d\'Identité Numérique pour l\'Afrique de l\'Est',
    hero_headline: 'Votre Emplacement,\nMathématiquement Prouvé.',
    hero_sub: 'Une adresse numérique permanente construite sur la géométrie hexagonale H3. Fonctionne hors ligne. Acceptée par les banques et les livreurs.',
    cta_individual: 'Obtenir Mon Sentinel ID',
    cta_business: 'Vérifier un Client',
    persona_individual: 'Particulier',
    persona_individual_sub: 'Obtenez une adresse numérique permanente en 3 minutes',
    persona_business: 'Entreprise',
    persona_business_sub: 'Vérifiez instantanément l\'identité de localisation d\'un client',
    forge_title: 'Forge d\'ID',
    forge_acquiring: 'Acquisition du Signal GPS...',
    forge_locked: 'Hexagone Verrouillé',
    forge_your_id: 'Votre Sentinel ID',
    forge_offline_safe: 'Fonctionne Hors Ligne',
    dash_trust: 'Score de Confiance',
    dash_nights: 'Nuits Vérifiées',
    dash_verified: 'Vérifié',
    verify_title: 'Oracle de Vérification Client',
    verify_search: 'Vérifier',
    verify_verified: 'VÉRIFIÉ',
    verify_pending: 'EN ATTENTE',
  }
};

/**
 * Get a translation string, falling back to English
 */
export function translate(lang, key) {
  return t[lang]?.[key] || t['en'][key] || key;
}

/**
 * Detect default language from country
 */
export function getDefaultLanguage(country) {
  const map = { Uganda: 'lg', Kenya: 'sw', Rwanda: 'fr', DRC: 'fr' };
  return map[country] || 'en';
}