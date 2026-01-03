import { getTodayString, getCurrentTimeString } from './utils.js';
import { MEM_LOCATIONS, MEM_CENTERS, updateLocationData, saveData, MEM_RECORDS, MEM_EXPENSE_ITEMS } from './data.js';

export function toggleUI() {
    const typeSelect = document.getElementById('type');
    const editModeIndicator = document.getElementById('edit-mode-indicator');
    const smsSection = document.getElementById('sms-parser-section');
    if(!typeSelect || !editModeIndicator) return;

    const type = typeSelect.value;
    const isEditMode = !editModeIndicator.classList.contains('hidden');

    // 1. 초기 숨김 처리
    const sections = ['transport-details', 'fuel-details', 'supply-details', 'expense-details', 'cost-info-fieldset', 'trip-actions', 'general-actions', 'edit-actions'];
    sections.forEach(id => { const el = document.getElementById(id); if(el) el.classList.add('hidden'); });
    
    const costWrapper = document.getElementById('cost-wrapper');
    const incomeWrapper = document.getElementById('income-wrapper');

    // 2. 입력 필드 노출
    if (type === '화물운송' || type === '대기') {
        document.getElementById('transport-details')?.classList.remove('hidden');
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        costWrapper?.classList.add('hidden');
        incomeWrapper?.classList.remove('hidden');
    } else {
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        incomeWrapper?.classList.add('hidden');
        costWrapper?.classList.remove('hidden');
        if (type === '주유소') document.getElementById('fuel-details')?.classList.remove('hidden');
        else if (type === '지출') document.getElementById('expense-details')?.classList.remove('hidden');
    }

    // 3. 버튼 노출 (수정 모드 우선순위)
    if (isEditMode) {
        document.getElementById('edit-actions')?.classList.remove('hidden'); 
        smsSection?.classList.add('hidden'); 
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

export function displayCenterList(filter='') {
    const container = document.getElementById('center-list-container');
    if(!container) return;
    container.innerHTML = "";
    const list = MEM_CENTERS.filter(c => c.toLowerCase().includes(filter.toLowerCase()));
    list.forEach(c => {
        const div = document.createElement('div');
        div.className='center-item';
        div.innerHTML=`<div class="info"><span class="center-name">${c}</span></div>`;
        container.appendChild(div);
    });
}

export function populateCenterDatalist() {
    const dl = document.getElementById('center-list');
    if(dl) dl.innerHTML = MEM_CENTERS.map(c => `<option value="${c}"></option>`).join('');
}

export function populateExpenseDatalist() {
    const dl = document.getElementById('expense-list');
    if(dl) dl.innerHTML = MEM_EXPENSE_ITEMS.map(item => `<option value="${item}"></option>`).join('');
}

export function updateAddressDisplay() {
    const fromVal = document.getElementById('from-center').value;
    const fromLoc = MEM_LOCATIONS[fromVal] || {};
    let html = '';
    if (fromLoc.address) html += `<div class="address-clickable" data-address="${fromLoc.address}">${fromLoc.address}</div>`;
    const displayEl = document.getElementById('address-display');
    if(displayEl) displayEl.innerHTML = html;
}

export function getFormDataWithoutTime() {
    return {
        type: document.getElementById('type').value,
        from: document.getElementById('from-center').value.trim(),
        to: document.getElementById('to-center').value.trim(),
        distance: parseFloat(document.getElementById('manual-distance').value) || 0,
        cost: Math.round((parseFloat(document.getElementById('cost').value) || 0) * 10000),
        income: Math.round((parseFloat(document.getElementById('income').value) || 0) * 10000)
    };
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