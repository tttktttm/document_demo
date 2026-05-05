// ============================================
// Aspire Path 書類審査システム — Auth Logic
// ============================================

import { auth, db, googleProvider } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from './mock-firebase.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from './mock-firebase.js';

// ---- DOM Elements ----
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const authError = document.getElementById('authError');
const authErrorMsg = document.getElementById('authErrorMsg');
const authLoading = document.getElementById('authLoading');

// ---- Toggle Login / Signup / Reset ----
const allForms = () => {
  loginForm.classList.add('hidden');
  signupForm.classList.add('hidden');
  document.getElementById('resetForm').classList.add('hidden');
  hideError();
};

showSignup?.addEventListener('click', (e) => {
  e.preventDefault();
  allForms();
  signupForm.classList.remove('hidden');
});

showLogin?.addEventListener('click', (e) => {
  e.preventDefault();
  allForms();
  loginForm.classList.remove('hidden');
});

document.getElementById('showResetPassword')?.addEventListener('click', (e) => {
  e.preventDefault();
  allForms();
  document.getElementById('resetForm').classList.remove('hidden');
  // Pre-fill email if already typed
  const email = document.getElementById('loginEmail').value.trim();
  if (email) document.getElementById('resetEmail').value = email;
});

document.getElementById('showLoginFromReset')?.addEventListener('click', (e) => {
  e.preventDefault();
  allForms();
  loginForm.classList.remove('hidden');
});

// ---- Helper Functions ----
function showError(msg) {
  authError.classList.remove('hidden');
  authErrorMsg.textContent = msg;
  // Scroll error into view
  authError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  authError.classList.add('hidden');
  authErrorMsg.textContent = '';
}

function showLoading() {
  // Show spinner inside buttons instead of overlay
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = '処理中...'; }
  if (signupBtn) { signupBtn.disabled = true; signupBtn.textContent = '処理中...'; }
}

function hideLoading() {
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'ログイン'; }
  if (signupBtn) { signupBtn.disabled = false; signupBtn.textContent = 'アカウント作成'; }
}


function getFirebaseErrorMessage(code) {
  const messages = {
    'auth/email-already-in-use': 'このメールアドレスは既に登録されています。',
    'auth/invalid-email': '無効なメールアドレスです。',
    'auth/user-disabled': 'このアカウントは無効化されています。',
    'auth/user-not-found': 'アカウントが見つかりません。',
    'auth/wrong-password': 'パスワードが間違っています。',
    'auth/weak-password': 'パスワードは6文字以上にしてください。',
    'auth/popup-closed-by-user': 'ログインがキャンセルされました。',
    'auth/invalid-credential': 'メールアドレスまたはパスワードが間違っています。',
    'auth/too-many-requests': 'ログイン試行回数が多すぎます。しばらくしてからお試しください。',
  };
  return messages[code] || 'エラーが発生しました。もう一度お試しください。';
}

// ---- Create User Document ----
async function createUserDocument(user, displayName) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: displayName || user.displayName || user.email.split('@')[0],
      role: 'applicant',
      createdAt: serverTimestamp(),
    });
  }
}

// ---- Route Based on Role ----
async function routeByRole(user) {
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const role = userSnap.data().role;
      if (role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'applicant.html';
      }
    } else {
      // Create user doc if missing (e.g., Google sign-in first time)
      await createUserDocument(user);
      // Wait a bit to ensure Firestore's consistency
      setTimeout(() => {
        window.location.href = 'applicant.html';
      }, 500);
    }
  } catch (err) {
    console.error('Routing error:', err);
    showError('ユーザー情報の取得に失敗しました。');
    hideLoading();
  }
}

// ---- Email/Password Login ----
document.getElementById('loginBtn')?.addEventListener('click', async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showError('メールアドレスとパスワードを入力してください。');
    return;
  }

  hideError();
  showLoading();

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await routeByRole(cred.user);
  } catch (err) {
    hideLoading();
    showError(getFirebaseErrorMessage(err.code));
  }
});

// ---- Email/Password Signup ----
document.getElementById('signupBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  if (!name || !email || !password) {
    showError('すべての項目を入力してください。');
    return;
  }

  if (password.length < 6) {
    showError('パスワードは6文字以上にしてください。');
    return;
  }

  hideError();
  showLoading();

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await createUserDocument(cred.user, name);
    window.location.href = 'applicant.html';
  } catch (err) {
    hideLoading();
    showError(getFirebaseErrorMessage(err.code));
  }
});

// ---- Google Auth ----
async function handleGoogleAuth() {
  hideError();
  showLoading();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await createUserDocument(result.user);
    await routeByRole(result.user);
  } catch (err) {
    hideLoading();
    if (err.code !== 'auth/popup-closed-by-user') {
      showError(getFirebaseErrorMessage(err.code));
    }
  }
}


document.getElementById('googleLoginBtn')?.addEventListener('click', handleGoogleAuth);
document.getElementById('googleSignupBtn')?.addEventListener('click', handleGoogleAuth);

// ---- Password Reset ----
document.getElementById('resetBtn')?.addEventListener('click', async () => {
  const email = document.getElementById('resetEmail').value.trim();
  if (!email) {
    showError('メールアドレスを入力してください。');
    return;
  }
  hideError();
  const resetBtn = document.getElementById('resetBtn');
  resetBtn.disabled = true;
  resetBtn.textContent = '送信中...';
  try {
    await sendPasswordResetEmail(auth, email);
    // Show success state
    document.getElementById('resetForm').innerHTML = `
      <div style="text-align:center;padding:20px 0;">
        <div style="font-size:48px;margin-bottom:16px;">📧</div>
        <div style="font-weight:700;font-size:18px;margin-bottom:8px;">送信完了！</div>
        <div class="text-muted" style="font-size:13px;margin-bottom:24px;">
          <strong>${email}</strong> 宛にパスワードリセット用のメールを送信しました。<br>
          メールボックスをご確認ください。
        </div>
        <button class="btn btn--ghost" id="backToLoginBtn">← ログインページに戻る</button>
      </div>
    `;
    document.getElementById('backToLoginBtn').addEventListener('click', () => {
      location.reload();
    });
  } catch (err) {
    resetBtn.disabled = false;
    resetBtn.textContent = 'リセットメールを送信';
    showError(getFirebaseErrorMessage(err.code));
  }
});

// ---- Enter key handler ----
document.getElementById('loginPassword')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});
document.getElementById('signupPassword')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('signupBtn').click();
});

// ---- Enter key handler ----
onAuthStateChanged(auth, async (user) => {
  if (user && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/')) {
    // ログイン済みでログイン画面にいる場合のみ自動遷移
    showLoading();
    await routeByRole(user);
  }
});

// ---- Export signOut for use in other pages ----
export async function handleSignOut() {
  try {
    await signOut(auth);
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Sign out error:', err);
  }
}

// ---- Auth Guard (for other pages) ----
export function requireAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : null;
      callback(user, userData);
    } catch (err) {
      console.error('Auth guard error:', err);
      alert('Firestoreの権限エラーが発生しました。\n・Firestoreデータベースが作成されていない\n・セキュリティルールがデプロイされていない\nのいずれかの可能性があります。');
      window.location.href = 'index.html';
    }
  });
}

export function requireAdmin(callback) {
  requireAuth((user, userData) => {
    if (userData?.role !== 'admin') {
      window.location.href = 'applicant.html';
      return;
    }
    callback(user, userData);
  });
}

/**
 * setupPortalSwitch
 * 管理者権限がある場合に、志願者画面と管理者画面を行き来するボタンを表示する
 */
export function setupPortalSwitch(userData, containerId = 'portalSwitchContainer') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // 管理者でない場合は表示しない
  if (userData?.role !== 'admin') {
    container.innerHTML = '';
    return;
  }

  const currentPath = window.location.pathname;
  const isAdminPage = currentPath.includes('admin') || currentPath.includes('user'); // admin.html, admin-detail.html, admin-users.html
  
  const targetPath = isAdminPage ? 'applicant.html' : 'admin.html';
  const label = isAdminPage ? '志願者画面へ' : '管理者画面へ';
  const icon = isAdminPage ? '👤' : '⚙️';
  
  container.innerHTML = `
    <a href="${targetPath}" class="btn btn--primary btn--sm" style="margin-right:12px;">
      ${icon} ${label}
    </a>
  `;
}
