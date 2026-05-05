// ============================================
// Aspire Path 書類審査システム — Document Form Logic
// ============================================

import { db } from './firebase-config.js';
import {
  updateDoc,
  serverTimestamp,
} from './mock-firebase.js';
import { getApplicationRef, getApplicationData, setApplicationData, showToast } from './applicant.js';

// ---- Auto-save Timer ----
let autoSaveTimer = null;
const AUTO_SAVE_INTERVAL = 60000; // 60 seconds

// ---- Initialize Form ----
export function initDocumentForm() {
  addActivity(); // start with one empty activity row
  setupGPAWatcher();
  setupPIQPrompts();
  setupPIQCounter();
  startAutoSave();
}

// ---- GPA Watcher ----
function setupGPAWatcher() {
  const gpaInput = document.getElementById('docGPA');
  const explanationSection = document.getElementById('gpaExplanationSection');

  gpaInput.addEventListener('input', () => {
    let val = parseFloat(gpaInput.value);
    
    // Bounds check
    if (!isNaN(val)) {
      if (val > 4.0) {
        showToast('GPAは4.0が上限です', 'info');
        gpaInput.value = '4.0';
        val = 4.0;
      } else if (val < 0) {
        gpaInput.value = '0.0';
        val = 0.0;
      }
    }

    if (!isNaN(val) && val < GPA_THRESHOLD) {
      explanationSection.classList.remove('hidden');
    } else {
      explanationSection.classList.add('hidden');
    }
  });
}

// ---- PIQ Prompts Dropdown ----
function setupPIQPrompts() {
  const select = document.getElementById('docPIQSelect');
  const display = document.getElementById('piqPromptDisplay');
  const jaText = document.getElementById('piqPromptJa');
  const enText = document.getElementById('piqPromptEn');
  const considerJaText = document.getElementById('piqConsiderJa');
  const considerEnText = document.getElementById('piqConsiderEn');

  TRANSFER_PIQS.forEach(piq => {
    const opt = document.createElement('option');
    opt.value = piq.id;
    opt.textContent = piq.title;
    select.appendChild(opt);
  });

  select.addEventListener('change', () => {
    const selected = TRANSFER_PIQS.find(p => p.id === select.value);
    if (selected) {
      display.classList.remove('hidden');
      jaText.textContent = selected.promptJa;
      enText.textContent = selected.promptEn;
      if (selected.considerJa || selected.considerEn) {
        considerJaText.textContent = selected.considerJa || '';
        considerEnText.textContent = selected.considerEn || '';
        considerJaText.parentElement.style.display = 'block';
      } else {
        considerJaText.parentElement.style.display = 'none';
      }
    } else {
      display.classList.add('hidden');
    }
  });
}

// ---- PIQ Character Counter ----
function setupPIQCounter() {
  const textarea = document.getElementById('docPIQ');
  const counter = document.getElementById('piqCounter');
  const wordCount = document.getElementById('piqWordCount');
  const wordLimit = document.getElementById('piqWordLimit');

  wordLimit.textContent = `(${PIQ_CHAR_MIN}〜${PIQ_CHAR_MAX} 文字)`;

  textarea.addEventListener('input', () => {
    // Count raw characters excluding spaces and newlines
    const text = textarea.value.replace(/\s+/g, '');
    const charCount = text.length;
    wordCount.textContent = `${charCount} 文字`;

    counter.className = 'char-counter';
    if (charCount > PIQ_CHAR_MAX) {
      counter.classList.add('char-counter--over');
    } else if (charCount < PIQ_CHAR_MIN && charCount > 0) {
      counter.classList.add('char-counter--under');
    } else if (charCount >= PIQ_CHAR_MIN && charCount <= PIQ_CHAR_MAX) {
      counter.classList.add('char-counter--ok');
    }
  });
}

// ---- Activities Dynamic List ----
let activityCounter = 0;

function addActivity(data = null) {
  activityCounter++;
  const container = document.getElementById('activitiesList');
  const item = document.createElement('div');
  item.className = 'dynamic-list__item';
  item.id = `activity-${activityCounter}`;
  item.innerHTML = `
    <div class="form-group">
      <label class="form-group__label">活動名</label>
      <input type="text" class="form-input activity-name" placeholder="例: 学生会" value="${data?.name || ''}">
    </div>
    <div class="form-group">
      <label class="form-group__label">役割</label>
      <input type="text" class="form-input activity-role" placeholder="例: 会長" value="${data?.role || ''}">
    </div>
    <div class="form-group">
      <label class="form-group__label">時間/週</label>
      <input type="number" class="form-input activity-hours" placeholder="例: 10" min="0" max="40" style="max-width:100px;" value="${data?.hoursPerWeek || ''}">
    </div>
    <button class="dynamic-list__remove" type="button" title="削除" data-remove="${activityCounter}">×</button>
  `;
  container.appendChild(item);

  // Remove button listener
  item.querySelector('.dynamic-list__remove').addEventListener('click', () => {
    item.remove();
  });
}

document.getElementById('addActivityBtn')?.addEventListener('click', () => addActivity());

// ---- Collect Activities Data ----
function collectActivities() {
  const items = document.querySelectorAll('#activitiesList .dynamic-list__item');
  const activities = [];

  items.forEach(item => {
    const name = item.querySelector('.activity-name').value.trim();
    const role = item.querySelector('.activity-role').value.trim();
    const hours = item.querySelector('.activity-hours').value;

    if (name || role || hours) {
      activities.push({
        name,
        role,
        hoursPerWeek: hours ? parseInt(hours) : 0,
      });
    }
  });

  return activities;
}

// ---- Collect All Document Data ----
function collectDocumentData() {
  return {
    gpa: parseFloat(document.getElementById('docGPA').value) || null,
    gpaExplanation: document.getElementById('docGPAExplanation').value.trim(),
    activities: collectActivities(),
    motivation: document.getElementById('docMotivation').value.trim(),
    selfAnalysis: document.getElementById('docSelfAnalysis').value.trim(),
    piqPromptId: document.getElementById('docPIQSelect').value,
    piqEssay: document.getElementById('docPIQ').value.trim(),
  };
}

// ---- Load Existing Data ----
export function loadDocumentData(data) {
  const appData = getApplicationData();
  const isExempt = !!appData.isExemptQualitative;
  const alertEl = document.getElementById('exemptQualitativeAlert');
  const qualitativeCard = document.querySelector('#documentSection .card:nth-of-type(2)'); // Qual Data card

  if (isExempt) {
    alertEl.classList.remove('hidden');
    if (qualitativeCard) qualitativeCard.classList.add('hidden');
  } else {
    alertEl.classList.add('hidden');
    if (qualitativeCard) qualitativeCard.classList.remove('hidden');
  }

  if (!data) return;

  // GPA
  if (data.gpa != null) {
    document.getElementById('docGPA').value = data.gpa;
    if (data.gpa < GPA_THRESHOLD) {
      document.getElementById('gpaExplanationSection').classList.remove('hidden');
    }
  }
  if (data.gpaExplanation) {
    document.getElementById('docGPAExplanation').value = data.gpaExplanation;
  }

  // Activities
  if (data.activities && data.activities.length > 0) {
    // Remove default empty row
    document.getElementById('activitiesList').innerHTML = '';
    activityCounter = 0;
    data.activities.forEach(act => addActivity(act));
  }

  // Text fields
  if (data.motivation) document.getElementById('docMotivation').value = data.motivation;
  if (data.selfAnalysis) document.getElementById('docSelfAnalysis').value = data.selfAnalysis;
  
  if (data.piqPromptId) {
    document.getElementById('docPIQSelect').value = data.piqPromptId;
    document.getElementById('docPIQSelect').dispatchEvent(new Event('change'));
  }

  if (data.piqEssay) {
    document.getElementById('docPIQ').value = data.piqEssay;
    // Trigger character count
    document.getElementById('docPIQ').dispatchEvent(new Event('input'));
  }
}

// ---- Save as Draft ----
export async function saveDocument() {
  const data = collectDocumentData();
  const ref = getApplicationRef();
  const appData = getApplicationData();
  const newStatus = appData.documentStatus === 'submitted' ? 'submitted' : 'draft';

  try {
    await updateDoc(ref, {
      documentData: data,
      documentStatus: newStatus,
      updatedAt: serverTimestamp(),
    });
    setApplicationData({ documentData: data, documentStatus: newStatus });
    updateAutoSaveIndicator('保存完了');
  } catch (err) {
    console.error('Save document error:', err);
    showToast('保存に失敗しました', 'error');
  }
}

// ---- Submit ----
export async function submitDocument() {
  const data = collectDocumentData();
  const ref = getApplicationRef();
  const appData = getApplicationData();
  const isExempt = !!appData.isExemptQualitative;

  // Validation
  const errors = [];
  if (data.gpa === null || isNaN(data.gpa)) errors.push('GPAを入力してください');
  if (data.gpa !== null && data.gpa < GPA_THRESHOLD && !data.gpaExplanation) {
    errors.push('GPA補足説明を入力してください');
  }

  if (!isExempt) {
    if (!data.motivation) errors.push('志望理由を入力してください');
    if (!data.selfAnalysis) errors.push('設問回答を入力してください');
    if (!data.piqPromptId) errors.push('PIQエッセイのプロンプト（設問）を選択してください');
    if (!data.piqEssay) errors.push('PIQエッセイを入力してください');

    // PIQ character count
    const charCount = data.piqEssay ? data.piqEssay.replace(/\s+/g, '').length : 0;
    if (data.piqEssay && charCount < PIQ_CHAR_MIN) {
      errors.push(`PIQエッセイは${PIQ_CHAR_MIN}文字以上で記入してください（現在${charCount}文字）`);
    }
    if (data.piqEssay && charCount > PIQ_CHAR_MAX) {
      errors.push(`PIQエッセイは${PIQ_CHAR_MAX}文字以下にしてください（現在${charCount}文字）`);
    }
  }

  if (errors.length > 0) {
    errors.forEach(e => showToast(e, 'error'));
    return false;
  }

  try {
    const appData = getApplicationData();
    const updates = {
      documentData: data,
      documentStatus: 'submitted',
      updatedAt: serverTimestamp(),
      documentLastSubmittedAt: serverTimestamp()
    };

    if (!appData.documentSubmittedAt) {
      updates.documentSubmittedAt = serverTimestamp();
    }

    await updateDoc(ref, updates);
    
    const localUpdates = { documentData: data, documentStatus: 'submitted', documentLastSubmittedAt: new Date() };
    if (!appData.documentSubmittedAt) {
      localUpdates.documentSubmittedAt = new Date();
    }
    setApplicationData(localUpdates);
    return true;
  } catch (err) {
    console.error('Submit document error:', err);
    showToast('提出に失敗しました', 'error');
    return false;
  }
}

// ---- Auto-Save ----
function startAutoSave() {
  autoSaveTimer = setInterval(async () => {
    const appData = getApplicationData();
    // Only auto-save if there's something to save (draft or submitted)
    if (appData && (appData.documentStatus === 'draft' || appData.documentStatus === 'submitted')) {
      try {
        const data = collectDocumentData();
        const ref = getApplicationRef();
        await updateDoc(ref, {
          documentData: data,
          updatedAt: serverTimestamp(),
        });
        setApplicationData({ documentData: data });
        updateAutoSaveIndicator('自動保存完了');
      } catch (err) {
        console.error('Auto-save error:', err);
        updateAutoSaveIndicator('自動保存失敗');
      }
    }
  }, AUTO_SAVE_INTERVAL);

  updateAutoSaveIndicator('自動保存: 有効（60秒間隔）');
}

function updateAutoSaveIndicator(text) {
  const indicator = document.getElementById('autoSaveIndicator');
  if (indicator) {
    const now = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    indicator.textContent = `${text} (${now})`;
  }
}
