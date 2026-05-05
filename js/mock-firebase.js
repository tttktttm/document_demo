// ============================================
// Aspire Path — Mock Firebase Layer
// ============================================

// --- Persistence ---
const DB_KEY = 'aspire_path_mock_db';
const AUTH_KEY = 'aspire_path_mock_auth';

function getDB() {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : { users: {}, applications: {} };
}

function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function getAuthData() {
  const data = localStorage.getItem(AUTH_KEY);
  return data ? JSON.parse(data) : { currentUser: null };
}

function saveAuthData(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

// --- Auth Mock ---
const authListeners = [];

export const auth = {
  get currentUser() {
    return getAuthData().currentUser;
  }
};

export const onAuthStateChanged = (authObj, callback) => {
  authListeners.push(callback);
  callback(auth.currentUser);
  return () => {
    const index = authListeners.indexOf(callback);
    if (index > -1) authListeners.splice(index, 1);
  };
};

function notifyAuthChange() {
  const user = auth.currentUser;
  authListeners.forEach(cb => cb(user));
}

export const signInWithEmailAndPassword = async (authObj, email, password) => {
  const db = getDB();
  const user = Object.values(db.users).find(u => u.email === email);
  if (!user) throw { code: 'auth/user-not-found' };
  // In demo, we don't really check password or we just accept any
  saveAuthData({ currentUser: user });
  notifyAuthChange();
  return { user };
};

export const createUserWithEmailAndPassword = async (authObj, email, password) => {
  const uid = 'user_' + Math.random().toString(36).substr(2, 9);
  const user = { uid, email, displayName: email.split('@')[0] };
  const db = getDB();
  db.users[uid] = { ...user, role: 'applicant', createdAt: { seconds: Date.now() / 1000 } };
  saveDB(db);
  saveAuthData({ currentUser: user });
  notifyAuthChange();
  return { user };
};

export const signInWithPopup = async (authObj, provider) => {
  // Mock Google Login
  const uid = 'google_user_123';
  const user = { uid, email: 'demo@example.com', displayName: 'Demo User' };
  const db = getDB();
  if (!db.users[uid]) {
    db.users[uid] = { ...user, role: 'applicant', createdAt: { seconds: Date.now() / 1000 } };
    saveDB(db);
  }
  saveAuthData({ currentUser: user });
  notifyAuthChange();
  return { user };
};

export const updateProfile = async (user, data) => {
  const db = getDB();
  if (db.users[user.uid]) {
    db.users[user.uid].displayName = data.displayName;
    saveDB(db);
  }
  const authData = getAuthData();
  if (authData.currentUser && authData.currentUser.uid === user.uid) {
    authData.currentUser.displayName = data.displayName;
    saveAuthData(authData);
  }
};

export const signOut = async (authObj) => {
  saveAuthData({ currentUser: null });
  notifyAuthChange();
};

export const sendPasswordResetEmail = async (authObj, email) => {
  console.log('Password reset email sent to:', email);
};

export const googleProvider = {};

// --- Firestore Mock ---
export const db = {};

export const doc = (dbOrColl, pathOrId, id) => {
  if (dbOrColl.collectionName) {
    // Called as doc(collectionRef, id?)
    const collectionName = dbOrColl.collectionName;
    const docId = pathOrId || 'id_' + Math.random().toString(36).substr(2, 9);
    return { collectionName, id: docId };
  }
  // Called as doc(db, collectionName, id)
  return { collectionName: pathOrId, id };
};

export const collection = (dbObj, collectionName) => {
  return { collectionName };
};

export const getDoc = async (docRef) => {
  const db = getDB();
  const data = db[docRef.collectionName] ? db[docRef.collectionName][docRef.id] : null;
  return {
    exists: () => !!data,
    data: () => data
  };
};

export const setDoc = async (docRef, data) => {
  const db = getDB();
  if (!db[docRef.collectionName]) db[docRef.collectionName] = {};
  db[docRef.collectionName][docRef.id] = data;
  saveDB(db);
};

export const updateDoc = async (docRef, data) => {
  const db = getDB();
  if (!db[docRef.collectionName]) db[docRef.collectionName] = {};
  const current = db[docRef.collectionName][docRef.id] || {};
  
  // Handle nested updates (simplified)
  for (const key in data) {
    if (key.includes('.')) {
      const parts = key.split('.');
      let target = current;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!target[parts[i]]) target[parts[i]] = {};
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = data[key];
    } else {
      current[key] = data[key];
    }
  }
  
  db[docRef.collectionName][docRef.id] = current;
  saveDB(db);
};


export const query = (collRef, ...constraints) => {
  return { ...collRef, constraints };
};

export const where = (field, op, value) => {
  return { type: 'where', field, op, value };
};

export const orderBy = (field, direction) => {
  return { type: 'orderBy', field, direction };
};

export const getDocs = async (collRef) => {
  const db = getDB();
  let docsArray = Object.entries(db[collRef.collectionName] || {}).map(([id, data]) => ({
    id,
    data: () => data
  }));

  // Apply basic where filtering
  if (collRef.constraints) {
    collRef.constraints.forEach(c => {
      if (c.type === 'where' && c.op === '==') {
        docsArray = docsArray.filter(d => d.data()[c.field] === c.value);
      }
    });
  }

  return {
    forEach: (cb) => docsArray.forEach(cb),
    docs: docsArray,
    empty: docsArray.length === 0
  };
};

export const serverTimestamp = () => {
  return { seconds: Math.floor(Date.now() / 1000) };
};

export const deleteField = () => undefined;

// --- Storage Mock ---
export const getStorage = () => ({});
export const getAnalytics = () => ({});
export const initializeApp = () => ({});
export const getAuth = () => auth; // Added for compatibility
