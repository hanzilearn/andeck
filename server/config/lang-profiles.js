// server/config/lang-profiles.js — cấu hình ngôn ngữ (zh-vi, en-vi, ja-vi, ko-vi, de-vi)

const LANG_PROFILES = {
  'zh-vi': {
    langPair: 'zh-vi',
    label: 'Trung → Việt',
    primaryLabel: 'Chữ Hán',
    readingLabel: 'Pinyin',
    meaningLabel: 'Nghĩa',
    requiredFields: ['primary', 'meaning'],
    hasReading: true,
    hasReadingQuiz: true,
    readingRequired: false,
    ttsLang: 'zh-CN',
    speechLang: 'zh-CN',
    quizPrimaryMode: true,
    importFields: ['primary', 'reading', 'meaning', 'exPrimary', 'exReading', 'exMeaning', 'pos', 'note']
  },
  'en-vi': {
    langPair: 'en-vi',
    label: 'Anh → Việt',
    primaryLabel: 'Từ',
    readingLabel: 'Phiên âm',
    meaningLabel: 'Nghĩa',
    requiredFields: ['primary', 'meaning'],
    hasReading: true,
    readingRequired: false,
    ttsLang: 'en-US',
    speechLang: 'en-US',
    quizPrimaryMode: true,
    importFields: ['primary', 'reading', 'meaning', 'exPrimary', 'exReading', 'exMeaning', 'pos', 'note']
  },
  'ja-vi': {
    langPair: 'ja-vi',
    label: 'Nhật → Việt',
    primaryLabel: 'Từ',
    readingLabel: 'Furigana / Romaji',
    meaningLabel: 'Nghĩa',
    requiredFields: ['primary', 'meaning'],
    hasReading: true,
    readingRequired: false,
    ttsLang: 'ja-JP',
    speechLang: 'ja-JP',
    quizPrimaryMode: true,
    importFields: ['primary', 'reading', 'meaning', 'exPrimary', 'exReading', 'exMeaning', 'pos', 'note']
  },
  'ko-vi': {
    langPair: 'ko-vi',
    label: 'Hàn → Việt',
    primaryLabel: 'Từ',
    readingLabel: 'Romanization',
    meaningLabel: 'Nghĩa',
    requiredFields: ['primary', 'meaning'],
    hasReading: true,
    readingRequired: false,
    ttsLang: 'ko-KR',
    speechLang: 'ko-KR',
    quizPrimaryMode: true,
    importFields: ['primary', 'reading', 'meaning', 'exPrimary', 'exReading', 'exMeaning', 'pos', 'note']
  },
  'de-vi': {
    langPair: 'de-vi',
    label: 'Đức → Việt',
    primaryLabel: 'Từ',
    readingLabel: 'Phiên âm',
    meaningLabel: 'Nghĩa',
    requiredFields: ['primary', 'meaning'],
    hasReading: true,
    readingRequired: false,
    ttsLang: 'de-DE',
    speechLang: 'de-DE',
    quizPrimaryMode: true,
    importFields: ['primary', 'reading', 'meaning', 'exPrimary', 'exReading', 'exMeaning', 'pos', 'note']
  }
};

function getLangProfile(langPair) {
  return LANG_PROFILES[langPair] || null;
}

function listLangProfiles() {
  return Object.values(LANG_PROFILES);
}

function listLangPairs() {
  return Object.keys(LANG_PROFILES);
}

function isValidLangPair(langPair) {
  return Boolean(LANG_PROFILES[langPair]);
}

module.exports = {
  LANG_PROFILES,
  getLangProfile,
  listLangProfiles,
  listLangPairs,
  isValidLangPair
};
