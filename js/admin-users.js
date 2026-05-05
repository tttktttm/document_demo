import { auth, db } from './firebase-config.js';
import { requireAdmin, handleSignOut } from './auth.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp
} from './mock-firebase.js';

const userTableBody = document.getElementById('userTableBody');
const refreshBtn = document.getElementById('refreshBtn');
const logoutBtn = document.getElementById('logoutBtn');

// ---- Toast ----
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ---- Initialization ----
let currentAdminUser = null;
requireAdmin(async (user, userData) => {
  currentAdminUser = user;
  renderHeader(userData);
  await loadUsers();
});

function renderHeader(userData) {
  document.getElementById('adminName').textContent = userData.displayName || '管理者';
  document.getElementById('adminAvatar').textContent = (userData.displayName || 'A').charAt(0);
}

async function loadUsers() {
  userTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;"><div class="spinner"></div> 読み込み中...</td></tr>';
  
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    
    userTableBody.innerHTML = '';
    
    snap.forEach(userDoc => {
      const data = userDoc.data();
      const tr = document.createElement('tr');
      const isSelf = userDoc.id === currentAdminUser?.uid;
      
      const isAdmin = data.role === 'admin';
      const dateString = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ja-JP') : '不明';

      tr.innerHTML = `
        <td>
          <div style="font-weight:600;">${data.displayName || 'No Name'} ${isSelf ? '<span class="status-badge status-badge--review" style="font-size:10px;padding:2px 6px;">自分</span>' : ''}</div>
        </td>
        <td>${data.email}</td>
        <td>
          <span class="status-badge ${isAdmin ? 'status-badge--accepted' : 'status-badge--not-started'}">
            ${isAdmin ? '管理者' : '一般ユーザー'}
          </span>
        </td>
        <td>${dateString}</td>
        <td>
          <button class="btn ${isAdmin ? 'btn--danger' : 'btn--success'} btn--sm btn-toggle-role" 
            data-uid="${userDoc.id}" data-role="${data.role}" ${isSelf ? 'disabled title="自分の権限は変更できません"' : ''}>
            ${isAdmin ? '一般に戻す' : '管理者に昇格'}
          </button>
        </td>
      `;
      userTableBody.appendChild(tr);
    });
  } catch (err) {
    console.error('Load users error:', err);
    userTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--color-error);padding:40px;">ユーザー一覧の取得に失敗しました</td></tr>';
  }
}

// Event Delegation for Role Toggle
userTableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-toggle-role');
  if (!btn) return;

  const uid = btn.dataset.uid;
  const currentRole = btn.dataset.role;
  const newRole = currentRole === 'admin' ? 'applicant' : 'admin';
  
  const confirmed = confirm(newRole === 'admin' ? 'このユーザーに管理者権限を付与しますか？' : '管理者権限を解除しますか？');
  if (!confirmed) return;

  try {
    btn.disabled = true;
    btn.textContent = '更新中...';
    
    await updateDoc(doc(db, 'users', uid), {
      role: newRole,
      updatedAt: serverTimestamp()
    });

    showToast('権限を更新しました', 'success');
    await loadUsers();
  } catch (err) {
    console.error('Update role error:', err);
    showToast('権限の更新に失敗しました。Firestoreの権限設定を確認してください。', 'error');
    btn.disabled = false;
    btn.textContent = currentRole === 'admin' ? '一般に戻す' : '管理者に昇格';
  }
});

refreshBtn.addEventListener('click', loadUsers);
logoutBtn.addEventListener('click', handleSignOut);
