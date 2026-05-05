// ============================================
// Aspire Path 書類審査システム — Applicant Main Logic
// ============================================

import { auth, db } from './firebase-config.js';
import { requireAuth, handleSignOut, setupPortalSwitch } from './auth.js';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from './mock-firebase.js';

// Import sub-modules
import { initRequirementForm, loadRequirementData, saveRequirement, submitRequirement } from './requirement.js';
import { initDocumentForm, loadDocumentData, saveDocument, submitDocument } from './document-form.js';
import { initTranscriptForm, loadTranscriptData } from './transcript.js';

// ---- State ----
let currentUser = null;
let currentUserData = null;
let applicationDoc = null;
let applicationId = null;

// ---- DOM ----
const loadingState = document.getElementById('loadingState');
const dashboardSection = document.getElementById('dashboardSection');
const profileSection = document.getElementById('profileSection');
const requirementSection = document.getElementById('requirementSection');
const documentSection = document.getElementById('documentSection');
const transcriptSection = document.getElementById('transcriptSection');

// ---- Toast System ----
export function showToast(message, type = 'info') {
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

// ---- Confirm Modal ----
export function showConfirm(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    modal.classList.add('modal-overlay--active');

    const cleanup = () => {
      modal.classList.remove('modal-overlay--active');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onCancel);
    };

    const okBtn = document.getElementById('confirmOk');
    const cancelBtn = document.getElementById('confirmCancel');
    const closeBtn = document.getElementById('confirmClose');

    const onOk = () => { cleanup(); resolve(true); };
    const onCancel = () => { cleanup(); resolve(false); };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);
  });
}

// ---- Section Navigation ----
export function showSection(sectionId) {
  [dashboardSection, profileSection, requirementSection, documentSection, transcriptSection].forEach(s => {
    if (s) {
      s.classList.remove('section--active');
      s.classList.add('hidden');
    }
  });
  const target = document.getElementById(sectionId);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('section--active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ---- Update Status Badges ----
export function updateStatusBadge(elementId, status) {
  const badge = document.getElementById(elementId);
  const data = applicationDoc || {};
  
  const labels = {
    not_started: '未提出',
    not_set: '未設定',
    draft: '下書き',
    submitted: '提出済',
    set: '完了',
    needs_action: '要対応 ⚠️'
  };

  const classes = {
    not_started: 'status-badge--not-started',
    not_set: 'status-badge--not-started',
    draft: 'status-badge--draft',
    submitted: 'status-badge--submitted',
    set: 'status-badge--submitted',
    needs_action: 'status-badge--action'
  };

  let label = labels[status] || '未提出';
  let className = classes[status] || classes.not_started;

  // Custom logic for Transcript Email Pending
  if (elementId === 'transcriptStatusBadge' && status === 'submitted' && data.transcriptMethod === 'email') {
    label = '確認中';
    className = 'status-badge--review'; // Blue indicator
  }

  badge.className = `status-badge ${className}`;
  badge.textContent = label;
}

export function updateOverallProgress() {
  const profileStatus = applicationDoc?.profileStatus || 'not_set';
  const reqStatus = applicationDoc?.requirementStatus || 'not_started';
  const docStatus = applicationDoc?.documentStatus || 'not_started';
  const transcriptStatus = applicationDoc?.transcriptStatus || 'not_started';

  let completed = 0;
  if (profileStatus === 'set') completed++;
  if (reqStatus === 'submitted') completed++;
  if (docStatus === 'submitted') completed++;
  if (transcriptStatus === 'submitted') completed++;

  const pct = (completed / 4) * 100;
  document.getElementById('overallProgressBar').style.width = `${pct}%`;
  document.getElementById('overallProgressText').textContent = `${completed} / 4 完了`;

  // Overall status
  const statusCard = document.getElementById('statusCard');
  const overallStatus = applicationDoc?.overallStatus || 'pending';

  if (completed > 0 || overallStatus !== 'pending') {
    statusCard.style.display = 'block';
    const statusLabels = {
      pending: '審査前',
      under_review: '審査中',
      interview: '面接対象',
      accepted: '採用',
      rejected: '不採用',
    };
    const statusClasses = {
      pending: 'status-badge--not-started',
      under_review: 'status-badge--review',
      interview: 'status-badge--interview',
      accepted: 'status-badge--accepted',
      rejected: 'status-badge--rejected',
    };
    const badge = document.getElementById('overallStatusBadge');
    badge.className = `status-badge ${statusClasses[overallStatus] || ''}`;
    badge.textContent = statusLabels[overallStatus] || '審査前';
  } else {
    statusCard.style.display = 'none';
  }
}

// ---- Render Admin Corrections ----
function renderCorrections() {
  const corrections = applicationDoc?.adminCorrection || {};
  
  const sections = [
    { id: 'correctionReq', textId: 'correctionReqText', val: corrections.req },
    { id: 'correctionDoc', textId: 'correctionDocText', val: corrections.doc },
    { id: 'correctionTranscript', textId: 'correctionTranscriptText', val: corrections.transcript }
  ];

  let anyCorrection = false;
  sections.forEach(s => {
    const el = document.getElementById(s.id);
    const textEl = document.getElementById(s.textId);
    if (el && textEl) {
      if (s.val) {
        textEl.textContent = s.val;
        el.classList.remove('hidden');
        anyCorrection = true;
      } else {
        el.classList.add('hidden');
      }
    }
  });

  const dashboardAlert = document.getElementById('dashboardAlert');
  if (dashboardAlert) {
    if (anyCorrection) {
      dashboardAlert.classList.remove('hidden');
    } else {
      dashboardAlert.classList.add('hidden');
    }
  }
}

// ---- Load Application Data ----
async function loadApplication() {
  try {
    const q = query(
      collection(db, 'applications'),
      where('userId', '==', currentUser.uid)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      applicationId = docSnap.id;
      applicationDoc = docSnap.data();
    } else {
      // Create new application document
      const newRef = doc(collection(db, 'applications'));
      applicationId = newRef.id;
      applicationDoc = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUserData?.displayName || currentUser.displayName || currentUser.email,
        requirementStatus: 'not_started',
        documentStatus: 'not_started',
        transcriptStatus: 'not_started',
        overallStatus: 'pending',
        requirementData: {},
        documentData: {},
        transcriptUrl: null,
        aiEvaluation: null,
        adminFeedback: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(newRef, applicationDoc);
    }
  } catch (err) {
    console.error('Error loading application:', err);
    showToast('データの読み込みに失敗しました', 'error');
  }
}

// ---- Get/Set Application Reference ----
export function getApplicationRef() {
  return doc(db, 'applications', applicationId);
}

export function getApplicationData() {
  return applicationDoc;
}

export function setApplicationData(data) {
  applicationDoc = { ...applicationDoc, ...data };
}

// ---- Profile Logic ----
function initProfileForm() {
  const collegeSelect = document.getElementById('profileCollege');
  if (collegeSelect && collegeSelect.options.length <= 1) {
    COMMUNITY_COLLEGES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = c;
      collegeSelect.appendChild(opt);
    });
    
    collegeSelect.addEventListener('change', () => {
      const otherInput = document.getElementById('profileCollegeOther');
      if (collegeSelect.value === 'その他') {
        otherInput.classList.remove('hidden');
      } else {
        otherInput.classList.add('hidden');
        otherInput.value = '';
      }
    });
  }

  document.getElementById('profileBackBtn')?.addEventListener('click', () => showSection('dashboardSection'));
  document.getElementById('profileSaveBtn')?.addEventListener('click', saveProfile);
}

function loadProfileData() {
  if (!applicationDoc) return;
  const p = applicationDoc.profileData || {};
  
  const kanjiInput = document.getElementById('profileNameKanji');
  const enInput = document.getElementById('profileNameEn');
  
  if (kanjiInput) kanjiInput.value = p.nameKanji || '';
  if (enInput) enInput.value = p.nameEn || applicationDoc.userName || '';

  const collegeSelect = document.getElementById('profileCollege');
  const otherInput = document.getElementById('profileCollegeOther');
  
  if (collegeSelect && p.college) {
    let exists = false;
    Array.from(collegeSelect.options).forEach(o => { if(o.value === p.college) exists = true; });
    if (exists) {
      collegeSelect.value = p.college;
    } else {
      collegeSelect.value = 'その他';
      if (otherInput) {
        otherInput.classList.remove('hidden');
        otherInput.value = p.college;
      }
    }
  }

  const admInput = document.getElementById('profileAdmissionTerm');
  if (admInput) admInput.value = p.admissionTerm || '';
  
  const gradInput = document.getElementById('profileGraduationTerm');
  if (gradInput) gradInput.value = p.graduationTerm || '';
}

async function saveProfile() {
  const nameKanji = document.getElementById('profileNameKanji').value.trim();
  const nameEn = document.getElementById('profileNameEn').value.trim();
  const collegeSelect = document.getElementById('profileCollege');
  let college = collegeSelect.value;
  if (college === 'その他') {
    college = document.getElementById('profileCollegeOther').value.trim();
  }
  const admission = document.getElementById('profileAdmissionTerm').value.trim();
  const graduation = document.getElementById('profileGraduationTerm').value.trim();

  if (!nameKanji || !nameEn || !college || !admission || !graduation) {
    showToast('必須項目をすべて入力してください', 'error');
    return;
  }

  const profileData = {
    nameKanji,
    nameEn,
    college,
    admissionTerm: admission,
    graduationTerm: graduation
  };

  try {
    const appRef = doc(db, 'applications', applicationId);
    const updates = {
      profileData: profileData,
      profileStatus: 'set',
      userName: nameEn, 
      updatedAt: serverTimestamp(),
      profileLastSubmittedAt: serverTimestamp()
    };
    
    // Set first submission time if not exists
    if (!applicationDoc.profileSubmittedAt) {
      updates.profileSubmittedAt = serverTimestamp();
    }

    await updateDoc(appRef, updates);
    
    applicationDoc.profileData = profileData;
    applicationDoc.profileStatus = 'set';
    applicationDoc.userName = nameEn;
    if (!applicationDoc.profileSubmittedAt) {
      applicationDoc.profileSubmittedAt = new Date(); // local optimistic update
    }
    applicationDoc.profileLastSubmittedAt = new Date();
    
    document.getElementById('userName').textContent = nameEn;
    updateStatusBadge('profileStatusBadge', 'set');
    updateOverallProgress();
    showToast('プロフィールを保存しました', 'success');
    showSection('dashboardSection');
  } catch (err) {
    console.error('Save profile error:', err);
    showToast('保存に失敗しました', 'error');
  }
}

// ---- Accepted Portal Logic ----
function initAcceptedPortal() {
  const panel = document.getElementById('acceptedPortalPanel');
  if (!panel) return;
  panel.classList.remove('hidden');

  const ad = applicationDoc?.acceptedData || {};

  // 1. Essay URL
  const urlContainer = document.getElementById('acceptedEssayUrlContainer');
  if (ad.essayDocUrl) {
    urlContainer.innerHTML = `<a href="${ad.essayDocUrl}" target="_blank" style="color:var(--color-primary);text-decoration:underline;font-weight:500;">📄 エッセイドキュメントを開く</a>`;
  }

  // 2. Essay Progress
  const prog = ad.essayProgress || { draft: 0, japanese: 0, english: 0 };
  document.getElementById('acceptedProgressDraft').value = prog.draft || 0;
  document.getElementById('acceptedProgressJa').value = prog.japanese || 0;
  document.getElementById('acceptedProgressEn').value = prog.english || 0;

  // 3. Application Complete Report
  const univList = document.getElementById('acceptedUnivList');
  const tagSelect = document.getElementById('acceptedTagUniv');
  
  if (univList && tagSelect) {
    univList.innerHTML = '';
    // Clear and re-populate TAG select (except the default option)
    while (tagSelect.options.length > 1) {
      tagSelect.remove(1);
    }

    const applied = ad.appliedUniversities || [];
    const tagUniv = ad.tagUniversity || '';

    if (typeof UC_CAMPUSES !== 'undefined') {
      UC_CAMPUSES.forEach(uc => {
        // Checkbox
        const lbl = document.createElement('label');
        lbl.className = 'checkbox-item';
        lbl.style.padding = '8px 12px';
        lbl.style.border = '1px solid var(--border-default)';
        lbl.style.borderRadius = 'var(--radius-md)';
        lbl.style.background = 'var(--bg-input)';
        
        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.value = uc.id;
        chk.checked = applied.includes(uc.id);
        chk.style.marginRight = '8px';
        
        const txt = document.createElement('span');
        txt.textContent = uc.name;
        txt.style.fontSize = '13px';
        
        lbl.appendChild(chk);
        lbl.appendChild(txt);
        univList.appendChild(lbl);

        // TAG Option
        const opt = document.createElement('option');
        opt.value = uc.id;
        opt.textContent = uc.name;
        tagSelect.appendChild(opt);
      });
    }

    tagSelect.value = tagUniv;
  }

  // Bind Save Buttons
  document.getElementById('acceptedProgressSaveBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('acceptedProgressSaveBtn');
    btn.disabled = true;
    btn.textContent = '保存中...';
    try {
      const draft = parseInt(document.getElementById('acceptedProgressDraft').value, 10);
      const jp = parseInt(document.getElementById('acceptedProgressJa').value, 10);
      const en = parseInt(document.getElementById('acceptedProgressEn').value, 10);

      const newProg = { draft, japanese: jp, english: en };
      await updateDoc(doc(db, 'applications', applicationId), {
        'acceptedData.essayProgress': newProg,
        updatedAt: serverTimestamp()
      });
      if (!applicationDoc.acceptedData) applicationDoc.acceptedData = {};
      applicationDoc.acceptedData.essayProgress = newProg;
      showToast('進捗を保存しました', 'success');
    } catch (err) {
      console.error(err);
      showToast('保存に失敗しました', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '進捗を保存';
    }
  });

  document.getElementById('acceptedUnivSaveBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('acceptedUnivSaveBtn');
    btn.disabled = true;
    btn.textContent = '保存中...';
    try {
      const checkboxes = document.querySelectorAll('#acceptedUnivList input[type="checkbox"]:checked');
      const applied = Array.from(checkboxes).map(c => c.value);
      const tag = document.getElementById('acceptedTagUniv').value;

      await updateDoc(doc(db, 'applications', applicationId), {
        'acceptedData.appliedUniversities': applied,
        'acceptedData.tagUniversity': tag,
        updatedAt: serverTimestamp()
      });
      if (!applicationDoc.acceptedData) applicationDoc.acceptedData = {};
      applicationDoc.acceptedData.appliedUniversities = applied;
      applicationDoc.acceptedData.tagUniversity = tag;
      showToast('出願状況を保存しました', 'success');
    } catch (err) {
      console.error(err);
      showToast('保存に失敗しました', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '出願状況を保存';
    }
  });
}

requireAuth(async (user, userData) => {
  currentUser = user;
  currentUserData = userData;

  // Update header
  const displayName = userData?.displayName || user.displayName || user.email;
  document.getElementById('userName').textContent = displayName;
  document.getElementById('userAvatar').textContent = displayName.charAt(0).toUpperCase();

  setupPortalSwitch(userData);

  // Load application data
  await loadApplication();

  // Update badges
  updateStatusBadge('profileStatusBadge', applicationDoc?.profileStatus || 'not_set');
  updateStatusBadge('reqStatusBadge', applicationDoc?.requirementStatus || 'not_started');
  updateStatusBadge('docStatusBadge', applicationDoc?.documentStatus || 'not_started');
  updateStatusBadge('transcriptStatusBadge', applicationDoc?.transcriptStatus || 'not_started');
  updateOverallProgress();

  // Initialize sub-forms
  initProfileForm();
  initRequirementForm();
  initDocumentForm();
  initTranscriptForm();

  // Load existing data into forms
  loadProfileData();
  if (applicationDoc?.requirementData) {
    loadRequirementData(applicationDoc.requirementData);
  }
  if (applicationDoc?.documentData) {
    loadDocumentData(applicationDoc.documentData);
  }
  if (applicationDoc) {
    loadTranscriptData(applicationDoc);
  }

  // Show Admin Corrections if any
  renderCorrections();

  if (applicationDoc?.overallStatus === 'accepted') {
    initAcceptedPortal();
    const dashSub = document.getElementById('dashboardSubtitle');
    if (dashSub) dashSub.style.display = 'none';
  }

  // Hide loading, show dashboard
  loadingState.classList.add('hidden');
  showSection('dashboardSection');
});

// ---- Event Listeners ----

// Logout
document.getElementById('logoutBtn')?.addEventListener('click', handleSignOut);

// Dashboard cards navigation
function setupNavigation() {
  const cards = [
    { id: 'cardProfile', section: 'profileSection' },
    { id: 'cardRequirement', section: 'requirementSection' },
    { id: 'cardDocument', section: 'documentSection' },
    { id: 'cardTranscript', section: 'transcriptSection' }
  ];

  cards.forEach(card => {
    const el = document.getElementById(card.id);
    if (el) {
      el.addEventListener('click', () => {
        showSection(card.section);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showSection(card.section);
        }
      });
    }
  });

  const backButtons = [
    { id: 'profileBackBtn' },
    { id: 'reqBackBtn' },
    { id: 'docBackBtn' },
    { id: 'transcriptBackBtn' }
  ];

  backButtons.forEach(btn => {
    const el = document.getElementById(btn.id);
    if (el) {
      el.addEventListener('click', () => {
        showSection('dashboardSection');
        updateStatusBadge('profileStatusBadge', applicationDoc?.profileStatus || 'not_set');
        updateStatusBadge('reqStatusBadge', applicationDoc?.requirementStatus || 'not_started');
        updateStatusBadge('docStatusBadge', applicationDoc?.documentStatus || 'not_started');
        updateStatusBadge('transcriptStatusBadge', applicationDoc?.transcriptStatus || 'not_started');
        updateOverallProgress();
      });
    }
  });
}

setupNavigation();

// Requirement Save/Submit
document.getElementById('reqSaveBtn')?.addEventListener('click', async () => {
  await saveRequirement();
  showToast('ドラフトを保存しました', 'success');
});

document.getElementById('reqSubmitBtn')?.addEventListener('click', async () => {
  const confirmed = await showConfirm(
    '提出確認',
    'クラス履修の確認を提出します。提出後も内容の修正は可能です。よろしいですか？'
  );
  if (confirmed) {
    const success = await submitRequirement();
    if (success) {
      updateStatusBadge('reqStatusBadge', 'submitted');
      updateOverallProgress();
      showToast('クラス履修の確認を提出しました！', 'success');
      showSection('dashboardSection');
    }
  }
});

// Document Save/Submit
document.getElementById('docSaveBtn')?.addEventListener('click', async () => {
  await saveDocument();
  showToast('ドラフトを保存しました', 'success');
});

document.getElementById('docSubmitBtn')?.addEventListener('click', async () => {
  const confirmed = await showConfirm(
    '提出確認',
    '書類を提出します。提出後も内容の修正は可能です。よろしいですか？'
  );
  if (confirmed) {
    const success = await submitDocument();
    if (success) {
      updateStatusBadge('docStatusBadge', 'submitted');
      updateOverallProgress();
      showToast('書類を提出しました！', 'success');
      showSection('dashboardSection');
    }
  }
});
