import { getTodayString, getCurrentTimeString } from './utils.js';
import { MEM_LOCATIONS, MEM_CENTERS, updateLocationData, saveData, MEM_RECORDS, MEM_EXPENSE_ITEMS } from './data.js';

export function toggleUI() {
    const typeSelect = document.getElementById('type');
    const editModeIndicator = document.getElementById('edit-mode-indicator');
    if(!typeSelect || !editModeIndicator) return;

    const type = typeSelect.value;
    const isEditMode = !editModeIndicator.classList.contains('hidden');

    // 1. 모든 섹션과 버튼 그룹을 먼저 숨김
    const sections = [
        'transport-details', 'fuel-details', 'supply-details', 
        'expense-details', 'cost-info-fieldset', 
        'trip-actions', 'general-actions', 'edit-actions'
    ];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    
    const costWrapper = document.getElementById('cost-wrapper');
    const incomeWrapper = document.getElementById('income-wrapper');

    // 2. 기록 종류(type)에 따른 입력 필드 노출
    if (type === '화물운송' || type === '대기') {
        document.getElementById('transport-details')?.classList.remove('hidden');
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        costWrapper?.classList.add('hidden');
        incomeWrapper?.classList.remove('hidden');
    } else if (type === '수입') {
        document.getElementById('expense-details')?.classList.remove('hidden');
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        incomeWrapper?.classList.remove('hidden');
        costWrapper?.classList.add('hidden');
    } else {
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        incomeWrapper?.classList.add('hidden');
        costWrapper?.classList.remove('hidden');
        
        if (type === '주유소') document.getElementById('fuel-details')?.classList.remove('hidden');
        else if (type === '소모품') document.getElementById('supply-details')?.classList.remove('hidden');
        else if (type === '지출') document.getElementById('expense-details')?.classList.remove('hidden');
    }

    // 3. 버튼 그룹 노출 (수정 모드인지 일반 모드인지에 따라 분기)
    if (isEditMode) {
        // 수정 모드일 때는 무조건 edit-actions만 보여줌
        const editActions = document.getElementById('edit-actions');
        if(editActions) {
            editActions.classList.remove('hidden');
            // 주유/지출 등은 시작/종료 버튼이 필요 없으므로 숨김 처리
            const editStart = document.getElementById('btn-edit-start-trip');
            const editEnd = document.getElementById('btn-edit-end-trip');
            if (['화물운송', '대기'].includes(type)) {
                editStart?.classList.remove('hidden');
                editEnd?.classList.remove('hidden');
            } else {
                editStart?.classList.add('hidden');
                editEnd?.classList.add('hidden');
            }
        }
    } else {
        // 일반 모드일 때
        if (['화물운송', '대기'].includes(type)) {
            document.getElementById('trip-actions')?.classList.remove('hidden');
        } else {
            document.getElementById('general-actions')?.classList.remove('hidden');
        }
    }
}

// editRecord 함수는 그대로 유지하되 toggleUI 호출 확인
export function editRecord(id) {
    const r = MEM_RECORDS.find(x => x.id === id);
    if(!r) return;

    // 데이터 채우기
    document.getElementById('date').value = r.date; 
    document.getElementById('time').value = r.time; 
    document.getElementById('type').value = r.type;
    document.getElementById('from-center').value = r.from || ''; 
    document.getElementById('to-center').value = r.to || '';
    document.getElementById('manual-distance').value = r.distance || ''; 
    document.getElementById('income').value = r.income ? (r.income/10000) : ''; 
    document.getElementById('cost').value = r.cost ? (r.cost/10000) : '';
    document.getElementById('edit-id').value = id; 

    // 수정 모드 활성화
    const indicator = document.getElementById('edit-mode-indicator');
    if(indicator) indicator.classList.remove('hidden');
    
    document.getElementById('date').disabled = true; 
    document.getElementById('time').disabled = true;
    
    toggleUI(); 
    window.scrollTo(0, 0);
}

// (기타 populateCenterDatalist, displayCenterList 등 원본 코드 생략 없이 유지)
export function populateCenterDatalist() {
    const dl = document.getElementById('center-list');
    if(dl) dl.innerHTML = MEM_CENTERS.map(c => `<option value="${c}"></option>`).join('');
}
export function populateExpenseDatalist() {
    const dl = document.getElementById('expense-list');
    if(dl) dl.innerHTML = MEM_EXPENSE_ITEMS.map(item => `<option value="${item}"></option>`).join('');
}
export function updateAddressDisplay() {
    const fromValue = document.getElementById('from-center').value;
    const toValue = document.getElementById('to-center').value;
    const fromLoc = MEM_LOCATIONS[fromValue] || {};
    const toLoc = MEM_LOCATIONS[toValue] || {};
    let html = '';
    if (fromLoc.address) html += `<div class="address-clickable" data-address="${fromLoc.address}">[상] ${fromLoc.address}</div>`;
    if (toLoc.address) html += `<div class="address-clickable" data-address="${toLoc.address}">[하] ${toLoc.address}</div>`;
    const displayEl = document.getElementById('address-display');
    if(displayEl) displayEl.innerHTML = html;
}
export function resetForm() {
    document.getElementById('record-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('edit-mode-indicator').classList.add('hidden');
    document.getElementById('date').value = getTodayString();
    document.getElementById('time').value = getCurrentTimeString();
    document.getElementById('date').disabled = false;
    document.getElementById('time').disabled = false;
    toggleUI();
}
export function getFormDataWithoutTime() {
    return {
        type: document.getElementById('type').value,
        from: document.getElementById('from-center').value.trim(),
        to: document.getElementById('to-center').value.trim(),
        distance: parseFloat(document.getElementById('manual-distance').value) || 0,
        cost: Math.round((parseFloat(document.getElementById('cost').value) || 0) * 10000),
        income: Math.round((parseFloat(document.getElementById('income').value) || 0) * 10000),
        liters: parseFloat(document.getElementById('fuel-liters')?.value) || 0,
        unitPrice: parseInt(document.getElementById('fuel-unit-price')?.value) || 0,
        brand: document.getElementById('fuel-brand')?.value || '',
        supplyItem: document.getElementById('supply-item')?.value || '',
        mileage: parseInt(document.getElementById('supply-mileage')?.value) || 0,
        expenseItem: document.getElementById('expense-item')?.value || ''
    };
}