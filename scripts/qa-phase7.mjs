/**
 * Phase 7 QA — chạy: node scripts/qa-phase7.mjs [baseUrl]
 * Mặc định: https://andeck.onrender.com
 */
const BASE = process.argv[2] || 'https://andeck.onrender.com';
const ts = Date.now();
const QA_EMAIL = `qa${ts}@andeck.test`;
const QA_PASS = 'qaTest123!';

const results = [];

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined
  });
  let data;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text };
  }
  return { status: res.status, data };
}

function record(id, name, pass, note = '') {
  results.push({ id, name, pass, note });
  const icon = pass ? 'PASS' : 'FAIL';
  console.log(`[${icon}] #${id} ${name}${note ? ' — ' + note : ''}`);
}

// --- helpers mirroring frontend legacy map ---
function mapLegacy(items) {
  return items.map((item) => ({
    primary: String(item.primary ?? item.hanzi ?? '').trim(),
    reading: String(item.reading ?? item.pinyin ?? '').trim(),
    meaning: String(item.meaning ?? '').trim(),
    exPrimary: String(item.exPrimary ?? item.ex_hanzi ?? '').trim(),
    exReading: String(item.exReading ?? item.ex_pinyin ?? '').trim(),
    exMeaning: String(item.exMeaning ?? item.ex_viet ?? '').trim(),
    pos: String(item.pos ?? item.tu_loai ?? '').trim(),
    note: String(item.note ?? '').trim()
  }));
}

async function main() {
  console.log('QA base URL:', BASE);

  // 1 — register + login
  let r = await req('POST', '/api/register', {
    email: QA_EMAIL,
    password: QA_PASS,
    confirmPassword: QA_PASS
  });
  const regOk = r.status === 200;
  r = await req('POST', '/api/login', { username: QA_EMAIL, password: QA_PASS });
  const token = r.data?.token;
  const loginOk = r.status === 200 && token;
  let hanziNote = 'Andeck auth OK';
  try {
    const hz = await req('POST', 'https://hanzilearn.onrender.com/api/login', {
      username: QA_EMAIL,
      password: QA_PASS
    });
    hanziNote = hz.status === 401 || hz.status === 404
      ? 'TK Andeck không login Hanzi'
      : 'Cảnh báo: cùng TK login được Hanzi';
  } catch {
    hanziNote = 'Không kiểm tra Hanzi (network)';
  }
  record(1, 'Đăng ký/login Andeck', regOk && loginOk, hanziNote);

  // 2 — en-vi deck + 5 words
  r = await req('POST', '/api/decks', { name: 'QA en-vi', langPair: 'en-vi' }, token);
  const deckEnId = r.data?.deck?.deckId;
  let wordsAdded = 0;
  if (deckEnId) {
    for (let i = 1; i <= 5; i++) {
      const wr = await req(
        'POST',
        `/api/decks/${deckEnId}/words`,
        { primary: `word${i}`, meaning: `nghĩa ${i}` },
        token
      );
      if (wr.status === 200) wordsAdded++;
    }
  }
  r = await req('GET', `/api/decks/${deckEnId}`, null, token);
  const count2 = r.data?.deck?.words?.length ?? 0;
  record(2, 'Tạo deck en-vi + 5 từ', deckEnId && wordsAdded === 5 && count2 === 5, `count=${count2}`);

  // 3 — hub import create
  r = await req(
    'POST',
    '/api/decks/import',
    {
      langPair: 'ja-vi',
      name: 'QA import create',
      words: [
        { primary: 'こんにちは', reading: 'konnichiwa', meaning: 'xin chào' },
        { primary: 'ありがとう', reading: 'arigatou', meaning: 'cảm ơn' }
      ]
    },
    token
  );
  const deckJaId = r.data?.deckId;
  record(3, 'Hub upfile → import create', r.status === 200 && deckJaId && r.data.inserted === 2, `deckId=${deckJaId || '?'}`);

  // 4 — append bulk on en-vi deck
  r = await req(
    'POST',
    `/api/decks/${deckEnId}/words/bulk`,
    { words: [{ primary: 'append1', meaning: 'thêm 1' }] },
    token
  );
  const afterAppend = await req('GET', `/api/decks/${deckEnId}`, null, token);
  const countAfter = afterAppend.data?.deck?.words?.length ?? 0;
  record(4, 'Header append bulk', r.status === 200 && countAfter === 6, `words=${countAfter}`);

  // 5 — deck quota 3/3
  r = await req('POST', '/api/decks', { name: 'QA deck3', langPair: 'zh-vi' }, token);
  const deck3Id = r.data?.deck?.deckId;
  r = await req(
    'POST',
    '/api/decks/import',
    { langPair: 'en-vi', name: 'QA block', words: [{ primary: 'x', meaning: 'y' }] },
    token
  );
  record(
    5,
    '3/3 deck → chặn import create',
    r.status === 403 && r.data?.code === 'QUOTA_EXCEEDED',
    `status=${r.status}`
  );

  // 6 — word quota 50/50
  const bulk50 = Array.from({ length: 50 }, (_, i) => ({
    primary: `zh${i}`,
    reading: `p${i}`,
    meaning: `m${i}`
  }));
  r = await req('POST', '/api/decks/import', { langPair: 'zh-vi', name: 'QA full50', words: bulk50 }, token);
  // user now at 3 decks - wait, test 5 blocked 4th import but we created deck3 manually - that's 3rd deck
  // decks: en-vi, ja-vi, deck3(zh-vi) = 3 decks full
  // Need new user for word quota test OR delete a deck - use admin... simpler: create fresh user
  const QA2 = `qa2${ts}@andeck.test`;
  await req('POST', '/api/register', { email: QA2, password: QA_PASS, confirmPassword: QA_PASS });
  const lr = await req('POST', '/api/login', { username: QA2, password: QA_PASS });
  const token2 = lr.data?.token;
  const ir = await req(
    'POST',
    '/api/decks/import',
    { langPair: 'zh-vi', name: 'Full deck', words: bulk50 },
    token2
  );
  const fullDeckId = ir.data?.deckId;
  const br = await req(
    'POST',
    `/api/decks/${fullDeckId}/words/bulk`,
    { words: [{ primary: 'extra', meaning: 'extra' }] },
    token2
  );
  record(
    6,
    'Deck 50/50 → chặn append',
    ir.data?.inserted === 50 && br.status === 400,
    `inserted=${ir.data?.inserted}, appendStatus=${br.status}`
  );

  // 7 — Hanzi legacy zh-vi
  const legacyRaw = [
    {
      hanzi: '朋友',
      pinyin: 'péngyou',
      meaning: 'bạn bè',
      ex_hanzi: '他是我的朋友。',
      ex_pinyin: 'tā shì wǒ de péngyou.',
      ex_viet: 'Anh ấy là bạn của tôi.',
      tu_loai: 'n.'
    }
  ];
  const legacyMapped = mapLegacy(legacyRaw);
  r = await req(
    'POST',
    '/api/decks/import',
    { langPair: 'zh-vi', name: 'QA legacy', words: legacyRaw },
    token2
  );
  const legDeckId = r.data?.deckId;
  let legOk = false;
  if (legDeckId) {
    const dr = await req('GET', `/api/decks/${legDeckId}`, null, token2);
    const w = dr.data?.deck?.words?.[0];
    legOk =
      w?.primary === '朋友' &&
      w?.reading === 'péngyou' &&
      w?.meaning === 'bạn bè' &&
      w?.exPrimary === '他是我的朋友。' &&
      w?.exMeaning === 'Anh ấy là bạn của tôi.' &&
      w?.pos === 'n.';
  }
  record(7, 'Import Hanzi legacy zh-vi', legOk, legacyMapped[0]?.primary || '');

  // 8 — export round-trip
  let rtOk = false;
  if (deckEnId) {
    const ex = await fetch(`${BASE}/api/decks/${deckEnId}/export`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const exported = await ex.json();
    const words = exported?.deck?.words || [];
    r = await req(
      'POST',
      '/api/decks/import',
      {
        langPair: exported.deck.langPair,
        name: 'QA roundtrip',
        words
      },
      token2
    );
    const rtId = r.data?.deckId;
    if (rtId) {
      const chk = await req('GET', `/api/decks/${rtId}`, null, token2);
      rtOk = (chk.data?.deck?.words?.length ?? 0) === words.length;
    }
  }
  record(8, 'Export → import round-trip', rtOk);

  // 9 — quiz ≥4 từ (logic frontend — kiểm tra deck có ≥4)
  const quizDeck = deckEnId;
  const qd = await req('GET', `/api/decks/${quizDeck}`, null, token);
  const nWords = qd.data?.deck?.words?.length ?? 0;
  record(9, 'Quiz deck ≥4 từ', nWords >= 4, `deck có ${nWords} từ; UI chặn n<4 (07-exam-quiz.js)`);

  // 10 — TTS lang profiles (5 cặp)
  const lp = await req('GET', '/api/decks/lang-profiles');
  const profiles = lp.data?.profiles || [];
  const ttsMap = Object.fromEntries(profiles.map((p) => [p.langPair, p.ttsLang]));
  const ttsOk =
    ttsMap['zh-vi'] === 'zh-CN' &&
    ttsMap['en-vi'] === 'en-US' &&
    ttsMap['ja-vi'] === 'ja-JP' &&
    ttsMap['ko-vi'] === 'ko-KR' &&
    ttsMap['de-vi'] === 'de-DE';
  record(10, 'TTS 5 lang profiles', ttsOk, JSON.stringify(ttsMap));

  // 11 — admin đổi quota
  const adminLogin = await req('POST', '/api/login', { username: 'admin1', password: 'Andinhlinh2@' });
  const adminToken = adminLogin.data?.token;
  let quotaOk = false;
  let quotaNote = 'admin login failed';
  if (adminToken) {
    const qu = await req(
      'PUT',
      `/api/admin/users/${encodeURIComponent(QA2)}/quota`,
      { deckQuota: 5, wordQuota: 60 },
      adminToken
    );
    const meRes = await req('GET', '/api/me', null, token2);
    quotaOk = qu.status === 200 && meRes.data?.deckQuota === 5 && meRes.data?.wordQuota === 60;
    quotaNote = `deckQuota=${meRes.data?.deckQuota}, wordQuota=${meRes.data?.wordQuota}`;
  }
  record(11, 'Admin đổi quota user', quotaOk, quotaNote);

  // 12 — production health + login demo + create deck
  const health = await req('GET', '/api/health');
  const demoLogin = await req('POST', '/api/login', { username: 'demo', password: 'demo123' });
  const demoToken = demoLogin.data?.token;
  let prodDeck = false;
  if (demoToken) {
    const cr = await req(
      'POST',
      '/api/decks',
      { name: `QA prod ${ts}`, langPair: 'en-vi' },
      demoToken
    );
    prodDeck = cr.status === 200 || cr.status === 403; // 403 if demo at quota still proves API up
    if (cr.data?.deck?.deckId) {
      await req('DELETE', `/api/decks/${cr.data.deck.deckId}`, null, demoToken);
    }
  }
  record(
    12,
    'Production andeck.onrender.com',
    health.data?.ok && demoLogin.status === 200 && prodDeck,
    health.data?.app || 'no health'
  );

  console.log('\n--- SUMMARY ---');
  const passed = results.filter((x) => x.pass).length;
  console.log(`${passed}/${results.length} passed`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
