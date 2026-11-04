const sessionKey = 'nihongo-compass-session-v2';
const legacySessionKey = 'nihongo-compass-result-v1';

function validAttempts(attempts, items) {
  return Array.isArray(attempts) && attempts.length<=items.length &&
    attempts.every(entry=>entry && Number.isInteger(entry.id) && items[entry.id] &&
      [null,0,1,2,3].includes(entry.choice) &&
      (entry.seconds==null || Number.isFinite(entry.seconds) && entry.seconds>=0)) &&
    new Set(attempts.map(entry=>entry.id)).size===attempts.length;
}

function validSession(saved, items) {
  if (saved?.version!==2 || !validAttempts(saved.attempts,items)) return false;
  if (saved.active===null) return true;
  const q = saved.active;
  if (!q || !Number.isInteger(q.id) || !items[q.id] || typeof q.graded!=='boolean' ||
      !Array.isArray(q.options) || q.options.length!==4 ||
      ![0,1,2,3].every(index=>q.options.includes(index))) return false;
  return q.graded ? saved.attempts.at(-1)?.id===q.id :
    !saved.attempts.some(entry=>entry.id===q.id) && !isTransferItem(q.id);
}

function createSessionStore(storage, items) {
  let expected;
  let session = {version:2,attempts:[],active:null};
  function load() {
    try {
      expected = storage.getItem(sessionKey);
      const saved = JSON.parse(expected);
      if (validSession(saved,items)) session = saved;
      else {
        const legacy = expected===null ? JSON.parse(storage.getItem(legacySessionKey)) : null;
        session = {version:2,attempts:validAttempts(legacy,items)?legacy:[],active:null};
      }
    } catch {}
    return session;
  }

  function save(attempts, active) {
    const next = {version:2,attempts:attempts.slice(),active};
    try {
      if (storage.getItem(sessionKey)!==expected) return {status:'conflict',session:load()};
      const encoded = JSON.stringify(next);
      storage.setItem(sessionKey,encoded);
      expected = encoded;
    } catch {
      session = next;
      return {status:'temporary',session};
    }
    session = next;
    return {status:'saved',session};
  }
  return {load,save};
}
