// ============================================
// Aspire Path 書類審査システム — Admin Dashboard Logic
// ============================================

import { auth, db } from './firebase-config.js';
import { requireAdmin, handleSignOut, setupPortalSwitch } from './auth.js';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
} from './mock-firebase.js';

// ---- State ----
let allApplications = [];
let filteredApplications = [];
let currentSort = { field: null, direction: 'desc' };

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

// ---- Load All Applications ----
async function loadAllApplications() {
  try {
    const snapshot = await getDocs(collection(db, 'applications'));
    allApplications = [];
    snapshot.forEach(docSnap => {
      allApplications.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Default sort: Newest updated first
    allApplications.sort((a, b) => {
      const timeA = a.updatedAt?.seconds || 0;
      const timeB = b.updatedAt?.seconds || 0;
      return timeB - timeA;
    });

    applyFilters();
    updateStats();
  } catch (err) {
    console.error('Load applications error:', err);
    showToast('データの読み込みに失敗しました', 'error');
  }
}

// ---- Stats ----
function updateStats() {
  const showHidden = document.getElementById('filterShowHidden').checked;
  const baseApps = showHidden ? allApplications : allApplications.filter(a => !a.isHidden);

  document.getElementById('statTotal').textContent = baseApps.length;

  const bothSubmitted = baseApps.filter(a =>
    a.requirementStatus === 'submitted' && a.documentStatus === 'submitted'
  ).length;
  document.getElementById('statSubmitted').textContent = bothSubmitted;

  const interview = baseApps.filter(a => a.overallStatus === 'interview').length;
  document.getElementById('statInterview').textContent = interview;

  const accepted = baseApps.filter(a => a.overallStatus === 'accepted').length;
  document.getElementById('statAccepted').textContent = accepted;
}

// ---- Filters ----
function applyFilters() {
  const submissionFilter = document.getElementById('filterSubmission').value;
  const statusFilter = document.getElementById('filterStatus').value;
  const reqCheckFilter = document.getElementById('filterReqCheck').value;
  const campusFilter = document.getElementById('filterCampus').value;
  const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();

  filteredApplications = allApplications.filter(app => {
    // Campus filter
    if (campusFilter !== 'all') {
      const targets = app.requirementData?.targetUCMajors || [];
      if (!targets.some(t => t.campus === campusFilter)) return false;
    }

    // Submission filter
    if (submissionFilter === 'both_submitted') {
      if (app.requirementStatus !== 'submitted' || app.documentStatus !== 'submitted') return false;
    } else if (submissionFilter === 'partial') {
      const reqS = app.requirementStatus === 'submitted';
      const docS = app.documentStatus === 'submitted';
      if ((reqS && docS) || (!reqS && !docS && app.requirementStatus === 'not_started' && app.documentStatus === 'not_started')) return false;
    } else if (submissionFilter === 'not_started') {
      if (app.requirementStatus !== 'not_started' || app.documentStatus !== 'not_started') return false;
    }

    // Status filter
    if (statusFilter !== 'all' && app.overallStatus !== statusFilter) return false;

    // Requirement check filter
    if (reqCheckFilter !== 'all') {
      const result = app.requirementData?.autoCheckResult;
      if (reqCheckFilter === 'pass' && result !== 'pass') return false;
      if (reqCheckFilter === 'fail' && result !== 'fail') return false;
      if (reqCheckFilter === 'none' && result != null) return false;
    }

    // Search
    if (searchTerm) {
      const nameEn = (app.userName || '').toLowerCase();
      const nameKanji = (app.profileData?.nameKanji || '').toLowerCase();
      const email = (app.userEmail || '').toLowerCase();
      if (!nameEn.includes(searchTerm) && !nameKanji.includes(searchTerm) && !email.includes(searchTerm)) return false;
    }

    // Hide specific applicants
    const showHidden = document.getElementById('filterShowHidden').checked;
    if (!showHidden && app.isHidden) return false;

    return true;
  });

  // Apply sort
  if (currentSort.field) {
    sortApplications(currentSort.field, currentSort.direction);
  }

  renderTable();
}

// ---- Sort ----
function sortApplications(field, direction) {
  filteredApplications.sort((a, b) => {
    let valA, valB;

    if (field === 'gpa') {
      valA = a.documentData?.gpa || 0;
      valB = b.documentData?.gpa || 0;
    }

    if (direction === 'asc') return valA - valB;
    return valB - valA;
  });
}

// ---- Render Table ----
function renderTable() {
  const tbody = document.getElementById('applicantTableBody');
  const emptyState = document.getElementById('emptyState');

  if (filteredApplications.length === 0) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  tbody.innerHTML = filteredApplications.map(app => {
    const reqStatus = app.requirementStatus || 'not_started';
    const docStatus = app.documentStatus || 'not_started';
    const gpa = app.documentData?.gpa != null ? app.documentData.gpa.toFixed(2) : '—';
    const autoCheck = app.requirementData?.autoCheckResult;
    const overallStatus = app.overallStatus || 'pending';

    const statusLabels = REVIEW_STATUSES;
    const reqStatusInfo = APP_STATUSES[reqStatus] || APP_STATUSES.not_started;
    const docStatusInfo = APP_STATUSES[docStatus] || APP_STATUSES.not_started;
    const overallInfo = statusLabels[overallStatus] || statusLabels.pending;

    let autoCheckBadge = '<span class="text-muted">—</span>';
    if (autoCheck === 'pass') {
      autoCheckBadge = '<span class="status-badge status-badge--submitted" style="font-size:11px;">OK</span>';
    } else if (autoCheck === 'fail') {
      autoCheckBadge = '<span class="status-badge status-badge--rejected" style="font-size:11px;">NG</span>';
    }

    // Determine Top Choice
    const targets = app.requirementData?.targetUCMajors || [];
    let topChoiceBadge = '<span class="text-muted">—</span>';
    const tagCampus = targets.find(t => t.rank === 'TAG');
    const firstChoice = targets.find(t => t.rank === 1);
    
    topChoiceBadge = '';
    if (firstChoice) {
      topChoiceBadge += `<div style="font-weight:600; font-size:12px;">1st: ${firstChoice.campus.toUpperCase()}</div>`;
    }
    if (tagCampus) {
      topChoiceBadge += `<div style="font-weight:600; color:var(--color-success); font-size:12px;">★TAG: ${tagCampus.campus.toUpperCase()}</div>`;
    }
    if (!topChoiceBadge) topChoiceBadge = '<span class="text-muted">—</span>';

    return `
      <tr>
        <td>
          <div style="font-weight:600; font-size:15px;">${escapeHtml(app.profileData?.nameKanji || '名前未設定')}</div>
          <div style="font-size:12px; color:var(--text-secondary);">${escapeHtml(app.userName || '')}</div>
          <div class="text-muted" style="font-size:11px;">${escapeHtml(app.userEmail || '')}</div>
        </td>
        <td>${topChoiceBadge}</td>
        <td>
          <span class="status-badge status-badge--${reqStatusInfo.class}" style="font-size:11px;">
            ${reqStatusInfo.label}
          </span>
        </td>
        <td>
          <span class="status-badge status-badge--${docStatusInfo.class}" style="font-size:11px;">
            ${docStatusInfo.label}
          </span>
        </td>
        <td style="font-family:var(--font-mono);font-weight:600;">${gpa}</td>
        <td>${autoCheckBadge}</td>
        <td>
          <select class="form-select form-select--sm" style="max-width:140px;"
                  data-app-id="${app.id}" data-field="overallStatus">
            <option value="pending" ${overallStatus === 'pending' ? 'selected' : ''}>審査前</option>
            <option value="under_review" ${overallStatus === 'under_review' ? 'selected' : ''}>審査中</option>
            <option value="interview" ${overallStatus === 'interview' ? 'selected' : ''}>面接対象</option>
            <option value="accepted" ${overallStatus === 'accepted' ? 'selected' : ''}>採用</option>
            <option value="rejected" ${overallStatus === 'rejected' ? 'selected' : ''}>不採用</option>
          </select>
        </td>
        <td>
          <div class="flex gap-sm">
            <a href="admin-detail.html?id=${app.id}" class="btn btn--secondary btn--sm">詳細</a>
            <button class="btn btn--ghost btn--sm toggle-hidden-btn" data-app-id="${app.id}" data-is-hidden="${app.isHidden ? 'true' : 'false'}" title="${app.isHidden ? '表示する' : '非表示にする'}">
              ${app.isHidden ? '👁️' : '🙈'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Add status change listeners
  tbody.querySelectorAll('select[data-field="overallStatus"]').forEach(select => {
    select.addEventListener('change', async (e) => {
      const appId = e.target.dataset.appId;
      const newStatus = e.target.value;
      try {
        await updateDoc(doc(db, 'applications', appId), { overallStatus: newStatus });
        // Update local state
        const app = allApplications.find(a => a.id === appId);
        if (app) app.overallStatus = newStatus;
        updateStats();
        showToast('ステータスを更新しました', 'success');
      } catch (err) {
        console.error('Status update error:', err);
        showToast('更新に失敗しました', 'error');
      }
    });
  });

  // Add hidden toggle listeners
  tbody.querySelectorAll('.toggle-hidden-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const appId = e.currentTarget.dataset.appId;
      const currentlyHidden = e.currentTarget.dataset.isHidden === 'true';
      const newHidden = !currentlyHidden;

      try {
        await updateDoc(doc(db, 'applications', appId), { isHidden: newHidden });
        const app = allApplications.find(a => a.id === appId);
        if (app) app.isHidden = newHidden;
        applyFilters();
        updateStats();
        showToast(newHidden ? '非表示にしました' : '表示に戻しました', 'success');
      } catch (err) {
        console.error('Hide toggle error:', err);
        showToast('更新に失敗しました', 'error');
      }
    });
  });
}

// ---- CSV Export ----
function exportToCSV() {
  if (allApplications.length === 0) {
    showToast('出力するデータがありません', 'error');
    return;
  }

  const headers = [
    'ユーザーID', '名前（漢字）', '名前（英字）', 'メールアドレス', 
    '所属カレッジ', '入学時期', '卒業時期',
    '審査ステータス', '履修判定 (CalGETC)', '書類ステータス', '成績表ステータス',
    '志望キャンパス/専攻（順位・TAG）', 'CalGETC詳細', 'Major Prep履修状況',
    'GPA', 'GPA補足説明', 'PIQプロンプト', 'PIQエッセイ', 
    '課外活動(Activities)', '成績表URL', 
    'プロフィール提出', 'プロフィール更新',
    '履修状況提出', '履修状況更新',
    '書類提出', '書類更新',
    '成績表提出', '成績表更新',
    '定性データ免除',
    'AI判定レポート', '管理者フィードバック', '修正依頼事項',
    '作成日時', '最終更新日時'
  ];

  const rows = allApplications.map(app => {
    const prof = app.profileData || {};
    const req = app.requirementData || {};
    const docData = app.documentData || {};
    const evalData = app.aiEvaluation || {};
    const correct = app.adminCorrection || {};
    
    // 1. UC Majors with Ranks
    const majorsStr = (req.targetUCMajors || [])
      .map(m => `${m.campus}: ${m.major} (Rank: ${m.rank})`)
      .join('; ');

    // 2. CalGETC Detail
    const calgetcDetail = CALGETC_AREAS.map(area => {
      const saved = (req.calgetc || {})[area.id] || [];
      const courses = saved.map(c => `${c.course}(${c.term})`).join(', ');
      return `${area.name}: [${courses || '未入力'}]`;
    }).join(' | ');

    // 3. Major Prep Detail
    const majorPrepStr = (req.majorPrep || [])
      .map(m => `${m.course} (${m.term})`)
      .join('; ');

    // 4. Activities
    const activitiesStr = (docData.activities || [])
      .map(a => `${a.name} [${a.role}] (${a.hoursPerWeek}h/wk)`)
      .join('; ');

    // 5. Corrections Summary
    const correctStr = [
      correct.req ? `履修:${correct.req}` : '',
      correct.doc ? `エッセイ:${correct.doc}` : '',
      correct.transcript ? `成績表:${correct.transcript}` : ''
    ].filter(s => s).join(' / ');

    // 6. Formatting Strings for CSV (strip newlines)
    const clean = (str) => String(str || '').replace(/\n/g, ' ').replace(/"/g, '""');

    const row = [
      clean(app.userId),
      clean(prof.nameKanji),
      clean(prof.nameEn || app.userName),
      clean(app.userEmail),
      clean(prof.college),
      clean(prof.admissionTerm),
      clean(prof.graduationTerm),
      clean(app.overallStatus),
      clean(req.autoCheckResult),
      clean(app.documentStatus),
      clean(app.transcriptStatus),
      clean(majorsStr),
      clean(calgetcDetail),
      clean(majorPrepStr),
      clean(docData.gpa != null ? docData.gpa.toFixed(2) : ''),
      clean(docData.gpaExplanation),
      clean(TRANSFER_PIQS.find(p => p.id === docData.piqPromptId)?.title),
      clean(docData.piqEssay),
      clean(activitiesStr),
      clean(app.transcriptUrl),
      app.profileSubmittedAt ? new Date(app.profileSubmittedAt.seconds * 1000).toLocaleString('ja-JP') : '',
      app.profileLastSubmittedAt ? new Date(app.profileLastSubmittedAt.seconds * 1000).toLocaleString('ja-JP') : '',
      app.requirementSubmittedAt ? new Date(app.requirementSubmittedAt.seconds * 1000).toLocaleString('ja-JP') : '',
      app.requirementLastSubmittedAt ? new Date(app.requirementLastSubmittedAt.seconds * 1000).toLocaleString('ja-JP') : '',
      app.documentSubmittedAt ? new Date(app.documentSubmittedAt.seconds * 1000).toLocaleString('ja-JP') : '',
      app.documentLastSubmittedAt ? new Date(app.documentLastSubmittedAt.seconds * 1000).toLocaleString('ja-JP') : '',
      app.transcriptSubmittedAt ? new Date(app.transcriptSubmittedAt.seconds * 1000).toLocaleString('ja-JP') : '',
      app.transcriptLastSubmittedAt ? new Date(app.transcriptLastSubmittedAt.seconds * 1000).toLocaleString('ja-JP') : '',
      app.isExemptQualitative ? '免除' : '',
      clean(evalData.manualReport),
      clean(app.adminFeedback),
      clean(correctStr),
      app.createdAt ? new Date(app.createdAt.seconds * 1000).toLocaleString('ja-JP') : '',
      app.updatedAt ? new Date(app.updatedAt.seconds * 1000).toLocaleString('ja-JP') : ''
    ];

    return row.map(val => `"${val}"`).join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n'); // Add BOM for Excel UTF-8
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `aspire_path_applicants_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ---- Helper: Escape HTML ----
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Initialize ----
requireAdmin(async (user, userData) => {
  const displayName = userData?.displayName || user.displayName || 'Admin';
  document.getElementById('adminName').textContent = displayName;
  document.getElementById('adminAvatar').textContent = displayName.charAt(0).toUpperCase();

  setupPortalSwitch(userData);
  await loadAllApplications();

  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('dashboardContent').classList.remove('hidden');
});

// ---- Event Listeners ----

// Logout
document.getElementById('logoutBtn').addEventListener('click', handleSignOut);

// Refresh
document.getElementById('refreshBtn').addEventListener('click', async () => {
  document.getElementById('loadingState').classList.remove('hidden');
  document.getElementById('dashboardContent').classList.add('hidden');
  await loadAllApplications();
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('dashboardContent').classList.remove('hidden');
  showToast('データを更新しました', 'success');
});

// Export CSV
document.getElementById('exportDataBtn').addEventListener('click', exportToCSV);

// Filters
['filterSubmission', 'filterStatus', 'filterReqCheck', 'filterCampus', 'filterShowHidden'].forEach(id => {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', () => {
      applyFilters();
      if (id === 'filterShowHidden') updateStats();
    });
  }
});
document.getElementById('searchInput').addEventListener('input', applyFilters);

// Sort
document.querySelectorAll('.data-table th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const field = th.dataset.sort;

    // Toggle direction
    if (currentSort.field === field) {
      currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.field = field;
      currentSort.direction = 'desc';
    }

    // Update header classes
    document.querySelectorAll('.data-table th.sortable').forEach(h => {
      h.classList.remove('sort-asc', 'sort-desc');
    });
    th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');

    sortApplications(currentSort.field, currentSort.direction);
    renderTable();
  });
});
