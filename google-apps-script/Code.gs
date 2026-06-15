// Bloom — Google Apps Script backend (normalized tables)
// Tabs: users | cycles | daily_logs | settings

const T_USERS    = 'users';
const T_CYCLES   = 'cycles';
const T_LOGS     = 'daily_logs';
const T_SETTINGS = 'settings';

const HEADERS = {
  [T_USERS]:    ['username', 'password', 'created_at'],
  [T_CYCLES]:   ['cycle_id', 'username', 'start_date', 'period_end_date', 'cycle_length', 'period_length', 'created_at'],
  [T_LOGS]:     ['log_id', 'username', 'date', 'flow', 'cramps', 'energy', 'mood', 'bloating', 'sleep', 'cravings', 'notes', 'updated_at'],
  [T_SETTINGS]: ['username', 'pcos_mode', 'default_cycle_length', 'default_period_length', 'updated_at'],
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const p = JSON.parse(e.postData.contents);
    let result;
    switch (p.action) {
      case 'register': result = register(p); break;
      case 'login':    result = login(p); break;
      case 'loadAll':  result = loadAll(p); break;
      case 'saveAll':  result = saveAll(p); break;
      default:         result = { ok: false, error: 'Unknown action' };
    }
    return respond(result);
  } catch (err) {
    return respond({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('Bloom API is running.').setMimeType(ContentService.MimeType.TEXT);
}

// ── Auth ──
function register(p) {
  if (!p.username || !p.password) return { ok: false, error: 'Missing fields.' };
  const u = String(p.username).toLowerCase().trim();
  const sheet = getSheet(T_USERS);
  if (findRow(sheet, 0, u)) return { ok: false, error: 'Username already taken.' };
  sheet.appendRow([u, String(p.password), new Date().toISOString()]);
  return { ok: true, username: u };
}

function login(p) {
  if (!p.username || !p.password) return { ok: false, error: 'Missing fields.' };
  const u = String(p.username).toLowerCase().trim();
  const row = findRow(getSheet(T_USERS), 0, u);
  if (!row) return { ok: false, error: 'Account not found.' };
  if (String(row[1]) !== String(p.password)) return { ok: false, error: 'Incorrect password.' };
  return { ok: true, username: u };
}

// ── Load everything for a user ──
function loadAll(p) {
  const auth = login(p); if (!auth.ok) return auth;
  const u = auth.username;

  const cycles = rowsFor(T_CYCLES, u).map(function (r) {
    return {
      id: r[0], startDate: r[2],
      periodEndDate: r[3] || undefined,
      cycleLength: numOrUndef(r[4]),
      periodLength: numOrUndef(r[5]),
    };
  });

  const logs = rowsFor(T_LOGS, u).map(function (r) {
    return {
      date: r[2], flow: r[3] || undefined, cramps: r[4], energy: r[5],
      mood: r[6], bloating: r[7], sleep: r[8], cravings: r[9], notes: r[10] || undefined,
    };
  });

  const sRow = findRow(getSheet(T_SETTINGS), 0, u);
  const settings = sRow ? {
    pcosMode: String(sRow[1]) === 'true' || sRow[1] === true,
    defaultCycleLength: numOrUndef(sRow[2]),
    defaultPeriodLength: numOrUndef(sRow[3]),
  } : {};

  return { ok: true, data: { cycles: cycles, logs: logs, settings: settings } };
}

// ── Save everything (replaces this user's rows) ──
function saveAll(p) {
  const auth = login(p); if (!auth.ok) return auth;
  const u = auth.username;
  const data = p.data || {};
  const now = new Date().toISOString();

  replaceUserRows(T_CYCLES, u, (data.cycles || []).map(function (c) {
    return [c.id || (u + '_' + c.startDate), u, c.startDate, c.periodEndDate || '', blankNum(c.cycleLength), blankNum(c.periodLength), now];
  }));

  replaceUserRows(T_LOGS, u, (data.logs || []).map(function (l) {
    return [u + '_' + l.date, u, l.date, l.flow || '', l.cramps || '', l.energy || '', l.mood || '', l.bloating || '', l.sleep || '', l.cravings || '', l.notes || '', now];
  }));

  const s = data.settings || {};
  upsertRow(T_SETTINGS, u, [u, !!s.pcosMode, blankNum(s.defaultCycleLength), blankNum(s.defaultPeriodLength), now]);

  return { ok: true };
}

// ── Sheet helpers ──
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) { sheet = ss.insertSheet(name); sheet.appendRow(HEADERS[name]); }
  else if (sheet.getLastRow() === 0) { sheet.appendRow(HEADERS[name]); }
  return sheet;
}

function rowsFor(name, username) {
  const data = getSheet(name).getDataRange().getValues();
  const out = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === username) out.push(data[i]);
  }
  return out;
}

function findRow(sheet, col, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][col]).toLowerCase() === String(value).toLowerCase()) return data[i];
  }
  return null;
}

// Delete all of a user's rows (username always in column index 1) then append new ones.
function replaceUserRows(name, username, newRows) {
  const sheet = getSheet(name);
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]).toLowerCase() === username) sheet.deleteRow(i + 1);
  }
  if (newRows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
}

// Settings: one row per user, keyed in column 0.
function upsertRow(name, key, row) {
  const sheet = getSheet(name);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(key).toLowerCase()) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return;
    }
  }
  sheet.appendRow(row);
}

function numOrUndef(v) { return (v === '' || v === null || v === undefined) ? undefined : Number(v); }
function blankNum(v)   { return (v === null || v === undefined) ? '' : v; }

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
