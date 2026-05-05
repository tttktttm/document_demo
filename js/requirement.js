// ============================================
// Aspire Path 書類審査システム — Requirement Check Logic
// ============================================

import { db } from './firebase-config.js';
import {
  updateDoc,
  serverTimestamp,
} from './mock-firebase.js';
import { getApplicationRef, getApplicationData, setApplicationData, showToast } from './applicant.js';

// ---- State ----
let currentGEPattern = 'calgetc'; // 'calgetc' or 'igetc'
let requirementState = {};   // { areaId: [{code: '', term: ''}], ... }
let majorPrepState = []; // [{code: '', term: ''}, ...]

// ---- Term Options Generator ----
function getTermOptionsHTML(selectedValue) {
  const currentYear = new Date().getFullYear();
  let html = `<option value="">時期を選択</option>`;
  
  const terms = ['Fall', 'Summer', 'Spring', 'Winter'];
  // 3 years in the past, 1 year in the future
  for (let y = currentYear + 1; y >= currentYear - 3; y--) {
    terms.forEach(t => {
      const val = `${t} ${y}`;
      html += `<option value="${val}" ${selectedValue === val ? 'selected' : ''}>${val}</option>`;
    });
  }
  
  // Legacy support for manual inputs that don't match exactly
  if (selectedValue && !html.includes(`value="${selectedValue}"`)) {
    html += `<option value="${selectedValue}" selected>${escapeHtml(selectedValue)} (手入力)</option>`;
  }
  return html;
}

// ---- Grade Options Generator ----
function getGradeOptionsHTML(selectedValue) {
  const grades = [
    'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F',
    'P', 'NP', 'IP', 'W', 'EW'
  ];
  let html = `<option value="">Grade</option>`;
  grades.forEach(g => {
    html += `<option value="${g}" ${selectedValue === g ? 'selected' : ''}>${g}</option>`;
  });
  return html;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Initialize Form ----
export function initRequirementForm() {
  populateDropdowns();
  setupPatternSwitcher();
  
  // Initialize requirement state based on default pattern
  initializeStateForPattern(currentGEPattern);

  renderRequirementChecklist();
  renderMajorPrepChecklist();
  
  // Add button for Major Prep
  document.getElementById('addMajorPrepBtn')?.addEventListener('click', () => {
    majorPrepState.push({code: '', term: ''});
    renderMajorPrepChecklist();
  });
}

function setupPatternSwitcher() {
  const radios = document.querySelectorAll('input[name="gePattern"]');
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        const newPattern = e.target.value;
        if (newPattern !== currentGEPattern) {
          // If state is not empty, ask for confirmation? 
          // For now, just switch and preserve what matches
          currentGEPattern = newPattern;
          updatePatternUI();
          renderRequirementChecklist();
          runAutoCheck();
        }
      }
    });
  });
}

function updatePatternUI() {
  const title = document.getElementById('requirementChecklistTitle');
  const desc = document.getElementById('requirementChecklistDesc');
  const label = currentGEPattern === 'calgetc' ? 'CalGETC (新基準)' : 'IGETC (旧基準)';
  
  if (title) title.textContent = `${label} 要件`;
}

function initializeStateForPattern(pattern) {
  const areas = pattern === 'calgetc' ? CALGETC_AREAS : IGETC_AREAS;
  areas.forEach(area => {
    if (!requirementState[area.id]) {
      requirementState[area.id] = Array.from({length: area.required}, () => ({code: '', term: '', lab: false}));
    } else {
      // Ensure enough rows for the required count
      while (requirementState[area.id].length < area.required) {
        requirementState[area.id].push({code: '', term: '', lab: false});
      }
    }
  });
}

// ---- Populate Dropdowns ----
function populateDropdowns() {
  const ucContainer = document.getElementById('reqUCMajorsList');
  if (ucContainer) {
    ucContainer.innerHTML = '';
    UC_CAMPUSES.forEach(uc => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '16px';
      row.style.flexWrap = 'wrap';
      
      const cbLabel = document.createElement('label');
      cbLabel.className = 'checkbox-item';
      cbLabel.style.width = '200px';
      cbLabel.innerHTML = `<input type="checkbox" data-school="${uc.id}"> <span>${uc.name}</span>`;
      
      const majorSelect = document.createElement('select');
      majorSelect.className = 'form-select req-major-select';
      majorSelect.style.flex = '1';
      majorSelect.style.minWidth = '200px';
      majorSelect.style.display = 'none'; // hide until checked
      majorSelect.innerHTML = '<option value="">専攻を選択してください</option>';
      
      const majorsList = UC_MAJORS_MAP[uc.id] || [];
      majorsList.forEach(m => {
        majorSelect.appendChild(new Option(m, m));
      });

      const majorInput = document.createElement('input');
      majorInput.type = 'text';
      majorInput.className = 'form-input req-major-input';
      majorInput.style.flex = '1';
      majorInput.style.display = 'none';
      majorInput.placeholder = '専攻名を入力';

      const rankSelect = document.createElement('select');
      rankSelect.className = 'form-select req-rank-select';
      rankSelect.style.width = '80px';
      rankSelect.style.display = 'none';
      rankSelect.innerHTML = '<option value="">順位</option>' + 
        '<option value="TAG">TAG</option>' +
        [1,2,3,4,5,6,7,8,9].map(n => `<option value="${n}">${n}位</option>`).join('');
      
      cbLabel.querySelector('input').addEventListener('change', (e) => {
        const checked = e.target.checked;
        majorSelect.style.display = checked ? 'block' : 'none';
        rankSelect.style.display = checked ? 'block' : 'none';
        if (!checked) {
          majorSelect.value = '';
          rankSelect.value = '';
          majorInput.style.display = 'none';
          majorInput.value = '';
        } else {
          majorInput.style.display = majorSelect.value === 'その他' ? 'block' : 'none';
        }
      });

      majorSelect.addEventListener('change', (e) => {
        majorInput.style.display = e.target.value === 'その他' ? 'block' : 'none';
        if (e.target.value !== 'その他') {
          majorInput.value = '';
        }
      });

      rankSelect.addEventListener('change', (e) => {
        if (e.target.value === 'TAG') {
          // Check if other TAGs exist
          const allRanks = Array.from(document.querySelectorAll('.req-rank-select'))
            .map(s => s.value);
          if (allRanks.filter(v => v === 'TAG').length > 1) {
            showToast('⚠️ TAG（編入保証制度）は原則1校のみ選択可能です', 'info');
          }
        }
      });
      
      row.appendChild(cbLabel);
      row.appendChild(rankSelect);
      row.appendChild(majorSelect);
      row.appendChild(majorInput);
      ucContainer.appendChild(row);
    });
  }
}

// ---- Render Requirement Checklist ----
function renderRequirementChecklist() {
  const container = document.getElementById('calgetcChecklist');
  container.innerHTML = '';

  const areas = currentGEPattern === 'calgetc' ? CALGETC_AREAS : IGETC_AREAS;

  areas.forEach(area => {
    const areaDiv = document.createElement('div');
    areaDiv.className = 'requirement-area';
    areaDiv.id = `area-${area.id}`;

    // Special handling for LOTE (Area 6 in IGETC)
    let loteHTML = '';
    if (area.id === 'area6' && currentGEPattern === 'igetc') {
      const isCleared = !!requirementState[`${area.id}_cleared`];
      loteHTML = `
        <div class="mt-md p-sm" style="background: var(--bg-body); border-radius: 4px; border: 1px dashed var(--border-default);">
          <label class="checkbox-item" style="font-size: 13px; font-weight: 600; color: var(--color-primary);">
            <input type="checkbox" id="clear-${area.id}" ${isCleared ? 'checked' : ''}>
            <span>日本の高校卒業等により外国語要件（LOTE）を免除・クリアしている</span>
          </label>
          <div class="text-muted" style="font-size: 11px; margin-top: 4px; padding-left: 24px;">
            ※日本で中等教育（中学・高校）を修了している場合、通常この要件は自動的に満たされます。
          </div>
        </div>
      `;
    }

    areaDiv.innerHTML = `
      <div class="requirement-area__header" style="align-items:flex-start;">
        <div style="flex:1;">
          <div class="requirement-area__title">${area.name}</div>
          <div class="text-muted" style="font-size:12px;margin-top:4px;">${area.description}</div>
          <div class="text-muted mt-sm" style="font-size:11px;">※ 代表的なクラス例: ${area.courses.join(', ')}</div>
          ${loteHTML}
        </div>
        <div style="text-align:right;">
          <span class="requirement-area__status requirement-area__status--pending" id="status-${area.id}">0 / ${area.required}</span><br>
          <button type="button" class="btn btn--secondary btn--sm mt-sm" id="add-${area.id}">＋ 追加</button>
        </div>
      </div>
      <div id="courses-${area.id}" style="margin-top:12px;"></div>
    `;

    container.appendChild(areaDiv);
    
    // Setup clear checkbox listener
    if (area.id === 'area6' && currentGEPattern === 'igetc') {
      const clearCb = areaDiv.querySelector(`#clear-${area.id}`);
      clearCb.addEventListener('change', (e) => {
        requirementState[`${area.id}_cleared`] = e.target.checked;
        updateAreaStatus(area);
        runAutoCheck();
      });
    }

    // Setup add button
    areaDiv.querySelector(`#add-${area.id}`).addEventListener('click', () => {
      if (!requirementState[area.id]) requirementState[area.id] = [];
      requirementState[area.id].push({code: '', term: '', lab: false});
      renderAreaInputs(area);
      updateAreaStatus(area);
      runAutoCheck();
    });

    renderAreaInputs(area);
    updateAreaStatus(area);
  });
}

function renderAreaInputs(area) {
  const container = document.getElementById(`courses-${area.id}`);
  container.innerHTML = '';
  
  const state = requirementState[area.id] || [];
  
  state.forEach((item, idx) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '12px';
    row.style.marginBottom = '8px';
    
    const labHTML = area.id === 'area5' || area.id === 'area5A' || area.id === 'area5B'
      ? `<label style="display:flex;align-items:center;gap:4px;font-size:12px;margin-right:8px;cursor:pointer;">
           <input type="checkbox" class="lab-checkbox" ${item.lab ? 'checked' : ''}> Lab
         </label>`
      : '';

    row.innerHTML = `
      <input type="text" class="form-input req-code-input" placeholder="クラスコード (例: ENG 110)" value="${item.code}" style="flex:2;">
      <select class="form-select req-term-select" style="flex:1;">
        ${getTermOptionsHTML(item.term)}
      </select>
      <select class="form-select req-grade-select" style="flex:0.8;">
        ${getGradeOptionsHTML(item.grade)}
      </select>
      ${labHTML}
      <button type="button" class="btn btn--ghost req-remove-btn" style="padding:0 8px;color:var(--color-error);">✕</button>
    `;
    
    const codeInput = row.querySelector('.req-code-input');
    const termSelect = row.querySelector('.req-term-select');
    const gradeSelect = row.querySelector('.req-grade-select');
    
    codeInput.addEventListener('input', (e) => {
      requirementState[area.id][idx].code = e.target.value;
      updateAreaStatus(area);
      runAutoCheck();
    });
    termSelect.addEventListener('change', (e) => {
      requirementState[area.id][idx].term = e.target.value;
      updateAreaStatus(area);
      runAutoCheck();
    });
    gradeSelect.addEventListener('change', (e) => {
      requirementState[area.id][idx].grade = e.target.value;
      updateAreaStatus(area);
      runAutoCheck();
    });
    
    if (area.id === 'area5' || area.id === 'area5A' || area.id === 'area5B') {
      const labCb = row.querySelector('.lab-checkbox');
      if (labCb) {
        labCb.addEventListener('change', (e) => {
          requirementState[area.id][idx].lab = e.target.checked;
        });
      }
    }
    
    row.querySelector('button').addEventListener('click', () => {
      requirementState[area.id].splice(idx, 1);
      renderAreaInputs(area);
      updateAreaStatus(area);
      runAutoCheck();
    });
    
    container.appendChild(row);
  });
}

// ---- Render Major Prep Checklist ----
function renderMajorPrepChecklist() {
  const container = document.getElementById('majorPrepList');
  container.innerHTML = '';

  if (majorPrepState.length === 0) {
    container.innerHTML = '<div class="text-muted" style="font-size:13px;font-style:italic;">クラスが追加されていません。</div>';
    return;
  }

  majorPrepState.forEach((item, idx) => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '12px';
    row.style.marginBottom = '8px';
    
    row.innerHTML = `
      <input type="text" class="form-input req-code-input" placeholder="クラスコード/名 (例: MATH 1A)" value="${item.code}" style="flex:2;">
      <select class="form-select req-term-select" style="flex:1;">
        ${getTermOptionsHTML(item.term)}
      </select>
      <select class="form-select req-grade-select" style="flex:0.8;">
        ${getGradeOptionsHTML(item.grade)}
      </select>
      <button type="button" class="btn btn--ghost req-remove-btn" style="padding:0 8px;color:var(--color-error);">✕</button>
    `;
    
    const codeInput = row.querySelector('.req-code-input');
    const termSelect = row.querySelector('.req-term-select');
    const gradeSelect = row.querySelector('.req-grade-select');
    
    codeInput.addEventListener('input', (e) => {
      majorPrepState[idx].code = e.target.value;
    });
    termSelect.addEventListener('change', (e) => {
      majorPrepState[idx].term = e.target.value;
    });
    gradeSelect.addEventListener('change', (e) => {
      majorPrepState[idx].grade = e.target.value;
    });
    
    row.querySelector('button').addEventListener('click', () => {
      majorPrepState.splice(idx, 1);
      renderMajorPrepChecklist();
    });
    
    container.appendChild(row);
  });
}

// ---- Update Area Status ----
function updateAreaStatus(area) {
  if (!requirementState[area.id]) return;
  
  const isLoteCleared = (area.id === 'area6' && currentGEPattern === 'igetc' && requirementState[`${area.id}_cleared`]);
  
  // Count only non-empty entries
  const filledCount = requirementState[area.id].filter(item => item.code.trim() !== '').length;
  const statusEl = document.getElementById(`status-${area.id}`);
  const areaEl = document.getElementById(`area-${area.id}`);

  if (!statusEl || !areaEl) return;

  // Special check for Area 5 Lab
  let isPass = isLoteCleared || filledCount >= area.required;
  let statusText = isLoteCleared ? 'Cleared' : `${filledCount} / ${area.required}`;
  
  if (area.id === 'area5' && filledCount >= area.required) {
    const hasLab = requirementState[area.id].some(item => item.lab && item.code.trim() !== '');
    if (!hasLab) {
      isPass = false;
      statusText += ' (Lab必須)';
    }
  }

  statusEl.textContent = statusText;

  if (isPass) {
    statusEl.className = 'requirement-area__status requirement-area__status--pass';
    areaEl.className = 'requirement-area requirement-area--pass';
  } else {
    statusEl.className = 'requirement-area__status requirement-area__status--fail';
    areaEl.className = 'requirement-area requirement-area--fail';
  }
}

// ---- Auto Check All Requirements ----
function runAutoCheck() {
  const resultDiv = document.getElementById('reqAutoResult');
  const supplementDiv = document.getElementById('reqSupplementSection');
  if (!resultDiv) return;

  const missingAreas = [];
  const areas = currentGEPattern === 'calgetc' ? CALGETC_AREAS : IGETC_AREAS;

  areas.forEach(area => {
    const isLoteCleared = (area.id === 'area6' && currentGEPattern === 'igetc' && requirementState[`${area.id}_cleared`]);
    const filledCount = (requirementState[area.id] || []).filter(item => item.code.trim() !== '').length;
    
    let isPass = isLoteCleared || filledCount >= area.required;
    
    if (area.id === 'area5' && filledCount >= area.required) {
      const hasLab = (requirementState[area.id] || []).some(item => item.lab && item.code.trim() !== '');
      if (!hasLab) isPass = false;
    }

    if (!isPass) {
      let label = area.name.split('—')[0].trim(); // 'Area 1A'
      if (area.id === 'area5' && filledCount >= area.required) {
        label += ' (Lab未選択)';
      }
      missingAreas.push(label);
    }
  });

  resultDiv.classList.remove('hidden');

  const patternLabel = currentGEPattern === 'calgetc' ? 'CalGETC' : 'IGETC';

  if (missingAreas.length === 0) {
    resultDiv.innerHTML = `
      <div class="alert alert--success mb-xl">
        <span class="alert__icon">✅</span>
        <div>
          <strong>要件クリア！</strong><br>
          すべての${patternLabel}エリアに必要科目数が入力されています。
        </div>
      </div>
    `;
    if (supplementDiv) supplementDiv.classList.add('hidden');
  } else {
    resultDiv.innerHTML = `
      <div class="alert alert--error mb-xl">
        <span class="alert__icon">⚠️</span>
        <div>
          <strong>不足している要件があります</strong><br>
          以下のエリアで入力されたクラス数が不足しています：<br>
          ${missingAreas.map(a => `• ${a}`).join('<br>')}
        </div>
      </div>
    `;
    if (supplementDiv) supplementDiv.classList.remove('hidden');
  }

  return missingAreas;
}

// ---- Load Existing Data ----
export function loadRequirementData(data) {
  if (!data) return;

  // Set GE Pattern
  if (data.gePattern) {
    currentGEPattern = data.gePattern;
    const radio = document.querySelector(`input[name="gePattern"][value="${currentGEPattern}"]`);
    if (radio) radio.checked = true;
    updatePatternUI();
  }

  if (data.targetUCMajors) {
    const ucRows = document.querySelectorAll('#reqUCMajorsList > div');
    ucRows.forEach(row => {
      const cb = row.querySelector('input[type="checkbox"]');
      if (!cb) return;
      const item = data.targetUCMajors.find(x => x.campus === cb.dataset.school);
      if (item) {
        cb.checked = true;
        const select = row.querySelector('.req-major-select');
        const input = row.querySelector('.req-major-input');
        const rankSelect = row.querySelector('.req-rank-select');
        
        select.style.display = 'block';
        if (rankSelect) {
          rankSelect.style.display = 'block';
          rankSelect.value = item.rank && item.rank !== 99 ? item.rank : '';
        }
        
        let optionExists = false;
        Array.from(select.options).forEach(opt => {
          if (opt.value === item.major) optionExists = true;
        });

        if (optionExists) {
          select.value = item.major;
          if (item.major === 'その他' && input) {
            input.style.display = 'block';
          }
        } else {
          select.value = 'その他';
          if (input) {
            input.style.display = 'block';
            input.value = item.major || '';
          }
        }
      }
    });
  }

  // Set LOTE clearance
  if (data.loteCleared) {
    requirementState['area6_cleared'] = true;
  }

  // Set Requirement list
  if (data.requirementList) {
    requirementState = { ...requirementState, ...JSON.parse(JSON.stringify(data.requirementList)) };
  } else if (data.calgetcList) {
    // Backwards compatibility
    requirementState = { ...requirementState, ...JSON.parse(JSON.stringify(data.calgetcList)) };
  }
  
  initializeStateForPattern(currentGEPattern);
  renderRequirementChecklist();

  // Set Major Prep list
  if (data.majorPrepList) {
    majorPrepState = JSON.parse(JSON.stringify(data.majorPrepList));
    renderMajorPrepChecklist();
  }

  // Set supplement
  const supplementInput = document.getElementById('reqSupplement');
  if (supplementInput && data.supplementComment) {
    supplementInput.value = data.supplementComment;
  }

  // Run auto check
  runAutoCheck();
}

// ---- Collect Form Data ----
function collectRequirementData() {
  const missingAreas = [];
  const areas = currentGEPattern === 'calgetc' ? CALGETC_AREAS : IGETC_AREAS;

  areas.forEach(area => {
    const isLoteCleared = (area.id === 'area6' && currentGEPattern === 'igetc' && requirementState[`${area.id}_cleared`]);
    const filledCount = (requirementState[area.id] || []).filter(item => item.code.trim() !== '').length;
    
    if (!isLoteCleared && filledCount < area.required) {
      missingAreas.push(area.name);
    }
  });

  // Filter out completely empty entries and inactive pattern areas
  const cleanRequirementState = {};
  const activeAreaIds = areas.map(a => a.id);
  
  activeAreaIds.forEach(id => {
    if (Array.isArray(requirementState[id])) {
      cleanRequirementState[id] = requirementState[id]
        .filter(i => i.code.trim() !== '' || i.term.trim() !== '')
        .map(i => ({ code: i.code, term: i.term, lab: i.lab || false, grade: i.grade || '' }));
    }
  });
  const cleanMajorPrep = majorPrepState.filter(i => i.code.trim() !== '' || i.term.trim() !== '');

  const targetUCMajors = [];
  const ucRows = document.querySelectorAll('#reqUCMajorsList > div');
  ucRows.forEach(row => {
    const cb = row.querySelector('input[type="checkbox"]');
    if (cb && cb.checked) {
      const select = row.querySelector('.req-major-select');
      let val = select ? select.value : '';
      if (val === 'その他') {
        const input = row.querySelector('.req-major-input');
        if (input && input.value.trim() !== '') {
          val = input.value.trim();
        }
      }
      const rankSelect = row.querySelector('.req-rank-select');
      const valRank = rankSelect ? rankSelect.value : '';
      
      targetUCMajors.push({
        campus: cb.dataset.school,
        major: val,
        rank: valRank === 'TAG' ? 'TAG' : (valRank ? parseInt(valRank) : 99)
      });
    }
  });

  // Sort by rank: 1st Choice first, then TAG, then numbers
  targetUCMajors.sort((a, b) => {
    if (a.rank === 1) return -1;
    if (b.rank === 1) return 1;
    if (a.rank === 'TAG') return -1;
    if (b.rank === 'TAG') return 1;
    return a.rank - b.rank;
  });

  const appData = getApplicationData();
  const finalCollege = appData?.profileData?.college || appData?.college || '';

  return {
    gePattern: currentGEPattern,
    loteCleared: !!requirementState['area6_cleared'],
    college: finalCollege,
    targetUCMajors: targetUCMajors,
    requirementList: cleanRequirementState,
    majorPrepList: cleanMajorPrep,
    autoCheckResult: missingAreas.length === 0 ? 'pass' : 'fail',
    missingAreas: missingAreas,
    supplementComment: document.getElementById('reqSupplement')?.value.trim() || '',
  };
}

// ---- Save as Draft ----
export async function saveRequirement() {
  const data = collectRequirementData();
  const ref = getApplicationRef();
  const appData = getApplicationData();
  const newStatus = appData.requirementStatus === 'submitted' ? 'submitted' : 'draft';

  try {
    await updateDoc(ref, {
      requirementData: data,
      requirementStatus: newStatus,
      updatedAt: serverTimestamp(),
    });
    setApplicationData({ requirementData: data, requirementStatus: newStatus });
  } catch (err) {
    console.error('Save requirement error:', err);
    showToast('保存に失敗しました', 'error');
  }
}

// ---- Submit ----
export async function submitRequirement() {
  const data = collectRequirementData();
  const ref = getApplicationRef();

  // Validation
  if (!data.college) {
    showToast('所属コミュニティカレッジを選択してください', 'error');
    return false;
  }
  
  if (!data.targetUCMajors || data.targetUCMajors.length === 0) {
    showToast('出願するキャンパスを1つ以上選択してください', 'error');
    return false;
  }
  
  for (const item of data.targetUCMajors) {
    if (!item.major) {
      const campusInfo = UC_CAMPUSES.find(uc => uc.id === item.campus);
      const name = campusInfo ? campusInfo.name : item.campus;
      showToast(`${name} の志望専攻を選択してください`, 'error');
      return false;
    }
  }

  try {
    const appData = getApplicationData();
    const updates = {
      requirementData: data,
      requirementStatus: 'submitted',
      updatedAt: serverTimestamp(),
      requirementLastSubmittedAt: serverTimestamp()
    };

    if (!appData.requirementSubmittedAt) {
      updates.requirementSubmittedAt = serverTimestamp();
    }

    await updateDoc(ref, updates);
    
    const localUpdates = { requirementData: data, requirementStatus: 'submitted', requirementLastSubmittedAt: new Date() };
    if (!appData.requirementSubmittedAt) {
      localUpdates.requirementSubmittedAt = new Date();
    }
    setApplicationData(localUpdates);
    return true;
  } catch (err) {
    console.error('Submit requirement error:', err);
    showToast('提出に失敗しました', 'error');
    return false;
  }
}
