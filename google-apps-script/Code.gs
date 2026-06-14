// Bloom Period Tracker — Google Apps Script Backend
// Sheet tabs: "users" and "cycle_data"

const SHEET_NAME_USERS = 'users';
const SHEET_NAME_DATA  = 'cycle_data';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action } = payload;

    let result;
    if      (action === 'register') result = register(payload);
    else if (action === 'login')    result = login(payload);
    else if (action === 'saveData') result = saveData(payload);
    else if (action === 'loadData') result = loadData(payload);
    else result = { ok: false, error: 'Unknown action' };

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

// ---------- AUTH ----------

function register({ username, password }) {
  if (!username || !password) return { ok: false, error: 'Missing fields.' };
  const sheet = getSheet(SHEET_NAME_USERS);
  const existing = findRow(sheet, 1, username.toLowerCase().trim());
  if (existing) return { ok: false, error: 'Username already taken.' };

  sheet.appendRow([username.toLowerCase().trim(), password, new Date().toISOString()]);
  return { ok: true, username: username.toLowerCase().trim() };
}

function login({ username, password }) {
  if (!username || !password) return { ok: false, error: 'Missing fields.' };
  const sheet = getSheet(SHEET_NAME_USERS);
  const row = findRow(sheet, 1, username.toLowerCase().trim());
  if (!row) return { ok: false, error: 'Account not found.' };

  const storedPassword = row[1];
  if (storedPassword !== password) return { ok: false, error: 'Incorrect password.' };

  return { ok: true, username: row[0] };
}

// ---------- DATA ----------

function saveData({ username, password, data }) {
  const authResult = login({ username, password });
  if (!authResult.ok) return authResult;

  const sheet = getSheet(SHEET_NAME_DATA);
  const rowIndex = findRowIndex(sheet, 1, username.toLowerCase().trim());
  const json = JSON.stringify(data);
  const now = new Date().toISOString();

  if (rowIndex) {
    sheet.getRange(rowIndex, 2).setValue(json);
    sheet.getRange(rowIndex, 3).setValue(now);
  } else {
    sheet.appendRow([username.toLowerCase().trim(), json, now]);
  }

  return { ok: true };
}

function loadData({ username, password }) {
  const authResult = login({ username, password });
  if (!authResult.ok) return authResult;

  const sheet = getSheet(SHEET_NAME_DATA);
  const row = findRow(sheet, 1, username.toLowerCase().trim());
  if (!row) return { ok: true, data: null };

  try {
    const data = JSON.parse(row[1]);
    return { ok: true, data };
  } catch {
    return { ok: true, data: null };
  }
}

// ---------- HELPERS ----------

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_NAME_USERS) {
      sheet.appendRow(['username', 'password', 'created_at']);
    } else if (name === SHEET_NAME_DATA) {
      sheet.appendRow(['username', 'data', 'updated_at']);
    }
  }
  return sheet;
}

function findRow(sheet, colIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex - 1]).toLowerCase() === String(value).toLowerCase()) {
      return data[i];
    }
  }
  return null;
}

function findRowIndex(sheet, colIndex, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIndex - 1]).toLowerCase() === String(value).toLowerCase()) {
      return i + 1; // 1-indexed sheet row
    }
  }
  return null;
}

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
