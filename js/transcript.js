// ============================================
// Aspire Path 書類審査システム — Transcript Link & Email Logic
// ============================================

import { db } from './firebase-config.js';
import { 
  updateDoc, 
  serverTimestamp 
} from './mock-firebase.js';
import { getApplicationRef, getApplicationData, setApplicationData, showToast, showSection, updateStatusBadge, updateOverallProgress } from './applicant.js';

// ---- Elements ----
let urlInput, submitBtn, emailSentBtn, existingInfo, viewLink, existingStatusLabel;
let existingUrlDisplay, existingEmailDisplay, emailSentSection;

// ---- Initialization ----
export function initTranscriptForm() {
  urlInput = document.getElementById('transcriptUrlInput');
  submitBtn = document.getElementById('transcriptSubmitBtn');
  emailSentBtn = document.getElementById('transcriptEmailSentBtn');
  existingInfo = document.getElementById('existingTranscript');
  viewLink = document.getElementById('viewTranscriptLink');
  existingStatusLabel = document.getElementById('existingStatusLabel');
  existingUrlDisplay = document.getElementById('existingUrlDisplay');
  existingEmailDisplay = document.getElementById('existingEmailDisplay');
  emailSentSection = document.getElementById('emailSentSection');

  if (!submitBtn) return;
  setupEventListeners();
}

function setupEventListeners() {
  submitBtn.addEventListener('click', handleSubmitUrl);
  emailSentBtn.addEventListener('click', handleEmailSent);
}

async function handleSubmitUrl() {
  const url = urlInput.value.trim();
  
  if (!url) {
    showToast('共有リンクのURLを入力してください', 'error');
    return;
  }

  if (!url.startsWith('http')) {
    showToast('有効なURLを入力してください', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '保存中...';

  try {
    const appRef = getApplicationRef();
    const appData = getApplicationData();
    const updates = {
      transcriptUrl: url,
      transcriptMethod: 'link',
      transcriptStatus: 'submitted',
      updatedAt: serverTimestamp(),
      transcriptLastSubmittedAt: serverTimestamp()
    };

    if (!appData.transcriptSubmittedAt) {
      updates.transcriptSubmittedAt = serverTimestamp();
    }

    await updateDoc(appRef, updates);

    showToast('成績表のリンクを保存しました', 'success');
    
    // Update local state
    setApplicationData({ 
      transcriptUrl: url, 
      transcriptMethod: 'link', 
      transcriptStatus: 'submitted',
      transcriptSubmittedAt: appData.transcriptSubmittedAt || new Date(),
      transcriptLastSubmittedAt: new Date()
    });
    
    updateStatusBadge('transcriptStatusBadge', 'submitted');
    updateOverallProgress();
    
    setTimeout(() => {
      showSection('dashboardSection');
      // Re-enable button in case they come back
      submitBtn.disabled = false;
      submitBtn.textContent = '📤 リンクを提出する';
    }, 1500);

  } catch (err) {
    console.error('Firestore update error:', err);
    showToast('提出に失敗しました', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = '📤 リンクを提出する';
  }
}

async function handleEmailSent() {
  emailSentBtn.disabled = true;
  emailSentBtn.textContent = '処理中...';

  try {
    const appRef = getApplicationRef();
    const appData = getApplicationData();
    const updates = {
      transcriptMethod: 'email',
      transcriptStatus: 'submitted', // Set to submitted to count towards progress, but method=email tells admin to verify
      updatedAt: serverTimestamp(),
      transcriptLastSubmittedAt: serverTimestamp()
    };

    if (!appData.transcriptSubmittedAt) {
      updates.transcriptSubmittedAt = serverTimestamp();
    }

    await updateDoc(appRef, updates);

    showToast('メール送信済みとして記録しました', 'success');
    
    // Update local state
    setApplicationData({ 
      transcriptMethod: 'email', 
      transcriptStatus: 'submitted',
      transcriptSubmittedAt: appData.transcriptSubmittedAt || new Date(),
      transcriptLastSubmittedAt: new Date()
    });
    
    updateStatusBadge('transcriptStatusBadge', 'submitted');
    updateOverallProgress();

    setTimeout(() => {
      showSection('dashboardSection');
      // Re-enable button in case they come back
      emailSentBtn.disabled = false;
      emailSentBtn.textContent = '📧 メールで送信済み';
    }, 1500);

  } catch (err) {
    console.error('Firestore update error:', err);
    showToast('処理に失敗しました', 'error');
    emailSentBtn.disabled = false;
    emailSentBtn.textContent = '📧 メールで送信済み';
  }
}

// ---- Load Existing Data ----
export function loadTranscriptData(data) {
  if (data && data.transcriptStatus === 'submitted') {
    existingInfo.classList.remove('hidden');
    
    if (data.transcriptMethod === 'email') {
      existingStatusLabel.textContent = '成績表：メール確認待ち';
      existingEmailDisplay.classList.remove('hidden');
      existingUrlDisplay.classList.add('hidden');
      emailSentSection.classList.add('hidden');
    } else if (data.transcriptMethod === 'verified') {
      existingStatusLabel.textContent = '成績表：提出済み (確認完了)';
      existingEmailDisplay.innerHTML = '<span style="color:var(--color-success);">管理者がメール受領を確認しました。</span>';
      existingEmailDisplay.classList.remove('hidden');
      existingUrlDisplay.classList.add('hidden');
      emailSentSection.classList.add('hidden');
    } else {
      existingStatusLabel.textContent = '成績表：リンク提出済み';
      if (urlInput) urlInput.value = data.transcriptUrl || '';
      existingUrlDisplay.classList.remove('hidden');
      existingEmailDisplay.classList.add('hidden');
      viewLink.href = data.transcriptUrl || '#';
    }
  }
}
