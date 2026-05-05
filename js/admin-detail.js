// ============================================
// Aspire Path 書類審査システム — Admin Detail Logic
// ============================================

import { auth, db } from './firebase-config.js';
import { requireAdmin, handleSignOut, setupPortalSwitch } from './auth.js';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  deleteField
} from './mock-firebase.js';

// ---- State ----
let applicationId = null;
let applicationData = null;

// ---- Toast ----
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Tab Navigation ----
document.getElementById('detailTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-nav__item');
  if (!btn) return;

  const tabId = btn.dataset.tab;

  // Update tab buttons
  document.querySelectorAll('.tab-nav__item').forEach(t => t.classList.remove('tab-nav__item--active'));
  btn.classList.add('tab-nav__item--active');

  // Update panels
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('tab-panel--active'));
  document.getElementById(tabId).classList.add('tab-panel--active');
});

// ---- Load Application ----
async function loadApplication() {
  const params = new URLSearchParams(window.location.search);
  applicationId = params.get('id');

  if (!applicationId) {
    window.location.href = 'admin.html';
    return;
  }

  try {
    const docRef = doc(db, 'applications', applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      showToast('応募データが見つかりません', 'error');
      setTimeout(() => { window.location.href = 'admin.html'; }, 2000);
      return;
    }

    applicationData = docSnap.data();
    renderDetail();
  } catch (err) {
    console.error('Load error:', err);
    showToast('データの読み込みに失敗しました', 'error');
  }
}

// ---- Render All Details ----
function renderDetail() {
  const app = applicationData;

  // Header
  const headerName = app.profileData?.nameKanji 
    ? `${app.profileData.nameKanji} (${app.userName})` 
    : (app.userName || '名前未設定');
    
  document.getElementById('detailName').textContent = headerName;
  document.getElementById('detailEmail').textContent = app.userEmail || '';
  document.getElementById('detailStatus').value = app.overallStatus || 'pending';
  document.getElementById('exemptQualitative').checked = !!app.isExemptQualitative;

  // Status badges
  setStatusBadge('detailReqStatus', app.requirementStatus);
  setStatusBadge('detailDocStatus', app.documentStatus);

  // Basic info
  renderBasicInfo(app);

  // Requirement
  renderRequirement(app);

  // Documents
  renderDocuments(app);

  // AI Evaluation
  renderAIEvaluation(app);

  // Admin feedback
  renderAdminFeedback(app);

  // Accepted Portal Admin
  const tabAcceptedNav = document.getElementById('tabAcceptedNav');
  if (tabAcceptedNav) {
    if (app.overallStatus === 'accepted') {
      tabAcceptedNav.style.display = 'inline-block';
      renderAcceptedAdmin(app);
    } else {
      tabAcceptedNav.style.display = 'none';
      // If currently on tabAccepted, switch back to tabBasic
      if (document.getElementById('tabAccepted')?.classList.contains('tab-panel--active')) {
        document.querySelector('.tab-nav__item[data-tab="tabBasic"]').click();
      }
    }
  }

  // Show content
  document.getElementById('loadingState').classList.add('hidden');
  document.getElementById('detailContent').classList.remove('hidden');
}

function setStatusBadge(elementId, status) {
  const badge = document.getElementById(elementId);
  const info = APP_STATUSES[status] || APP_STATUSES.not_started;
  badge.className = `status-badge status-badge--${info.class}`;
  badge.textContent = info.label;
}

// ---- Render Basic Info ----
function renderBasicInfo(app) {
  const docData = app.documentData || {};
  const reqData = app.requirementData || {};
  const profData = app.profileData || {};

  document.getElementById('detailNameKanji').textContent = profData.nameKanji || '—';
  document.getElementById('detailNameEn').textContent = profData.nameEn || app.userName || '—';
  const gpa = docData.gpa != null ? docData.gpa.toFixed(2) : '—';
  document.getElementById('detailGPA').textContent = gpa;
  document.getElementById('summaryGPA').textContent = gpa;

  // Render Top Choice in Summary
  const targets = reqData.targetUCMajors || [];
  const tagCampus = targets.find(t => t.rank === 'TAG');
  const firstChoice = targets.find(t => t.rank === 1);
  const summaryTargetEl = document.getElementById('summaryTarget');
  
  let targetHtml = '';
  if (firstChoice) {
    targetHtml += `<div style="margin-bottom:8px;"><strong>1st: ${firstChoice.campus.toUpperCase()}</strong><br><span style="font-size:12px; font-weight:400;">${firstChoice.major}</span></div>`;
  }
  if (tagCampus) {
    targetHtml += `<div style="color:var(--color-success); font-weight:600;">★ TAG: ${tagCampus.campus.toUpperCase()}<br><span style="font-size:12px; font-weight:400; color:var(--text-secondary);">${tagCampus.major}</span></div>`;
  }
  
  if (targetHtml) {
    summaryTargetEl.innerHTML = targetHtml;
  } else {
    summaryTargetEl.textContent = '未選択';
  }

  document.getElementById('detailCollege').textContent = profData.college || reqData.college || '—';
  document.getElementById('detailAdmissionTerm').textContent = profData.admissionTerm || '—';
  document.getElementById('detailGraduationTerm').textContent = profData.graduationTerm || '—';

  const transcriptEl = document.getElementById('transcriptAdminDisplay');
  const transcriptReqEl = document.getElementById('detailTranscriptRequirement');
  const transcriptActions = document.getElementById('transcriptAdminActions');
  
  if (app.transcriptStatus === 'submitted') {
    if (app.transcriptMethod === 'email') {
      const emailHtml = `<span class="status-badge status-badge--draft" style="font-size:12px;">📧 メール送信済み（未確認）</span>`;
      transcriptEl.innerHTML = emailHtml;
      if (transcriptReqEl) transcriptReqEl.innerHTML = emailHtml;
      transcriptActions.classList.remove('hidden');
    } else if (app.transcriptMethod === 'verified') {
      const verifiedHtml = `<span class="status-badge status-badge--submitted" style="font-size:12px;">✅ 確認済み (メール受領)</span>`;
      transcriptEl.innerHTML = verifiedHtml;
      if (transcriptReqEl) transcriptReqEl.innerHTML = verifiedHtml;
      transcriptActions.classList.add('hidden');
    } else {
      const linkHtml = `<a href="${app.transcriptUrl}" target="_blank" class="btn btn--secondary btn--sm" style="display:inline-flex;align-items:center;gap:4px;">
        <span>📄 リンクから表示</span>
      </a>`;
      transcriptEl.innerHTML = linkHtml;
      if (transcriptReqEl) transcriptReqEl.innerHTML = linkHtml;
      transcriptActions.classList.add('hidden');
    }
  } else {
    transcriptEl.textContent = '未提出';
    if (transcriptReqEl) transcriptReqEl.innerHTML = '<span class="text-subtle" style="font-size:12px;">成績表未提出</span>';
    transcriptActions.classList.add('hidden');
  }

  // Handle Manual Verification
  document.getElementById('btnVerifyTranscript').onclick = async () => {
    if (!confirm('この志願者の成績表受領を手動で承認しますか？')) return;
    try {
      await updateDoc(doc(db, 'applications', applicationId), {
        transcriptStatus: 'submitted',
        transcriptMethod: 'verified', // Mark as manually verified to distinguish from raw email sent
        updatedAt: serverTimestamp()
      });
      alert('成績表を承認しました。ステータスが「提出済み」になりました。');
      location.reload();
    } catch (err) {
      console.error(err);
      alert('保存に失敗しました。');
    }
  };

  // Campus and Majors List
  const majorsEl = document.getElementById('detailUCMajors');
  if (reqData.targetUCMajors && reqData.targetUCMajors.length > 0) {
    // Sort for display: 1st Choice > TAG > others
    const sortedMajors = [...reqData.targetUCMajors].sort((a, b) => {
      if (a.rank === 1) return -1;
      if (b.rank === 1) return 1;
      if (a.rank === 'TAG') return -1;
      if (b.rank === 'TAG') return 1;
      return (a.rank || 99) - (b.rank || 99);
    });

    const listHtml = sortedMajors.map(item => {
      const ucInfo = UC_CAMPUSES.find(u => u.id === item.campus);
      const name = ucInfo ? ucInfo.name : item.campus;
      const rankLabel = item.rank === 'TAG' 
        ? `<span class="status-badge status-badge--submitted" style="font-size:10px; padding: 2px 6px; vertical-align: middle; margin-right: 8px;">TAG</span>` 
        : (item.rank && item.rank !== 99 
            ? `<span class="status-badge status-badge--draft" style="font-size:10px; padding: 2px 6px; vertical-align: middle; margin-right: 8px;">第${item.rank}志望</span>` 
            : '');
      return `<li style="margin-bottom: 8px; list-style:none; display: flex; align-items: center;">${rankLabel} <strong>${escapeHtml(name)}</strong> — ${escapeHtml(item.major)}</li>`;
    }).join('');
    majorsEl.innerHTML = `<ul style="padding-left: 0; font-size: 14px;">${listHtml}</ul>`;
  } else {
    majorsEl.textContent = 'データなし';
  }

  // Auto check result
  const autoCheck = reqData.autoCheckResult;
  const autoCheckEl = document.getElementById('detailAutoCheck');
  if (autoCheck === 'pass') {
    autoCheckEl.innerHTML = '<span class="status-badge status-badge--submitted">OK — 要件充足</span>';
  } else if (autoCheck === 'fail') {
    autoCheckEl.innerHTML = '<span class="status-badge status-badge--rejected">NG — 要件不足あり</span>';
  } else {
    autoCheckEl.textContent = '未判定';
  }

  // GPA Explanation
  if (docData.gpaExplanation) {
    document.getElementById('detailGPAExplanation').classList.remove('hidden');
    document.getElementById('detailGPAExplText').textContent = docData.gpaExplanation;
  }

  // Timestamps
  const formatDate = (ts) => {
    if (!ts) return '—';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

  document.getElementById('tsProfileFirst').textContent = formatDate(app.profileSubmittedAt);
  document.getElementById('tsProfileLast').textContent = formatDate(app.profileLastSubmittedAt);
  document.getElementById('tsReqFirst').textContent = formatDate(app.requirementSubmittedAt);
  document.getElementById('tsReqLast').textContent = formatDate(app.requirementLastSubmittedAt);
  document.getElementById('tsDocFirst').textContent = formatDate(app.documentSubmittedAt);
  document.getElementById('tsDocLast').textContent = formatDate(app.documentLastSubmittedAt);
  document.getElementById('tsTranscriptFirst').textContent = formatDate(app.transcriptSubmittedAt);
  document.getElementById('tsTranscriptLast').textContent = formatDate(app.transcriptLastSubmittedAt);

  // Activities
  renderActivities(docData.activities);
}

function renderActivities(activities) {
  const container = document.getElementById('detailActivities');
  if (!activities || activities.length === 0) {
    container.innerHTML = '<div class="text-muted">活動データなし</div>';
    return;
  }

  container.innerHTML = `
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>活動名</th>
            <th>役割</th>
            <th>時間/週</th>
          </tr>
        </thead>
        <tbody>
          ${activities.map(a => `
            <tr>
              <td>${escapeHtml(a.name || '—')}</td>
              <td>${escapeHtml(a.role || '—')}</td>
              <td>${a.hoursPerWeek || 0}時間</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ---- Render Requirement ----
function renderRequirement(app) {
  const reqData = app.requirementData || {};
  const pattern = reqData.gePattern || 'calgetc'; // default to calgetc
  const areas = pattern === 'calgetc' ? CALGETC_AREAS : IGETC_AREAS;
  const patternLabel = pattern === 'calgetc' ? 'CalGETC' : 'IGETC';

  // Requirement Pattern Header
  const reqContainer = document.getElementById('detailCalGETC');
  const requirementList = reqData.requirementList || reqData.calgetcList || reqData.igetcList;

  if (requirementList) {
    let html = `<div style="margin-bottom:16px; font-weight:700; color:var(--accent-start);">選択されたパターン: ${patternLabel}</div>`;
    areas.forEach(area => {
      const list = requirementList[area.id] || [];
      const count = list.length;
      const isPass = count >= area.required;

      html += `
        <div class="requirement-area ${isPass ? 'requirement-area--pass' : 'requirement-area--fail'} mb-md">
          <div class="requirement-area__header">
            <div class="requirement-area__title" style="font-size:14px;">${area.name}</div>
            <span class="requirement-area__status ${isPass ? 'requirement-area__status--pass' : 'requirement-area__status--fail'}">
              ${(area.id === 'area6' && pattern === 'igetc' && reqData.loteCleared) ? 'Cleared' : `${count} / ${area.required}`}
            </span>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:8px;">
            ${(area.id === 'area6' && pattern === 'igetc' && reqData.loteCleared) 
              ? '<span class="status-badge status-badge--submitted" style="font-size:11px;">日本の高校卒業等により要件免除</span>'
              : (count > 0
                ? list.map(item => `<span style="display:inline-block;background:var(--bg-input);padding:4px 10px;border-radius:4px;margin:2px;font-size:12px;">✓ ${escapeHtml(item.code)} <small>(${escapeHtml(item.term || '時期未定')})</small>${item.lab ? ' <span style="background:var(--color-info);color:var(--text-inverse);padding:1px 4px;border-radius:2px;font-size:10px;font-weight:bold;margin-left:4px;">Lab</span>' : ''} ${item.grade ? ` <span style="color:var(--accent-gold); font-weight:700;">${item.grade}</span>` : ''}</span>`).join('')
                : '<span class="text-muted">入力なし</span>'
              )
            }
          </div>
        </div>
      `;
    });
    reqContainer.innerHTML = html;
  } else {
    reqContainer.innerHTML = '<div class="text-muted">データがありません</div>';
  }

  // Missing areas
  if (reqData.missingAreas && reqData.missingAreas.length > 0) {
    const missingDiv = document.getElementById('detailMissingAreas');
    missingDiv.classList.remove('hidden');
    missingDiv.innerHTML = `
      <div class="alert alert--error">
        <span class="alert__icon">⚠️</span>
        <div>
          <strong>不足エリアまたは入力フォーマット不備:</strong><br>
          ${reqData.missingAreas.map(a => `• ${escapeHtml(a)}`).join('<br>')}
        </div>
      </div>
    `;
  }

  // Supplement
  if (reqData.supplementComment) {
    document.getElementById('detailSupplement').classList.remove('hidden');
    document.getElementById('detailSupplementText').textContent = reqData.supplementComment;
  }

  // Major Prep
  const majorPrepContainer = document.getElementById('detailMajorPrep');
  if (reqData.majorPrepList) {
    const list = reqData.majorPrepList;

    if (list.length > 0) {
      majorPrepContainer.innerHTML = list.map(item =>
        `<div style="background:var(--bg-input);padding:8px 12px;border-radius:var(--radius-sm);margin-bottom:8px;font-size:13px;">
          <strong>${escapeHtml(item.code)}</strong> <span class="text-muted" style="margin-left:8px;">${escapeHtml(item.term || '')}</span>
        </div>`
      ).join('');
    } else {
      majorPrepContainer.innerHTML = '<div class="text-muted">入力なし</div>';
    }
  } else {
    majorPrepContainer.innerHTML = '<div class="text-muted">データがありません</div>';
  }
}

// ---- Render Documents ----
function renderDocuments(app) {
  const docData = app.documentData || {};

  document.getElementById('detailMotivation').textContent = docData.motivation || 'データなし';
  document.getElementById('detailSelfAnalysis').textContent = docData.selfAnalysis || 'データなし';

  // PIQ Prompt Display
  const promptTitleEl = document.getElementById('detailPIQPromptTitle');
  const promptTextEl = document.getElementById('detailPIQPromptText');
  
  if (docData.piqPromptId) {
    const selected = TRANSFER_PIQS.find(p => p.id === docData.piqPromptId);
    if (selected) {
      promptTitleEl.textContent = selected.title;
      promptTextEl.textContent = selected.promptJa;
    } else {
      promptTitleEl.textContent = '不明なプレンプト';
      promptTextEl.textContent = docData.piqPromptId;
    }
  } else {
    promptTitleEl.textContent = 'プロンプト未選択';
    promptTextEl.textContent = 'ユーザーは設問を選んでいません。';
  }

  document.getElementById('detailPIQ').textContent = docData.piqEssay || 'データなし';

  if (docData.piqEssay) {
    // Count raw characters excluding whitespace
    const charCount = docData.piqEssay.replace(/\s+/g, '').length;
    document.getElementById('detailPIQWordCount').textContent = `${charCount} 文字`;
  } else {
    document.getElementById('detailPIQWordCount').textContent = '0 文字';
  }
}

// ---- Render AI Evaluation (Manual Report) ----
function renderAIEvaluation(app) {
  const container = document.getElementById('aiManualReport');
  if (container && app.aiEvaluation && app.aiEvaluation.manualReport) {
    container.value = app.aiEvaluation.manualReport;
  }
}



// ---- Save Status ----
document.getElementById('saveStatusBtn').addEventListener('click', async () => {
  const newStatus = document.getElementById('detailStatus').value;
  const isExempt = document.getElementById('exemptQualitative').checked;
  const ref = doc(db, 'applications', applicationId);

  try {
    await updateDoc(ref, {
      overallStatus: newStatus,
      isExemptQualitative: isExempt,
      updatedAt: serverTimestamp()
    });
    applicationData.overallStatus = newStatus;
    applicationData.isExemptQualitative = isExempt;
    showToast('ステータスを更新しました', 'success');
  } catch (err) {
    console.error('Save status error:', err);
    showToast('更新に失敗しました', 'error');
  }
});

// ---- Render Admin Feedback ----
function renderAdminFeedback(app) {
  const feedback = app.adminFeedback || {};
  document.getElementById('adminNote').value = feedback.reviewerNote || '';
  document.getElementById('adminScore').value = feedback.manualScore || '';
  document.getElementById('adminDecision').value = feedback.finalDecision || '';

  // Admin Corrections (Student-facing)
  const correction = app.adminCorrection || {};
  
  if (correction.req) {
    document.getElementById('feedbackReq').value = correction.req;
    document.getElementById('containerReqCorrection').classList.remove('hidden');
    document.getElementById('btnToggleCorrectionReqContainer').classList.add('hidden');
  }
  if (correction.doc) {
    document.getElementById('feedbackDoc').value = correction.doc;
    document.getElementById('containerDocCorrection').classList.remove('hidden');
    document.getElementById('btnToggleCorrectionDocContainer').classList.add('hidden');
  }
  if (correction.transcript) {
    document.getElementById('feedbackTranscript').value = correction.transcript;
    document.getElementById('containerTranscriptCorrection').classList.remove('hidden');
    document.getElementById('btnToggleCorrectionTranscriptContainer').classList.add('hidden');
  }
}

// ---- Save Admin Feedback (Reviewer Notes) ----
document.getElementById('saveAdminFeedback').addEventListener('click', async () => {
  const feedback = {
    reviewerNote: document.getElementById('adminNote').value.trim(),
    manualScore: parseInt(document.getElementById('adminScore').value) || null,
    finalDecision: document.getElementById('adminDecision').value.trim(),
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, 'applications', applicationId), {
      adminFeedback: feedback,
      updatedAt: serverTimestamp(),
    });
    showToast('メモ・評価を保存しました', 'success');
  } catch (err) {
    console.error('Feedback save error:', err);
    showToast('保存に失敗しました', 'error');
  }
});

// ---- Send Correction Feedbacks ----
async function sendCorrection(type, fieldId, statusField) {
  const comment = document.getElementById(fieldId).value.trim();
  if (!comment) {
    showToast('コメントを入力してください', 'error');
    return;
  }

  try {
    const updateData = {
      [`adminCorrection.${type}`]: comment,
      [statusField]: 'needs_action',
      updatedAt: serverTimestamp()
    };
    await updateDoc(doc(db, 'applications', applicationId), updateData);
    showToast('修正依頼を送信し、ステータスを更新しました', 'success');
    
    // Refresh to show badge update
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    console.error('Correction save error:', err);
    showToast('送信に失敗しました', 'error');
  }
}

document.getElementById('btnSendFeedbackReq').addEventListener('click', () => 
  sendCorrection('req', 'feedbackReq', 'requirementStatus'));

document.getElementById('btnSendFeedbackDoc').addEventListener('click', () => 
  sendCorrection('doc', 'feedbackDoc', 'documentStatus'));

document.getElementById('btnSendFeedbackTranscript').addEventListener('click', () => 
  sendCorrection('transcript', 'feedbackTranscript', 'transcriptStatus'));

async function clearCorrection(type, statusField) {
  if (!confirm('この修正依頼を完了（削除）しますか？志願者側のメッセージも消えます。')) return;

  try {
    const updateData = {
      [`adminCorrection.${type}`]: deleteField(),
      [statusField]: 'submitted', // Revert to submitted as it's resolved
      updatedAt: serverTimestamp()
    };
    await updateDoc(doc(db, 'applications', applicationId), updateData);
    showToast('修正依頼を完了しました', 'success');
    setTimeout(() => location.reload(), 1500);
  } catch (err) {
    console.error('Clear correction error:', err);
    showToast('処理に失敗しました', 'error');
  }
}

document.getElementById('btnClearCorrectionReq').addEventListener('click', () => clearCorrection('req', 'requirementStatus'));
document.getElementById('btnClearCorrectionDoc').addEventListener('click', () => clearCorrection('doc', 'documentStatus'));
document.getElementById('btnClearCorrectionTranscript').addEventListener('click', () => clearCorrection('transcript', 'transcriptStatus'));

// ---- Toggle Correction Containers ----
function setupCorrectionToggles() {
  const configs = [
    { btnId: 'btnToggleCorrectionReq', containerId: 'containerReqCorrection', triggerContainerId: 'btnToggleCorrectionReqContainer' },
    { btnId: 'btnToggleCorrectionDoc', containerId: 'containerDocCorrection', triggerContainerId: 'btnToggleCorrectionDocContainer' },
    { btnId: 'btnToggleCorrectionTranscript', containerId: 'containerTranscriptCorrection', triggerContainerId: 'btnToggleCorrectionTranscriptContainer' }
  ];

  configs.forEach(conf => {
    const btn = document.getElementById(conf.btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      document.getElementById(conf.containerId).classList.remove('hidden');
      document.getElementById(conf.triggerContainerId).classList.add('hidden');
    });
  });
}

setupCorrectionToggles();

// ---- Save AI Report (Manual) ----
document.getElementById('saveAIReportBtn')?.addEventListener('click', async () => {
  const report = document.getElementById('aiManualReport').value;
  try {
    await updateDoc(doc(db, 'applications', applicationId), {
      'aiEvaluation.manualReport': report,
      updatedAt: serverTimestamp(),
    });
    showToast('AI判定レポートを保存しました', 'success');
  } catch (err) {
    console.error('AI Report save error:', err);
    showToast('保存に失敗しました', 'error');
  }
});

// ---- Generate AI Prompt ----
document.getElementById('btnCopyAIPrompt')?.addEventListener('click', () => {
  if (!applicationData || !applicationData.requirementData) {
    showToast('コピーできるデータがありません', 'error');
    return;
  }
  const reqData = applicationData.requirementData;
  const college = reqData.college || '不明';
  
  // Majors
  let majorsText = 'データなし';
  if (reqData.targetUCMajors && reqData.targetUCMajors.length > 0) {
    majorsText = reqData.targetUCMajors.map(item => {
      const ucInfo = UC_CAMPUSES.find(u => u.id === item.campus);
      const name = ucInfo ? ucInfo.name : item.campus;
      return `・${name} — ${item.major}`;
    }).join('\n');
  }

  // GE Pattern
  const pattern = reqData.gePattern || 'calgetc';
  const patternLabel = pattern === 'calgetc' ? 'CalGETC' : 'IGETC';
  const areas = pattern === 'calgetc' ? CALGETC_AREAS : IGETC_AREAS;

  let geText = '';
  const requirementList = reqData.requirementList || reqData.calgetcList || reqData.igetcList || {};
  areas.forEach(area => {
    const list = requirementList[area.id] || [];
    geText += `【${area.name}】（必要数: ${area.required}）\n`;
    
    if (area.id === 'area6' && pattern === 'igetc' && reqData.loteCleared) {
      geText += `  - [免除/クリア済み] 日本の高校卒業等により要件を満たしています\n`;
    } else if (list.length > 0) {
      list.forEach(i => {
        geText += `  - ${i.code} (${i.term || '時期未定'})${i.lab ? ' [Lab]' : ''}${i.grade ? ` Grade: ${i.grade}` : ''}\n`;
      });
    } else {
      geText += `  - 入力なし\n`;
    }
  });

  // Major Prep
  let majorPrepText = '';
  const prepList = reqData.majorPrepList || [];
  if (prepList.length > 0) {
    prepList.forEach(i => {
      majorPrepText += `  - ${i.code} (${i.term || '時期未定'})${i.grade ? ` Grade: ${i.grade}` : ''}\n`;
    });
  } else {
    majorPrepText += `  - 入力なし\n`;
  }

  const prompt = `以下の学生の履修クラスリストが、指定された大学・専攻の編入要件（Major Requirement）および ${patternLabel}（一般教養）の条件を満たしているか確認・判定してください。カリフォルニアのコミュニティカレッジからUCへの編入を想定しています。

■ 基本情報
所属コミュニティカレッジ: ${college}

■ 志望キャンパスと専攻
${majorsText}

■ ${patternLabel} 履修状況
${geText}
■ Major Preparation (専攻準備・その他科目)
${majorPrepText}

■ 学生からの補足コメント
${reqData.supplementComment || 'なし'}

【指示】
1. ${patternLabel}の要件を全て満たしているか確認し、不足があれば指摘してください。
2. 上記の志望専攻に対して、Assist.orgなどの典型的な要件に基づくMajor Preparation（数学、科学など）が網羅されているか、致命的な不足科目がないか分析してください。
3. 全体的な評価と、学生への今後のアドバイス（次学期に取るべきクラス等）をまとめてください。`;

  navigator.clipboard.writeText(prompt).then(() => {
    showToast('AI用プロンプトをコピーしました！ChatGPTに貼り付けてください', 'success');
  }).catch(err => {
    console.error('Clipboard export error:', err);
    showToast('コピーに失敗しました', 'error');
  });
});

// ---- Render Accepted Admin ----
function renderAcceptedAdmin(app) {
  const ad = app.acceptedData || {};

  // Essay URL
  document.getElementById('adminEssayUrl').value = ad.essayDocUrl || '';

  // Progress
  const prog = ad.essayProgress || {};
  document.getElementById('adminViewProgressDraft').textContent = `${prog.draft || 0} / 4`;
  document.getElementById('adminViewProgressJa').textContent = `${prog.japanese || 0} / 4`;
  document.getElementById('adminViewProgressEn').textContent = `${prog.english || 0} / 4`;

  // Applied Univs
  const applied = ad.appliedUniversities || [];
  const appliedEl = document.getElementById('adminViewAppliedUnivs');
  if (applied.length > 0) {
    const labels = applied.map(id => {
      const info = UC_CAMPUSES.find(u => u.id === id);
      return `<span style="display:inline-block; background:var(--bg-primary); padding:4px 8px; border:1px solid var(--border-default); border-radius:4px; margin-right:8px; margin-bottom:8px;">${info ? info.name : id}</span>`;
    }).join('');
    appliedEl.innerHTML = labels;
  } else {
    appliedEl.textContent = 'なし';
  }

  // TAG Univ
  const tagEl = document.getElementById('adminViewTagUniv');
  if (ad.tagUniversity) {
    const tagInfo = UC_CAMPUSES.find(u => u.id === ad.tagUniversity);
    tagEl.innerHTML = `<span style="display:inline-block; background:var(--color-success); color:white; padding:4px 8px; border-radius:4px; font-weight:700;">${tagInfo ? tagInfo.name : ad.tagUniversity}</span>`;
  } else {
    tagEl.textContent = '未選択';
  }
}

// Save Essay URL
document.getElementById('saveAdminEssayUrlBtn')?.addEventListener('click', async () => {
  const url = document.getElementById('adminEssayUrl').value.trim();
  const btn = document.getElementById('saveAdminEssayUrlBtn');
  btn.disabled = true;
  btn.textContent = '保存中...';
  try {
    await updateDoc(doc(db, 'applications', applicationId), {
      'acceptedData.essayDocUrl': url,
      updatedAt: serverTimestamp()
    });
    if (!applicationData.acceptedData) applicationData.acceptedData = {};
    applicationData.acceptedData.essayDocUrl = url;
    showToast('エッセイURLを保存しました', 'success');
  } catch (err) {
    console.error(err);
    showToast('保存に失敗しました', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'URLを保存';
  }
});

// ---- Logout ----
document.getElementById('logoutBtn').addEventListener('click', handleSignOut);

// ---- Initialize ----
requireAdmin(async (user, userData) => {
  const displayName = userData?.displayName || user.displayName || 'Admin';
  document.getElementById('adminName').textContent = displayName;
  document.getElementById('adminAvatar').textContent = displayName.charAt(0).toUpperCase();

  setupPortalSwitch(userData);
  await loadApplication();
});
