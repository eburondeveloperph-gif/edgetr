/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AVAILABLE_LANGUAGES } from './constants';

export interface DetectionResult {
  language: string;
  confidence: number;
  bcp47: string;
  matchedTokens: string[];
  durationMs?: number;
}

// BCP-47 language codes mapped to available languages for speech recognition optimization
export const LANGUAGE_BCP47_MAP: Record<string, string> = {
  'Dutch (Flemish)': 'nl-BE',
  'Dutch': 'nl-NL',
  'English (US)': 'en-US',
  'English (UK)': 'en-GB',
  'Spanish': 'es-ES',
  'French': 'fr-FR',
  'German': 'de-DE',
  'Tagalog (Filipino)': 'tl-PH',
  'Italian': 'it-IT',
  'Portuguese (Portugal)': 'pt-PT',
  'Portuguese (Brazil)': 'pt-BR',
  'Russian': 'ru-RU',
  'Arabic': 'ar-SA',
  'Arabic (Moroccan)': 'ar-MA',
  'Chinese (Simplified)': 'zh-CN',
  'Chinese (Traditional)': 'zh-TW',
  'Japanese': 'ja-JP',
  'Korean': 'ko-KR',
  'Hindi': 'hi-IN',
  'Turkish': 'tr-TR',
  'Polish': 'pl-PL',
  'Ukrainian': 'uk-UA',
  'Indonesian': 'id-ID',
  'Greek': 'el-GR',
  'Swedish': 'sv-SE',
  'Danish': 'da-DK',
  'Norwegian': 'no-NO',
  'Finnish': 'fi-FI',
  'Romanian': 'ro-RO',
  'Czech': 'cs-CZ',
  'Hungarian': 'hu-HU',
  'Bulgarian': 'bg-BG',
  'Croatian': 'hr-HR',
  'Serbian': 'sr-RS',
  'Slovak': 'sk-SK',
  'Slovenian': 'sl-SI',
  'Lithuanian': 'lt-LT',
  'Latvian': 'lv-LV',
  'Estonian': 'et-EE',
  'Hebrew': 'he-IL',
  'Thai': 'th-TH',
  'Vietnamese': 'vi-VN',
  'Albanian': 'sq-AL',
  'Afrikaans': 'af-ZA',
  'Bengali': 'bn-BD',
  'Catalan': 'ca-ES',
  'Swahili': 'sw-KE',
};

// High-frequency distinctive starter words, interrogatives, greetings, and stop words
// optimized for identifying the speaker's language within the first 1-3 seconds (2-6 words).
interface LanguageProfile {
  language: string;
  bcp47: string;
  scriptRegex?: RegExp;
  distinctiveWords: string[]; // Highly unique to this language
  commonWords: string[];      // Common markers / stopwords
  wordWeight?: number;
}

const PROFILES: LanguageProfile[] = [
  // 1. Tagalog / Filipino (High priority in system instructions)
  {
    language: 'Tagalog (Filipino)',
    bcp47: 'tl-PH',
    distinctiveWords: [
      'kumusta', 'kamusta', 'magandang', 'salamat', 'opo', 'po', 'ano', 'bakit',
      'saan', 'kailan', 'paano', 'sino', 'tulong', 'masakit', 'gamot', 'doktor',
      'mabuti', 'meron', 'wala', 'hindi', 'oo', 'ayaw', 'gusto', 'sandali',
      'dito', 'doon', 'nandito', 'nasaan', 'umaga', 'tanghali', 'hapon', 'gabi',
      'pasensya', 'pakiusap', 'ingat', 'buhay', 'bahay', 'anak', 'asawa',
      'tatay', 'nanay', 'ate', 'kuya', 'ospital', 'lagnat', 'ubo'
    ],
    commonWords: [
      'ang', 'ng', 'mga', 'sa', 'ay', 'ko', 'mo', 'niya', 'natin', 'namin',
      'ninyo', 'nila', 'ako', 'ikaw', 'siya', 'tayo', 'kami', 'kayo', 'sila',
      'ito', 'iyan', 'iyon', 'may', 'at', 'o', 'pero', 'kasi', 'dahil', 'kung',
      'na', 'pa', 'lang', 'naman', 'din', 'rin', 'ba', 'kaya'
    ],
    wordWeight: 1.35
  },

  // 2. Spanish
  {
    language: 'Spanish',
    bcp47: 'es-ES',
    distinctiveWords: [
      'hola', 'buenos', 'buenas', 'días', 'tardes', 'noches', 'gracias', 'muchas',
      'por favor', 'favor', 'cómo', 'como', 'estás', 'estas', 'está', 'esta',
      'dónde', 'donde', 'cuándo', 'cuando', 'por qué', 'porque', 'quién', 'quien',
      'ayuda', 'dolor', 'médico', 'medico', 'enfermo', 'enfermedad', 'pastilla',
      'hospital', 'necesito', 'quiero', 'tengo', 'siento', 'tengo', 'cabeza',
      'estómago', 'fiebre', 'pecho', 'señor', 'señora', 'amigo', 'adiós', 'adios'
    ],
    commonWords: [
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero',
      'de', 'en', 'con', 'por', 'para', 'que', 'qué', 'es', 'son', 'yo', 'tú',
      'él', 'ella', 'nosotros', 'ustedes', 'ellos', 'mi', 'tu', 'su', 'sí', 'no',
      'muy', 'bien', 'mal', 'más', 'pero'
    ],
    wordWeight: 1.15
  },

  // 3. French
  {
    language: 'French',
    bcp47: 'fr-FR',
    distinctiveWords: [
      'bonjour', 'bonsoir', 'salut', 'merci', 'beaucoup', 's\'il vous plaît',
      'sil vous plait', 'svp', 'comment', 'pourquoi', 'où', 'quand', 'qui',
      'aidez-moi', 'aide', 'douleur', 'mal', 'médecin', 'medecin', 'docteur',
      'hopital', 'hôpital', 'médicament', 'malade', 'fièvre', 'fievre', 'ventre',
      'tête', 'tete', 'cœur', 'monsieur', 'madame', 'au revoir', 'pardon'
    ],
    commonWords: [
      'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'mais',
      'dans', 'en', 'sur', 'sous', 'avec', 'pour', 'ce', 'cette', 'ces',
      'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
      'est', 'sont', 'suis', 'ai', 'avez', 'avons', 'ont', 'fait', 'faire',
      'oui', 'non', 'pas', 'très', 'bien', 'mal', 'plus'
    ],
    wordWeight: 1.2
  },

  // 4. German
  {
    language: 'German',
    bcp47: 'de-DE',
    distinctiveWords: [
      'hallo', 'guten tag', 'guten morgen', 'guten abend', 'danke', 'vielen dank',
      'bitte', 'wie geht', 'woher', 'warum', 'wann', 'wo ist', 'hilfe', 'schmerzen',
      'arzt', 'doktor', 'krankenhaus', 'krank', 'medizin', 'tablette', 'kopfschmerzen',
      'bauchschmerzen', 'fieber', 'herz', 'tschüss', 'auf wiedersehen', 'entschuldigung'
    ],
    commonWords: [
      'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem',
      'und', 'oder', 'aber', 'in', 'an', 'auf', 'mit', 'für', 'von', 'zu',
      'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'sie', 'sie', 'mein', 'dein',
      'ist', 'sind', 'bin', 'war', 'haben', 'hat', 'wird', 'kann', 'muss',
      'ja', 'nein', 'nicht', 'sehr', 'gut', 'schlecht'
    ],
    wordWeight: 1.2
  },

  // 5. Dutch / Flemish
  {
    language: 'Dutch (Flemish)',
    bcp47: 'nl-BE',
    distinctiveWords: [
      'hallo', 'goeiedag', 'goeiemorgen', 'goeiemiddag', 'goedenavond', 'alstublieft',
      'alsjeblieft', 'dank u', 'dankuwel', 'dankjewel', 'hoe gaat', 'waarom', 'waar is',
      'wanneer', 'wie', 'wat is', 'pijn', 'dokter', 'arts', 'ziekenhuis', 'ziek',
      'geneesmiddel', 'medicatie', 'hoofdpijn', 'buikpijn', 'koorts', 'hart',
      'tot ziens', 'salut', 'dag', 'meneer', 'mevrouw', 'goeiedag'
    ],
    commonWords: [
      'de', 'het', 'een', 'en', 'of', 'maar', 'in', 'op', 'bij', 'met', 'voor',
      'van', 'naar', 'uit', 'over', 'ik', 'jij', 'je', 'hij', 'zij', 'ze', 'we',
      'wij', 'jullie', 'u', 'mijn', 'jouw', 'uw', 'zijn', 'haar', 'ons', 'onze',
      'is', 'zijn', 'ben', 'was', 'hebben', 'heeft', 'had', 'kan', 'moet',
      'ja', 'nee', 'niet', 'geen', 'zeer', 'erg', 'heel', 'goed', 'slecht'
    ],
    wordWeight: 1.25
  },

  // 6. English
  {
    language: 'English (US)',
    bcp47: 'en-US',
    distinctiveWords: [
      'hello', 'hi there', 'good morning', 'good afternoon', 'good evening',
      'thank you', 'thanks', 'please', 'how are you', 'what is', 'where is',
      'when is', 'why', 'who', 'help me', 'pain', 'hurts', 'doctor', 'physician',
      'hospital', 'sick', 'illness', 'medicine', 'headache', 'fever', 'stomach',
      'chest', 'emergency', 'appointment', 'excuse me', 'pardon'
    ],
    commonWords: [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'with', 'from', 'by', 'about', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'my', 'your', 'his', 'her', 'our', 'their', 'is', 'are', 'am', 'was',
      'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'can', 'could', 'should', 'would', 'will', 'yes', 'no', 'not', 'very'
    ],
    wordWeight: 1.1
  },

  // 7. Italian
  {
    language: 'Italian',
    bcp47: 'it-IT',
    distinctiveWords: [
      'ciao', 'buongiorno', 'buonasera', 'buonanotte', 'grazie', 'molte grazie',
      'per favore', 'per piacere', 'come stai', 'dov\'è', 'dove', 'quando',
      'perché', 'perche', 'chi', 'aiuto', 'dolore', 'male', 'dottore', 'medico',
      'ospedale', 'malato', 'medicina', 'febbre', 'testa', 'stomaco', 'arrivederci',
      'scusa', 'scusi'
    ],
    commonWords: [
      'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'e', 'o', 'ma',
      'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'che', 'cosa',
      'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro', 'mio', 'tuo', 'suo',
      'è', 'sono', 'sei', 'siamo', 'siete', 'ho', 'hai', 'ha', 'abbiamo',
      'sì', 'no', 'non', 'molto', 'bene', 'male'
    ],
    wordWeight: 1.2
  },

  // 8. Portuguese
  {
    language: 'Portuguese (Portugal)',
    bcp47: 'pt-PT',
    distinctiveWords: [
      'olá', 'ola', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'obrigado',
      'obrigada', 'por favor', 'como vai', 'onde', 'quando', 'porquê', 'porque',
      'ajuda', 'socorro', 'dor', 'médico', 'doutor', 'hospital', 'doente',
      'remédio', 'febre', 'cabeça', 'estômago', 'adeus', 'com licença'
    ],
    commonWords: [
      'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'e', 'ou', 'mas',
      'de', 'em', 'com', 'por', 'para', 'que', 'eu', 'tu', 'ele', 'ela',
      'nós', 'vocês', 'eles', 'meu', 'teu', 'seu', 'é', 'são', 'estou',
      'sim', 'não', 'muito', 'bem', 'mal'
    ],
    wordWeight: 1.2
  },

  // 9. Turkish
  {
    language: 'Turkish',
    bcp47: 'tr-TR',
    distinctiveWords: [
      'merhaba', 'selam', 'günaydın', 'iyi günler', 'iyi akşamlar', 'teşekkür',
      'teşekkürler', 'sağol', 'lütfen', 'nasılsınız', 'nasıl', 'nerede', 'ne zaman',
      'neden', 'kim', 'yardım', 'imdat', 'ağrı', 'sancı', 'doktor', 'hastane',
      'hasta', 'ilaç', 'ateş', 'baş', 'mide', 'hoşça kal', 'özür dilerim'
    ],
    commonWords: [
      've', 'veya', 'ama', 'fakat', 'için', 'ile', 'ben', 'sen', 'o', 'biz',
      'siz', 'onlar', 'bu', 'şu', 'var', 'yok', 'evet', 'hayır', 'çok', 'iyi',
      'kötü', 'bir', 'değil'
    ],
    wordWeight: 1.3
  },

  // 10. Arabic (Script & Latin)
  {
    language: 'Arabic',
    bcp47: 'ar-SA',
    scriptRegex: /[\u0600-\u06FF]/,
    distinctiveWords: [
      'marhaba', 'ahlan', 'salam', 'shukran', 'afwan', 'min fadlik', 'kayfa',
      'ayna', 'mata', 'limadha', 'musa\'ada', 'alam', 'tabib', 'mustashfa',
      'marid', 'dawa', 'harara', 'ra\'s', 'na\'am', 'la'
    ],
    commonWords: ['al', 'wa', 'fi', 'min', 'ila', 'an', 'anna', 'la'],
    wordWeight: 1.5
  },

  // 11. Russian (Cyrillic & Latin)
  {
    language: 'Russian',
    bcp47: 'ru-RU',
    scriptRegex: /[\u0400-\u04FF]/,
    distinctiveWords: [
      'здравствуйте', 'привет', 'спасибо', 'пожалуйста', 'как дела', 'где',
      'когда', 'почему', 'помощь', 'помогите', 'боль', 'болит', 'врач', 'доктор',
      'больница', 'больной', 'лекарство', 'температура', 'голова', 'живот',
      'да', 'нет', 'хорошо', 'плохо'
    ],
    commonWords: ['и', 'в', 'не', 'на', 'я', 'что', 'тот', 'быть', 'с', 'он', 'а', 'как', 'это', 'по'],
    wordWeight: 1.4
  },

  // 12. Ukrainian
  {
    language: 'Ukrainian',
    bcp47: 'uk-UA',
    scriptRegex: /[іїєґІЇЄҐ]/,
    distinctiveWords: [
      'добрий день', 'привіт', 'дякую', 'будь ласка', 'як справи', 'де',
      'коли', 'чому', 'допомога', 'допоможіть', 'біль', 'болить', 'лікар',
      'лікарня', 'ліки', 'температура', 'голова', 'живіт', 'так', 'ні'
    ],
    commonWords: ['і', 'в', 'не', 'на', 'я', 'що', 'з', 'він', 'як', 'це', 'до'],
    wordWeight: 1.6
  },

  // 13. Chinese (Simplified/Traditional)
  {
    language: 'Chinese (Simplified)',
    bcp47: 'zh-CN',
    scriptRegex: /[\u4E00-\u9FFF]/,
    distinctiveWords: ['nihao', 'xiexie', 'qing', 'yisheng', 'tong', 'yiyuan'],
    commonWords: [],
    wordWeight: 1.5
  },

  // 14. Japanese
  {
    language: 'Japanese',
    bcp47: 'ja-JP',
    scriptRegex: /[\u3040-\u309F\u30A0-\u30FF]/,
    distinctiveWords: ['konnichiwa', 'arigatou', 'sumimasen', 'onegaishimasu', 'isha', 'itai'],
    commonWords: [],
    wordWeight: 1.6
  },

  // 15. Korean
  {
    language: 'Korean',
    bcp47: 'ko-KR',
    scriptRegex: /[\uAC00-\uD7AF\u1100-\u11FF]/,
    distinctiveWords: ['annyeonghaseyo', 'gamsahamnida', 'uisa', 'apeuda', 'byeongwon'],
    commonWords: [],
    wordWeight: 1.6
  },

  // 16. Hindi
  {
    language: 'Hindi',
    bcp47: 'hi-IN',
    scriptRegex: /[\u0900-\u097F]/,
    distinctiveWords: ['namaste', 'dhanyawad', 'kripya', 'doctor', 'dard', 'aspataal'],
    commonWords: [],
    wordWeight: 1.5
  },

  // 17. Polish
  {
    language: 'Polish',
    bcp47: 'pl-PL',
    distinctiveWords: [
      'cześć', 'czesc', 'dzień dobry', 'dzien dobry', 'dziękuję', 'dziekuje',
      'proszę', 'prosze', 'jak się masz', 'gdzie', 'kiedy', 'dlaczego', 'pomoc',
      'ból', 'bol', 'lekarz', 'szpital', 'chory', 'leki', 'gorączka', 'glowa',
      'tak', 'nie', 'do widzenia'
    ],
    commonWords: ['i', 'w', 'na', 'z', 'do', 'że', 'ze', 'się', 'sie', 'to', 'jest', 'nie', 'o'],
    wordWeight: 1.3
  },

  // 18. Indonesian
  {
    language: 'Indonesian',
    bcp47: 'id-ID',
    distinctiveWords: [
      'halo', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam',
      'terima kasih', 'tolong', 'silakan', 'apa kabar', 'di mana', 'kapan',
      'mengapa', 'kenapa', 'bantuan', 'sakit', 'dokter', 'rumah sakit', 'obat',
      'demam', 'kepala', 'perut', 'ya', 'tidak', 'sampai jumpa'
    ],
    commonWords: ['dan', 'di', 'ke', 'dari', 'yang', 'ini', 'itu', 'untuk', 'dengan', 'saya', 'anda', 'dia', 'mereka', 'ada'],
    wordWeight: 1.3
  }
];

/**
 * Clean and tokenize raw input text into lowercase word tokens
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics for flexible matching
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/**
 * Intelligent Language Detector
 * Identifies the speaker's language within the first few seconds of input.
 */
export function detectLanguageFromSample(
  sampleText: string,
  staffLanguage: string = 'Dutch (Flemish)'
): DetectionResult | null {
  if (!sampleText || sampleText.trim().length < 2) {
    return null;
  }

  const rawText = sampleText.trim();
  const startTime = performance.now();

  // 1. Check Unicode Scripts first (extremely high confidence, fast 0ms check)
  for (const profile of PROFILES) {
    if (profile.scriptRegex && profile.scriptRegex.test(rawText)) {
      const matchCount = (rawText.match(new RegExp(profile.scriptRegex, 'g')) || []).length;
      if (matchCount >= 2) {
        return {
          language: profile.language,
          confidence: Math.min(0.98, 0.8 + matchCount * 0.05),
          bcp47: profile.bcp47,
          matchedTokens: [profile.language + ' Script'],
          durationMs: Math.round(performance.now() - startTime),
        };
      }
    }
  }

  // 2. Tokenize input for lexical/word matching
  const tokens = tokenize(rawText);
  const rawLower = rawText.toLowerCase();

  const scores: { profile: LanguageProfile; score: number; matched: string[] }[] = [];

  for (const profile of PROFILES) {
    let score = 0;
    const matched: string[] = [];
    const weight = profile.wordWeight || 1.0;

    // Check multi-word phrase patterns in raw string
    for (const phrase of profile.distinctiveWords) {
      if (phrase.includes(' ') && rawLower.includes(phrase)) {
        score += 3.5 * weight;
        matched.push(phrase);
      }
    }

    // Check individual tokens
    for (const token of tokens) {
      if (profile.distinctiveWords.includes(token)) {
        score += 2.0 * weight;
        matched.push(token);
      } else if (profile.commonWords.includes(token)) {
        score += 0.7 * weight;
        matched.push(token);
      }
    }

    if (score > 0) {
      scores.push({ profile, score, matched });
    }
  }

  if (scores.length === 0) {
    return null;
  }

  // Sort by highest score
  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];

  // Calculate confidence ratio
  const runnerUpScore = scores[1]?.score || 0;
  const diff = top.score - runnerUpScore;
  const confidence = Math.min(0.99, Math.max(0.55, 0.5 + (top.score / 10) * 0.3 + (diff > 1.5 ? 0.15 : 0)));

  // Minimum threshold check (needs at least one distinctive word or multiple common words)
  if (top.score < 1.4) {
    return null;
  }

  return {
    language: top.profile.language,
    confidence: Math.round(confidence * 100) / 100,
    bcp47: top.profile.bcp47,
    matchedTokens: Array.from(new Set(top.matched)),
    durationMs: Math.round(performance.now() - startTime),
  };
}

/**
 * Checks if the detected language matches the staff's configured primary language
 */
export function isStaffLanguage(detectedLang: string, staffLang: string): boolean {
  if (!detectedLang || !staffLang) return false;
  const d = detectedLang.toLowerCase();
  const s = staffLang.toLowerCase();
  if (d === s) return true;
  if ((s.includes('dutch') || s.includes('flemish')) && (d.includes('dutch') || d.includes('flemish'))) return true;
  if (s.includes('english') && d.includes('english')) return true;
  return false;
}

/**
 * Helper to retrieve the BCP47 code for speech recognition
 */
export function getBcp47ForLanguage(languageName: string): string {
  if (LANGUAGE_BCP47_MAP[languageName]) {
    return LANGUAGE_BCP47_MAP[languageName];
  }
  const found = Object.keys(LANGUAGE_BCP47_MAP).find(k =>
    k.toLowerCase().includes(languageName.toLowerCase()) ||
    languageName.toLowerCase().includes(k.toLowerCase())
  );
  return found ? LANGUAGE_BCP47_MAP[found] : 'nl-BE';
}
