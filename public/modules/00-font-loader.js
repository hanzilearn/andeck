/* Lazy-load study fonts by lang pair — Inter preloaded in index.html */
const AD_FONT_URLS = {
  'zh-vi': 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;500;600;700&display=swap',
  'ja-vi': 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600&display=swap',
  'ko-vi': 'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap',
  'en-vi': null,
  'de-vi': null
};
const _adFontsLoaded = new Set();
function adEnsureLangFonts(langPair) {
  if (!langPair || _adFontsLoaded.has(langPair)) return;
  const url = AD_FONT_URLS[langPair];
  _adFontsLoaded.add(langPair);
  if (!url) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}
