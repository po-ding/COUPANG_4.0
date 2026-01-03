import { getTodayString, getCurrentTimeString } from './utils.js';
import { MEM_LOCATIONS, MEM_CENTERS, updateLocationData, saveData, MEM_RECORDS, MEM_EXPENSE_ITEMS } from './data.js';

export function toggleUI() {
    const typeSelect = document.getElementById('type');
    const editModeIndicator = document.getElementById('edit-mode-indicator');
    const smsSection = document.getElementById('sms-parser-section');
    if(!typeSelect || !editModeIndicator) return;

    const type = typeSelect.value;
    const isEditMode = !editModeIndicator.classList.contains('hidden');

    // 모든 섹션 숨김
    ['transport-details', 'fuel-details', 'supply-details', 'expense-details', 'cost-info-fieldset', 'trip-actions', 'general-actions', 'edit-actions'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    // 1. 입력 필드 노출
    if (type === '화물운송' || type === '대기') {
        document.getElementById('transport-details')?.classList.remove('hidden');
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
    } else {
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        if (type === '주유소') document.getElementById('fuel-details')?.classList.remove('hidden');
        else if (type === '지출') document.getElementById('expense-details')?.classList.remove('hidden');
    }

    // 2. [수정] 버튼 그룹 노출 (수정 모드일 때 최우선 노출)
    if (isEditMode) {
        document.getElementById('edit-actions')?.classList.remove('hidden'); // 수정/삭제/취소 버튼 강제 노출
        smsSection?.classList.add('hidden'); // 수정 시에는 문자창 숨김
    } else {
        smsSection?.classList.remove('hidden');
        if (['화물운송', '대기'].includes(type)) {
            document.getElementById('trip-actions')?.classList.remove('hidden');
        } else {
            document.getElementById('general-actions')?.classList.remove('hidden');
        }
    }
}

export function editRecord(id) {
    const r = MEM_RECORDS.find(x => x.id === id);
    if(!r) return;

    document.getElementById('date').value = r.date; 
    document.getElementById('time').value = r.time; 
    document.getElementById('type').value = r.type;
    document.getElementById('from-center').value = r.from || ''; 
    document.getElementById('to-center').value = r.to || '';
    document.getElementById('manual-distance').value = r.distance || ''; 
    document.getElementById('income').value = r.income ? (r.income/10000) : ''; 
    document.getElementById('cost').value = r.cost ? (r.cost/10000) : '';
    document.getElementById('edit-id').value = id; 
    
    document.getElementById('edit-mode-indicator')?.classList.remove('hidden');
    document.getElementById('date').disabled = true; 
    document.getElementById('time').disabled = true;
    
    toggleUI(); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 나머지 함수들(populateCenterDatalist, displayCenterList 등) 원본 유지...
export function populateCenterDatalist() {
    const dl = document.getElementById('center-list');
    if(dl) dl.innerHTML = MEM_CENTERS.map(c => `<option value="${c}"></option>`).join('');
}
export function populateExpenseDatalist() {
    const dl = document.getElementById('expense-list');
    if(dl) dl.innerHTML = MEM_EXPENSE_ITEMS.map(item => `<option value="${item}"></option>`).join('');
}
export function resetForm() {
    document.getElementById('record-form')?.reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('edit-mode-indicator')?.classList.add('hidden');
    document.getElementById('date').value = getTodayString();
    document.getElementById('time').value = getCurrentTimeString();
    document.getElementById('date').disabled = false;
    document.getElementById('time').disabled = false;
    toggleUI();
}
export function displayCenterList(filter='') {
    const container = document.getElementById('center-list-container');
    if(!container) return;
    container.innerHTML = "";
    const list = MEM_CENTERS.filter(c => c.toLowerCase().includes(filter.toLowerCase()));
    list.forEach(c => {
        const div = document.createElement('div');
        div.className='center-item';
        div.innerHTML=`<div class="info"><span class="center-name">${c}</span><div class="action-buttons"><button class="edit-btn">수정</button></div></div>`;
        container.appendChild(div);
    });
}