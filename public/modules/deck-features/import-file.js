/* ============================================================
   ANDECK IMPORT FILE — CSV / Excel / JSON / PDF (không cần AI)
   ============================================================ */

const AD_FILE_MAX_BYTES = 10 * 1024 * 1024;
const AD_FILE_XLSX_CDN = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
const AD_FILE_PDF_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const AD_FILE_PDF_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let adFileRawRows = [];
let adFileHasHeader = true;
let adFileColCount = 0;
let adFileSourceName = '';
let adFileJsonPayload = null;
let adFileDirectItems = null;
let adFileMapping = { primary: 1, reading: 2, meaning: 3 };

function adFileLoadScript(src, id) {
  if (id && document.getElementById(id)) return Promise.resolve();
  if (!id && document.querySelector('script[src="' + src + '"]')) return Promise.resolve();
  return new Promise(function (resolve, reject) {
    const s = document.createElement('script');
    s.src = src;
    if (id) s.id = id;
    s.onload = function () {
      resolve();
    };
    s.onerror = function () {
      reject(new Error('Không tải được thư viện: ' + src));
    };
    document.head.appendChild(s);
  });
}

function adFileNormHeader(cell) {
  return String(cell || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function adFileClassifyHeader(cell) {
  const h = adFileNormHeader(cell);
  if (!h) return null;
  if (/^(stt|no|#|so thu tu|序号|index|id)$/.test(h)) return 'skip';
  if (/^(primary|hanzi|chu han|tieng trung|中文|汉字|tu|word|kanji|han tu|term)$/.test(h)) return 'primary';
  if (/^(reading|pinyin|phien am|furigana|romaji|romanization|phonetic)$/.test(h)) return 'reading';
  if (/^(meaning|nghia|dich|vietnamese|viet|translation|def|definition)$/.test(h)) return 'meaning';
  if (/^(pos|tu loai|part of speech|loai tu)$/.test(h)) return 'pos';
  if (/^(note|ghi chu|notes|remark)$/.test(h)) return 'note';
  return null;
}

function adFileGuessMapping(headerRow) {
  const mapping = { primary: -1, reading: -1, meaning: -1, pos: -1, note: -1 };
  headerRow.forEach(function (cell, idx) {
    const kind = adFileClassifyHeader(cell);
    if (kind && kind !== 'skip' && mapping[kind] === -1) mapping[kind] = idx;
  });
  if (mapping.primary === -1 && headerRow.length >= 2) {
    mapping.primary = headerRow.length >= 4 ? 1 : 0;
  }
  if (mapping.reading === -1 && headerRow.length >= 3) {
    mapping.reading = headerRow.length >= 4 ? 2 : 1;
  }
  if (mapping.meaning === -1 && headerRow.length >= 2) {
    mapping.meaning = headerRow.length >= 4 ? 3 : headerRow.length - 1;
  }
  return mapping;
}

function adFileDefaultMapping(colCount) {
  if (colCount >= 4) return { primary: 1, reading: 2, meaning: 3, pos: -1, note: -1 };
  if (colCount === 3) return { primary: 0, reading: 1, meaning: 2, pos: -1, note: -1 };
  if (colCount === 2) return { primary: 0, reading: -1, meaning: 1, pos: -1, note: -1 };
  return { primary: 0, reading: -1, meaning: -1, pos: -1, note: -1 };
}

function adFileDetectDelimiter(line) {
  const tabs = (line.match(/\t/g) || []).length;
  const semis = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  if (tabs >= semis && tabs >= commas && tabs > 0) return '\t';
  if (semis > commas && semis > 0) return ';';
  return ',';
}

function adFileParseCsvLine(line, delim) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === delim) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function adFileParseDelimitedText(text) {
  let raw = String(text || '');
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const lines = raw.split(/\r?\n/).filter(function (l) {
    return l.trim().length > 0;
  });
  if (!lines.length) return [];
  const delim = adFileDetectDelimiter(lines[0]);
  return lines.map(function (line) {
    return adFileParseCsvLine(line, delim);
  });
}

function adFileLooksLikeHeader(row) {
  if (!row || !row.length) return false;
  let hits = 0;
  row.forEach(function (cell) {
    if (adFileClassifyHeader(cell)) hits++;
  });
  return hits >= 2;
}

function adFileIsNoiseLine(line) {
  const t = String(line || '').trim();
  if (!t) return true;
  if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(t)) return true;
  if (/^\d+\s*\/\s*\d+$/.test(t)) return true;
  if (/^400\s+từ\s+vựng/i.test(t)) return true;
  if (/^chất\s+lượng\s*-/i.test(t)) return true;
  if (/^品保/.test(t) && t.length < 20) return true;
  return false;
}

function adFileParsePdfVocabLines(lines) {
  const rows = [];
  let current = null;

  function pushCurrent() {
    if (current && current.primary && current.meaning) {
      rows.push([current.primary, current.reading || '', current.meaning]);
    }
    current = null;
  }

  lines.forEach(function (line) {
    const trimmed = String(line || '').trim();
    if (!trimmed || adFileIsNoiseLine(trimmed)) return;
    if (/^STT\b/i.test(trimmed) && /nghĩa|tiếng trung|phiên âm/i.test(trimmed)) return;

    const tabParts = trimmed.split(/\t+/).map(function (p) {
      return p.trim();
    }).filter(Boolean);

    if (/^\d+\s/.test(trimmed)) {
      pushCurrent();
      let primary = '';
      let reading = '';
      let meaning = '';

      if (tabParts.length >= 4) {
        primary = tabParts[1];
        reading = tabParts[2];
        meaning = tabParts.slice(3).join(' ');
      } else if (tabParts.length === 3) {
        primary = tabParts[0].replace(/^\d+\s*/, '');
        reading = tabParts[1];
        meaning = tabParts[2];
      } else {
        const m = trimmed.match(
          /^(\d+)\s+([\u4e00-\u9fff]+(?:\s+[\u4e00-\u9fff]+)*)\s+([\p{Script=Latin}\d\sāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüêôơư]+?)\s+(.+)$/u
        );
        if (m) {
          primary = m[2].trim();
          reading = m[3].trim();
          meaning = m[4].trim();
        }
      }

      if (primary && meaning) {
        current = { primary: primary, reading: reading, meaning: meaning };
      }
      return;
    }

    if (!current) return;

    if (/^[\p{Script=Latin}\d\sāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/u.test(trimmed) && !current.reading) {
      current.reading = trimmed;
      return;
    }

    if (!/^\d+\s/.test(trimmed) && !/^[\u4e00-\u9fff]{1,4}$/.test(trimmed.split(/\s+/)[0])) {
      current.meaning = (current.meaning + ' ' + trimmed.replace(/\t/g, ' ')).trim();
    }
  });

  pushCurrent();
  return rows;
}

function adFilePdfToRows(text) {
  const lines = String(text || '').split(/\r?\n/);
  const structured = adFileParsePdfVocabLines(lines);
  if (structured.length >= 5) {
    adFileHasHeader = false;
    adFileMapping = { primary: 0, reading: 1, meaning: 2, pos: -1, note: -1 };
    return structured;
  }
  const tabular = [];
  lines.forEach(function (line) {
    const trimmed = line.trim();
    if (!trimmed || adFileIsNoiseLine(trimmed)) return;
    if (/\t/.test(trimmed)) {
      tabular.push(
        trimmed.split(/\t+/).map(function (p) {
          return p.trim();
        })
      );
    } else if (/[,;]/.test(trimmed)) {
      tabular.push(adFileParseCsvLine(trimmed, adFileDetectDelimiter(trimmed)));
    }
  });
  return tabular;
}

async function adFileExtractPdfText(arrayBuffer) {
  await adFileLoadScript(AD_FILE_PDF_CDN, 'ad-pdfjs-lib');
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error('PDF.js chưa sẵn sàng');
  pdfjsLib.GlobalWorkerOptions.workerSrc = AD_FILE_PDF_WORKER;
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const lines = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const rowMap = {};

    content.items.forEach(function (item) {
      const text = String(item.str || '').trim();
      if (!text) return;
      const y = Math.round(item.transform[5]);
      if (!rowMap[y]) rowMap[y] = [];
      rowMap[y].push({ x: item.transform[4], text: text });
    });

    Object.keys(rowMap)
      .sort(function (a, b) {
        return Number(b) - Number(a);
      })
      .forEach(function (y) {
        const line = rowMap[y]
          .sort(function (a, b) {
            return a.x - b.x;
          })
          .map(function (part) {
            return part.text;
          })
          .join('\t');
        if (line.trim()) lines.push(line);
      });
  }

  return lines.join('\n');
}

async function adFileParseExcel(arrayBuffer) {
  await adFileLoadScript(AD_FILE_XLSX_CDN, 'ad-sheetjs-lib');
  const XLSX = window.XLSX;
  if (!XLSX) throw new Error('SheetJS chưa sẵn sàng');
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  return rows
    .map(function (row) {
      return row.map(function (cell) {
        return String(cell == null ? '' : cell).trim();
      });
    })
    .filter(function (row) {
      return row.some(function (c) {
        return c.length > 0;
      });
    });
}

function adFileSetRows(rows, sourceName) {
  adFileRawRows = rows || [];
  adFileJsonPayload = null;
  adFileDirectItems = null;
  adFileSourceName = sourceName || '';
  adFileColCount = adFileRawRows.reduce(function (max, row) {
    return Math.max(max, row.length);
  }, 0);

  if (adFileRawRows.length && adFileLooksLikeHeader(adFileRawRows[0])) {
    adFileHasHeader = true;
    adFileMapping = adFileGuessMapping(adFileRawRows[0]);
  } else {
    adFileHasHeader = false;
    adFileMapping = adFileDefaultMapping(adFileColCount);
  }

  adFileRenderMappingUI();
  adFileUpdatePreview();
}

function adFileGetCell(row, idx) {
  if (idx == null || idx < 0 || !row) return '';
  return String(row[idx] == null ? '' : row[idx]).trim();
}

function adFileRowsToItems(rows, mapping, hasHeader, langPair) {
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const items = [];

  dataRows.forEach(function (row) {
    if (!row || !row.some(function (c) {
      return String(c || '').trim();
    })) {
      return;
    }
    const raw = {
      primary: adFileGetCell(row, mapping.primary),
      reading: adFileGetCell(row, mapping.reading),
      meaning: adFileGetCell(row, mapping.meaning),
      pos: adFileGetCell(row, mapping.pos),
      note: adFileGetCell(row, mapping.note)
    };
    const mapped = typeof adMapImportItem === 'function' ? adMapImportItem(raw, langPair) : raw;
    if (mapped && mapped.primary && mapped.meaning) items.push(mapped);
  });

  return items;
}

function adFileGetParsed(langPair) {
  if (adFileJsonPayload) return adFileJsonPayload;
  if (adFileDirectItems) {
    return { ok: true, items: adFileDirectItems, count: adFileDirectItems.length, meta: null };
  }
  if (!adFileRawRows.length) {
    return { ok: false, items: [], count: 0, meta: null };
  }
  if (adFileMapping.primary < 0 || adFileMapping.meaning < 0) {
    return { ok: false, items: [], count: 0, meta: null, error: 'missing-columns' };
  }
  const items = adFileRowsToItems(adFileRawRows, adFileMapping, adFileHasHeader, langPair);
  return { ok: items.length > 0, items: items, count: items.length, meta: { source: 'file', name: adFileSourceName } };
}

function adFileColOptions(selectedIdx) {
  let html = '<option value="-1">— Bỏ qua —</option>';
  for (let i = 0; i < adFileColCount; i++) {
    const label = adFileHasHeader && adFileRawRows[0] && adFileRawRows[0][i]
      ? 'Cột ' + (i + 1) + ': ' + String(adFileRawRows[0][i]).slice(0, 24)
      : 'Cột ' + (i + 1);
    html +=
      '<option value="' +
      i +
      '"' +
      (selectedIdx === i ? ' selected' : '') +
      '>' +
      label.replace(/</g, '&lt;') +
      '</option>';
  }
  return html;
}

function adFileRenderMappingUI() {
  const wrap = document.getElementById('importFileMapping');
  const preview = document.getElementById('importFilePreview');
  if (!wrap) return;

  if (!adFileRawRows.length) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    if (preview) preview.innerHTML = '';
    return;
  }

  wrap.style.display = '';
  const fields = [
    { key: 'primary', label: 'Từ (primary)', required: true },
    { key: 'reading', label: 'Phiên âm (reading)', required: false },
    { key: 'meaning', label: 'Nghĩa (meaning)', required: true }
  ];

  let html =
    '<div class="iw-file-map-head">' +
    '<label class="iw-file-header-toggle">' +
    '<input type="checkbox" id="importFileHasHeader"' +
    (adFileHasHeader ? ' checked' : '') +
    '> Dòng đầu là tiêu đề</label>' +
    '<span class="iw-file-detect">' +
    adFileRawRows.length +
    ' dòng · ' +
    adFileColCount +
    ' cột</span></div>' +
    '<div class="iw-file-map-grid">';

  fields.forEach(function (f) {
    html +=
      '<label class="iw-label" for="importFileMap_' +
      f.key +
      '">' +
      f.label +
      (f.required ? ' *' : '') +
      '</label>' +
      '<select id="importFileMap_' +
      f.key +
      '" class="iw-name-input iw-file-map-select" data-map-key="' +
      f.key +
      '">' +
      adFileColOptions(adFileMapping[f.key]) +
      '</select>';
  });

  html += '</div>';
  wrap.innerHTML = html;

  document.getElementById('importFileHasHeader')?.addEventListener('change', function (e) {
    adFileHasHeader = !!e.target.checked;
    if (adFileHasHeader && adFileLooksLikeHeader(adFileRawRows[0])) {
      adFileMapping = adFileGuessMapping(adFileRawRows[0]);
    } else if (!adFileHasHeader) {
      adFileMapping = adFileDefaultMapping(adFileColCount);
    }
    adFileRenderMappingUI();
    adFileUpdatePreview();
    if (typeof adImportUpdateWordCountDisplay === 'function') adImportUpdateWordCountDisplay();
  });

  wrap.querySelectorAll('.iw-file-map-select').forEach(function (sel) {
    sel.addEventListener('change', function (e) {
      const key = e.target.getAttribute('data-map-key');
      adFileMapping[key] = parseInt(e.target.value, 10);
      adFileUpdatePreview();
      if (typeof adImportUpdateWordCountDisplay === 'function') adImportUpdateWordCountDisplay();
    });
  });
}

function adFileUpdatePreview() {
  const preview = document.getElementById('importFilePreview');
  const countEl = document.getElementById('importFileWordCount');
  const mapWrap = document.getElementById('importFileMapping');
  if (!preview) return;

  if (adFileJsonPayload) {
    if (mapWrap) {
      mapWrap.style.display = 'none';
      mapWrap.innerHTML = '';
    }
  }

  const langPair =
    typeof adImportGetLangPairForParse === 'function' ? adImportGetLangPairForParse() : 'zh-vi';
  const parsed = adFileGetParsed(langPair);

  if (countEl) {
    if (parsed.ok && parsed.count > 0) {
      countEl.textContent = parsed.count + ' từ hợp lệ';
      countEl.classList.add('is-valid');
    } else {
      countEl.textContent = '0 từ hợp lệ';
      countEl.classList.remove('is-valid');
    }
  }

  if (!parsed.ok || !parsed.items.length) {
    preview.innerHTML = '<p class="iw-file-preview-empty">Chưa có từ hợp lệ — kiểm tra map cột hoặc file.</p>';
    return;
  }

  const sample = parsed.items.slice(0, 5);
  let html =
    '<table class="iw-file-preview-table"><thead><tr><th>Từ</th><th>Reading</th><th>Nghĩa</th></tr></thead><tbody>';
  sample.forEach(function (w) {
    html +=
      '<tr><td>' +
      (w.primary || '').replace(/</g, '&lt;') +
      '</td><td>' +
      (w.reading || '').replace(/</g, '&lt;') +
      '</td><td>' +
      (w.meaning || '').replace(/</g, '&lt;') +
      '</td></tr>';
  });
  html += '</tbody></table>';
  if (parsed.count > 5) {
    html += '<p class="iw-file-preview-more">… và ' + (parsed.count - 5) + ' từ khác</p>';
  }
  preview.innerHTML = html;
}

function adFileSetStatus(msg, isError) {
  const el = document.getElementById('importFileStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('is-error', !!isError);
  el.classList.toggle('is-ok', !!msg && !isError);
}

async function adFileHandleSelected(file) {
  if (!file) return;
  adFileResetState(false);

  if (file.size > AD_FILE_MAX_BYTES) {
    adFileSetStatus('File quá lớn (tối đa 10 MB).', true);
    return;
  }

  adFileSourceName = file.name;
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  adFileSetStatus('Đang đọc file…', false);

  try {
    if (ext === 'json') {
      const text = await file.text();
      const langPair =
        typeof adImportGetLangPairForParse === 'function' ? adImportGetLangPairForParse() : 'zh-vi';
      const parsed = adImportParseJson(text, langPair);
      if (!parsed.ok || !parsed.count) {
        adFileSetStatus('JSON không hợp lệ hoặc không có từ đủ primary + meaning.', true);
        return;
      }
      adFileJsonPayload = parsed;
      if (typeof adImportApplyMeta === 'function') adImportApplyMeta(parsed.meta);
      adFileSetStatus('Đã đọc ' + parsed.count + ' từ từ JSON.', false);
      adFileUpdatePreview();
      if (typeof adImportUpdateWordCountDisplay === 'function') adImportUpdateWordCountDisplay();
      return;
    }

    if (ext === 'xlsx' || ext === 'xls') {
      const buf = await file.arrayBuffer();
      const rows = await adFileParseExcel(buf);
      if (!rows.length) {
        adFileSetStatus('Excel trống hoặc không đọc được.', true);
        return;
      }
      adFileSetRows(rows, file.name);
      adFileSetStatus('Đã đọc sheet đầu: ' + rows.length + ' dòng.', false);
      if (typeof adImportUpdateWordCountDisplay === 'function') adImportUpdateWordCountDisplay();
      return;
    }

    if (ext === 'pdf') {
      const buf = await file.arrayBuffer();
      const text = await adFileExtractPdfText(buf);
      const rows = adFilePdfToRows(text);
      if (!rows.length) {
        adFileSetStatus('PDF không trích xuất được bảng từ. Thử CSV/Excel hoặc import AI.', true);
        return;
      }
      adFileSetRows(rows, file.name);
      const langPair =
        typeof adImportGetLangPairForParse === 'function' ? adImportGetLangPairForParse() : 'zh-vi';
      const parsed = adFileGetParsed(langPair);
      adFileSetStatus('Đã đọc PDF: ' + parsed.count + ' từ hợp lệ.', false);
      if (typeof adImportUpdateWordCountDisplay === 'function') adImportUpdateWordCountDisplay();
      return;
    }

    const text = await file.text();
    const rows = adFileParseDelimitedText(text);
    if (!rows.length) {
      adFileSetStatus('File trống hoặc không đọc được.', true);
      return;
    }
    adFileSetRows(rows, file.name);
    adFileSetStatus('Đã đọc ' + rows.length + ' dòng.', false);
    if (typeof adImportUpdateWordCountDisplay === 'function') adImportUpdateWordCountDisplay();
  } catch (err) {
    console.error('adFileHandleSelected:', err);
    adFileSetStatus(err.message || 'Không đọc được file.', true);
  }
}

function adFileResetState(clearInput) {
  adFileRawRows = [];
  adFileHasHeader = true;
  adFileColCount = 0;
  adFileSourceName = '';
  adFileJsonPayload = null;
  adFileDirectItems = null;
  adFileMapping = { primary: 1, reading: 2, meaning: 3, pos: -1, note: -1 };
  adFileSetStatus('', false);
  const wrap = document.getElementById('importFileMapping');
  const preview = document.getElementById('importFilePreview');
  if (wrap) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
  }
  if (preview) preview.innerHTML = '';
  const countEl = document.getElementById('importFileWordCount');
  if (countEl) {
    countEl.textContent = '0 từ hợp lệ';
    countEl.classList.remove('is-valid');
  }
  if (clearInput) {
    const input = document.getElementById('importFileInput');
    if (input) input.value = '';
  }
}

function adImportFileGetParsed() {
  const langPair =
    typeof adImportGetLangPairForParse === 'function' ? adImportGetLangPairForParse() : 'zh-vi';
  return adFileGetParsed(langPair);
}

function initAdImportFileTab() {
  const input = document.getElementById('importFileInput');
  const pickBtn = document.getElementById('importFilePickBtn');
  const drop = document.getElementById('importFileDrop');

  pickBtn?.addEventListener('click', function () {
    input?.click();
  });

  input?.addEventListener('change', function () {
    const file = input.files && input.files[0];
    if (file) adFileHandleSelected(file);
  });

  if (drop) {
    drop.addEventListener('dragover', function (e) {
      e.preventDefault();
      drop.classList.add('is-dragover');
    });
    drop.addEventListener('dragleave', function () {
      drop.classList.remove('is-dragover');
    });
    drop.addEventListener('drop', function (e) {
      e.preventDefault();
      drop.classList.remove('is-dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) adFileHandleSelected(file);
    });
  }
}
