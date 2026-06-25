// server/services/word-validation.js — validate/normalize word theo lang profile
const { getLangProfile } = require('../config/lang-profiles');
const { generateWordId } = require('./deck-ids');

function trim(val) {
  return String(val ?? '').trim();
}

function mapLegacyHanziFields(item) {
  return {
    primary: trim(item.hanzi ?? item.primary),
    reading: trim(item.pinyin ?? item.reading),
    meaning: trim(item.meaning),
    exPrimary: trim(item.ex_hanzi ?? item.exPrimary),
    exReading: trim(item.ex_pinyin ?? item.exReading),
    exMeaning: trim(item.ex_viet ?? item.exMeaning),
    pos: trim(item.tu_loai ?? item.pos),
    note: trim(item.note)
  };
}

function mapGenericFields(item) {
  return {
    primary: trim(item.primary),
    reading: trim(item.reading),
    meaning: trim(item.meaning),
    exPrimary: trim(item.exPrimary),
    exReading: trim(item.exReading),
    exMeaning: trim(item.exMeaning),
    pos: trim(item.pos),
    note: trim(item.note)
  };
}

function normalizeWordInput(item, langPair) {
  if (!item || typeof item !== 'object') return null;

  const profile = getLangProfile(langPair);
  if (!profile) return null;

  const mapped = (langPair === 'zh-vi' && item.hanzi && !item.primary)
    ? mapLegacyHanziFields(item)
    : mapGenericFields(item);

  if (!mapped.primary || !mapped.meaning) return null;
  if (profile.readingRequired && !mapped.reading) return null;

  return {
    id: item.id ? String(item.id) : generateWordId(),
    primary: mapped.primary,
    reading: mapped.reading,
    meaning: mapped.meaning,
    exPrimary: mapped.exPrimary,
    exReading: mapped.exReading,
    exMeaning: mapped.exMeaning,
    pos: mapped.pos,
    note: mapped.note
  };
}

function filterValidWords(rawWords, langPair) {
  let skipped = 0;
  const validWords = [];

  if (!Array.isArray(rawWords)) {
    return { skipped: 0, validWords: [] };
  }

  rawWords.forEach((item) => {
    const word = normalizeWordInput(item, langPair);
    if (!word) {
      skipped++;
      return;
    }
    validWords.push(word);
  });

  return { skipped, validWords };
}

function normalizeWordUpdate(body, langPair) {
  const base = normalizeWordInput({ ...body, id: body.id || 'tmp' }, langPair);
  if (!base) return null;
  return base;
}

module.exports = {
  normalizeWordInput,
  filterValidWords,
  normalizeWordUpdate
};
