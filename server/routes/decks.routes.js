// server/routes/decks.routes.js
const express = require('express');
const crypto = require('crypto');
const User = require('../models/user');
const Deck = require('../models/deck');
const Star = require('../models/star');
const Item = require('../models/item');
const { auth } = require('../middleware/auth');
const { DEFAULT_DECK_QUOTA, DEFAULT_WORD_QUOTA } = require('../config');
const { listLangProfiles, listLangPairs, isValidLangPair } = require('../config/lang-profiles');
const { generateDeckId, generateWordId, deckLevelKey } = require('../services/deck-ids');
const { filterValidWords, normalizeWordInput } = require('../services/word-validation');

const router = express.Router();
const MAX_IMPORT_WORDS = 500;

router.get('/lang-profiles', (req, res) => {
  res.json({
    pairs: listLangPairs(),
    profiles: listLangProfiles()
  });
});

async function getUserQuotas(email) {
  const user = await User.findOne({ email });
  return {
    deckQuota: user?.deckQuota ?? DEFAULT_DECK_QUOTA,
    wordQuota: user?.wordQuota ?? DEFAULT_WORD_QUOTA
  };
}

async function cleanupDeckLevelData(email, deckId) {
  const levelKey = deckLevelKey(deckId);
  await Star.deleteMany({ email, level: levelKey });
  await Item.deleteMany({ email, level: levelKey });
}

function defaultImportDeckName() {
  return 'Import ' + new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function allocateImportDefaultName(email) {
  const base = defaultImportDeckName();
  const namePattern = new RegExp('^' + escapeRegex(base) + '( #(\\d+))?$');
  const existing = await Deck.find({ email, name: namePattern }, { name: 1 }).lean();

  let maxSuffix = 0;
  existing.forEach((d) => {
    const m = namePattern.exec(d.name);
    if (!m) return;
    const suffix = m[2] ? parseInt(m[2], 10) : 1;
    if (suffix > maxSuffix) maxSuffix = suffix;
  });

  const deckName = maxSuffix === 0 ? base : base + ' #' + (maxSuffix + 1);
  if (deckName.length > 50) {
    return { ok: false, error: 'Ten qua dai (toi da 50 ky tu)' };
  }
  return { ok: true, name: deckName };
}

function resolveImportDeckName(rawName) {
  if (rawName == null || String(rawName).trim().length === 0) {
    return { ok: true, useDefault: true };
  }
  const trimmed = String(rawName).trim();
  if (trimmed.length > 50) {
    return { ok: false, error: 'Ten qua dai (toi da 50 ky tu)' };
  }
  return { ok: true, name: trimmed };
}

router.get('/', auth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const decks = await Deck.aggregate([
      { $match: { email: userEmail } },
      {
        $project: {
          _id: 0,
          deckId: 1,
          name: 1,
          description: 1,
          langPair: 1,
          createdAt: 1,
          updatedAt: 1,
          wordCount: { $size: { $ifNull: ['$words', []] } }
        }
      },
      { $sort: { updatedAt: -1 } }
    ]);
    const { deckQuota, wordQuota } = await getUserQuotas(userEmail);
    const totalWords = decks.reduce((sum, d) => sum + (d.wordCount || 0), 0);

    res.json({
      deckQuota,
      wordQuota,
      totalWords,
      decks
    });
  } catch (err) {
    console.error('GET /api/decks:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { deckQuota, wordQuota } = await getUserQuotas(req.user.email);
    const count = await Deck.countDocuments({ email: req.user.email });
    if (count >= deckQuota) {
      return res.status(403).json({ error: 'Da dat toi da ' + deckQuota + ' deck', code: 'QUOTA_EXCEEDED' });
    }

    let { name, description, langPair } = req.body;
    if (!langPair || !isValidLangPair(langPair)) {
      return res.status(400).json({ error: 'langPair khong hop le' });
    }
    if (!name || name.trim().length === 0) return res.status(400).json({ error: 'Thieu ten deck' });
    if (name.trim().length > 50) return res.status(400).json({ error: 'Ten qua dai (toi da 50 ky tu)' });

    let deckId = generateDeckId();
    while (await Deck.findOne({ deckId })) deckId = generateDeckId();

    const deck = await Deck.create({
      email: req.user.email,
      deckId,
      name: name.trim(),
      description: (description || '').trim(),
      langPair
    });

    res.json({
      deck: {
        deckId: deck.deckId,
        name: deck.name,
        description: deck.description,
        langPair: deck.langPair,
        wordCount: 0,
        createdAt: deck.createdAt
      },
      deckQuota,
      wordQuota
    });
  } catch (err) {
    console.error('POST /api/decks:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.post('/import', auth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { deckQuota, wordQuota } = await getUserQuotas(userEmail);
    const deckCount = await Deck.countDocuments({ email: userEmail });
    if (deckCount >= deckQuota) {
      return res.status(403).json({ error: 'Da dat toi da ' + deckQuota + ' deck', code: 'QUOTA_EXCEEDED' });
    }

    const langPair = req.body?.langPair;
    if (!langPair || !isValidLangPair(langPair)) {
      return res.status(400).json({ error: 'langPair khong hop le' });
    }

    const nameResult = resolveImportDeckName(req.body?.name);
    if (!nameResult.ok) return res.status(400).json({ error: nameResult.error });

    let deckName;
    if (nameResult.useDefault) {
      const allocResult = await allocateImportDefaultName(userEmail);
      if (!allocResult.ok) return res.status(400).json({ error: allocResult.error });
      deckName = allocResult.name;
    } else {
      deckName = nameResult.name;
    }

    const rawWords = req.body?.words;
    if (!Array.isArray(rawWords)) return res.status(400).json({ error: 'Thieu mang words' });
    if (rawWords.length > MAX_IMPORT_WORDS) {
      return res.status(400).json({ error: 'Mang words qua dai (toi da ' + MAX_IMPORT_WORDS + ' phan tu)' });
    }

    const { skipped, validWords } = filterValidWords(rawWords, langPair);
    const toInsert = validWords.slice(0, wordQuota);
    if (toInsert.length === 0) {
      return res.status(400).json({ error: 'Khong co tu hop le de import' });
    }
    const overQuota = Math.max(0, validWords.length - wordQuota);

    const deckId = crypto.randomUUID();
    await Deck.create({
      email: userEmail,
      deckId,
      name: deckName,
      description: '',
      langPair,
      words: toInsert
    });

    res.json({
      success: true,
      deckId,
      deckName,
      langPair,
      inserted: toInsert.length,
      skipped,
      overQuota
    });
  } catch (err) {
    console.error('POST /api/decks/import:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const deck = await Deck.findOne({ email: req.user.email, deckId: req.params.id }, '-__v');
    if (!deck) return res.status(404).json({ error: 'Khong tim thay deck' });
    res.json({ deck });
  } catch (err) {
    console.error('GET /api/decks/:id:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.get('/:id/export', auth, async (req, res) => {
  try {
    const deck = await Deck.findOne({ email: req.user.email, deckId: req.params.id }, '-__v');
    if (!deck) return res.status(404).json({ error: 'Khong tim thay deck' });

    const payload = {
      format: 'andeck',
      version: 1,
      exportedAt: new Date().toISOString(),
      deck: {
        deckId: deck.deckId,
        name: deck.name,
        description: deck.description,
        langPair: deck.langPair,
        words: deck.words || []
      }
    };

    const filename = 'andeck-' + deck.deckId.slice(0, 8) + '.json';
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error('GET /api/decks/:id/export:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const deck = await Deck.findOne({ email: req.user.email, deckId: req.params.id });
    if (!deck) return res.status(404).json({ error: 'Khong tim thay deck' });

    let { name, description } = req.body;
    if (name !== undefined) {
      name = name.trim();
      if (name.length === 0) return res.status(400).json({ error: 'Ten khong hop le' });
      if (name.length > 50) return res.status(400).json({ error: 'Ten qua dai' });
      deck.name = name;
    }
    if (description !== undefined) deck.description = description.trim();
    deck.updatedAt = new Date();
    await deck.save();

    res.json({
      ok: true,
      deck: {
        deckId: deck.deckId,
        name: deck.name,
        description: deck.description,
        langPair: deck.langPair
      }
    });
  } catch (err) {
    console.error('PUT /api/decks/:id:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deck = await Deck.findOne({ email: req.user.email, deckId: req.params.id });
    if (!deck) return res.status(404).json({ error: 'Khong tim thay deck' });
    await Deck.deleteOne({ email: req.user.email, deckId: req.params.id });
    await cleanupDeckLevelData(req.user.email, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/decks/:id:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.delete('/:id/words', auth, async (req, res) => {
  try {
    const deck = await Deck.findOne({ email: req.user.email, deckId: req.params.id });
    if (!deck) return res.status(404).json({ error: 'Khong tim thay deck' });

    const ids = req.body?.ids;
    if (Array.isArray(ids) && ids.length > 0) {
      const idSet = new Set(ids.map(String));
      const before = deck.words.length;
      deck.words = deck.words.filter((w) => !idSet.has(w.id));
      if (deck.words.length === before) {
        return res.status(404).json({ error: 'Khong tim thay tu' });
      }
    } else {
      deck.words = [];
      await cleanupDeckLevelData(req.user.email, req.params.id);
    }

    deck.updatedAt = new Date();
    deck.markModified('words');
    await deck.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/decks/:id/words:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.post('/:id/words/bulk', auth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const deck = await Deck.findOne({ email: userEmail, deckId: req.params.id });
    if (!deck) return res.status(404).json({ error: 'Khong tim thay deck' });

    const { wordQuota } = await getUserQuotas(userEmail);
    const remaining = wordQuota - (deck.words?.length || 0);
    if (remaining <= 0) {
      return res.status(400).json({ error: 'Da dat gioi han ' + wordQuota + ' tu/deck.' });
    }

    const rawWords = req.body?.words;
    if (!Array.isArray(rawWords)) return res.status(400).json({ error: 'Thieu mang words' });
    if (rawWords.length > MAX_IMPORT_WORDS) {
      return res.status(400).json({ error: 'Mang words qua dai (toi da ' + MAX_IMPORT_WORDS + ' phan tu)' });
    }

    const { skipped, validWords } = filterValidWords(rawWords, deck.langPair);
    const toInsert = validWords.slice(0, remaining);
    const overQuota = Math.max(0, validWords.length - remaining);
    if (toInsert.length === 0) {
      return res.status(400).json({ error: 'Khong co tu hop le de import' });
    }

    const updated = await Deck.findOneAndUpdate(
      { email: userEmail, deckId: req.params.id },
      { $push: { words: { $each: toInsert } }, $set: { updatedAt: new Date() } },
      { new: true }
    );

    res.json({
      success: true,
      deckId: updated.deckId,
      deckName: updated.name,
      inserted: toInsert.length,
      skipped,
      overQuota
    });
  } catch (err) {
    console.error('POST /api/decks/:id/words/bulk:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.post('/:id/words', auth, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const deck = await Deck.findOne({ email: userEmail, deckId: req.params.id });
    if (!deck) return res.status(404).json({ error: 'Deck khong ton tai.' });

    const { wordQuota } = await getUserQuotas(userEmail);
    if ((deck.words?.length || 0) >= wordQuota) {
      return res.status(400).json({ error: 'Da dat gioi han ' + wordQuota + ' tu/deck.' });
    }

    const normalized = normalizeWordInput(req.body, deck.langPair);
    if (!normalized) {
      return res.status(400).json({ error: 'Thieu primary hoac meaning' });
    }

    const word = { ...normalized, id: generateWordId() };
    const updated = await Deck.findOneAndUpdate(
      { email: userEmail, deckId: req.params.id },
      { $push: { words: word }, $set: { updatedAt: new Date() } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Deck khong ton tai.' });

    res.json({ ok: true, word });
  } catch (err) {
    console.error('POST /api/decks/:id/words:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.put('/:id/words/:wordId', auth, async (req, res) => {
  try {
    const deck = await Deck.findOne({ email: req.user.email, deckId: req.params.id });
    if (!deck) return res.status(404).json({ error: 'Khong tim thay deck' });

    const word = deck.words.find((w) => w.id === req.params.wordId);
    if (!word) return res.status(404).json({ error: 'Khong tim thay tu' });

    const fields = ['primary', 'reading', 'meaning', 'exPrimary', 'exReading', 'exMeaning', 'pos', 'note'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) word[f] = String(req.body[f]).trim();
    });

    if (!word.primary || !word.meaning) {
      return res.status(400).json({ error: 'Primary va meaning khong duoc de trong' });
    }

    deck.updatedAt = new Date();
    deck.markModified('words');
    await deck.save();
    res.json({ ok: true, word });
  } catch (err) {
    console.error('PUT /api/decks/:id/words/:wordId:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

router.delete('/:id/words/:wordId', auth, async (req, res) => {
  try {
    const deck = await Deck.findOne({ email: req.user.email, deckId: req.params.id });
    if (!deck) return res.status(404).json({ error: 'Khong tim thay deck' });

    const before = deck.words.length;
    deck.words = deck.words.filter((w) => w.id !== req.params.wordId);
    if (deck.words.length === before) return res.status(404).json({ error: 'Khong tim thay tu' });

    deck.updatedAt = new Date();
    deck.markModified('words');
    await deck.save();
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/decks/:id/words/:wordId:', err);
    res.status(500).json({ error: 'Loi he thong' });
  }
});

module.exports = router;
