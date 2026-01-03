import { getTodayString, getCurrentTimeString } from './utils.js';
import { MEM_LOCATIONS, MEM_CENTERS, updateLocationData, saveData, MEM_RECORDS, MEM_EXPENSE_ITEMS } from './data.js';

export function toggleUI() {
    const typeSelect = document.getElementById('type');
    const editModeIndicator = document.getElementById('edit-mode-indicator');
    const smsSection = document.getElementById('sms-parser-section');
    if(!typeSelect || !editModeIndicator) return;

    const type = typeSelect.value;
    const isEditMode = !editModeIndicator.classList.contains('hidden');

    // 1. 모든 하위 섹션 및 버튼 그룹 초기 숨김
    const sections = [
        'transport-details', 'fuel-details', 'supply-details', 'expense-details', 
        'cost-info-fieldset', 'trip-actions', 'general-actions', 'edit-actions'
    ];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    
    const costWrapper = document.getElementById('cost-wrapper');
    const incomeWrapper = document.getElementById('income-wrapper');

    // 2. 기록 종류(type)에 따른 입력 필드 표시
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

    // 3. 버튼 그룹 노출 결정 (수정 모드 vs 일반 모드)
    if (isEditMode) {
        // [핵심] 수정 모드일 때
        document.getElementById('edit-actions')?.classList.remove('hidden');
        smsSection?.classList.add('hidden'); // ✅ 수정 모드에서 문자 입력창 숨김

        const btnEditStart = document.getElementById('btn-edit-start-trip');
        const btnEditEnd = document.getElementById('btn-edit-end-trip');
        if (['화물운송', '대기'].includes(type)) {
            btnEditStart?.classList.remove('hidden');
            btnEditEnd?.classList.remove('hidden');
        } else {
            btnEditStart?.classList.add('hidden');
            btnEditEnd?.classList.add('hidden');
        }
    } else {
        // 일반 모드일 때
        smsSection?.classList.remove('hidden'); // ✅ 일반 모드에서 문자 입력창 표시
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

    // 데이터 폼에 채우기
    document.getElementById('date').value = r.date; 
    document.getElementById('time').value = r.time; 
    document.getElementById('type').value = r.type;
    document.getElementById('from-center').value = r.from || ''; 
    document.getElementById('to-center').value = r.to || '';
    document.getElementById('manual-distance').value = r.distance || ''; 
    document.getElementById('income').value = r.income ? (r.income/10000) : ''; 
    document.getElementById('cost').value = r.cost ? (r.cost/10000) : '';
    document.getElementById('fuel-brand').value = r.brand || 'S-OIL'; 
    document.getElementById('fuel-liters').value = r.liters || ''; 
    document.getElementById('fuel-unit-price').value = r.unitPrice || '';
    document.getElementById('expense-item').value = r.expenseItem || ''; 
    document.getElementById('supply-item').value = r.supplyItem || ''; 
    document.getElementById('supply-mileage').value = r.mileage || '';
    document.getElementById('edit-id').value = id; 

    // 수정 모드 활성화 (클래스 제거)
    document.getElementById('edit-mode-indicator')?.classList.remove('hidden');
    document.getElementById('date').disabled = true; 
    document.getElementById('time').disabled = true;
    
    toggleUI(); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 나머지 함수들은 원본 그대로 유지합니다.
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
    const toVal = document.getElementById('to-center').value;
    const fromLoc = MEM_LOCATIONS[fromVal] || {};
    const toLoc = MEM_LOCATIONS[toVal] || {};
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
        liters: parseFloat(document.getElementById('fuel-liters').value) || 0,
        unitPrice: parseInt(document.getElementById('fuel-unit-price').value) || 0,
        brand: document.getElementById('fuel-brand').value,
        supplyItem: document.getElementById('supply-item').value,
        mileage: parseInt(document.getElementById('supply-mileage').value) || 0,
        expenseItem: document.getElementById('expense-item').value
    };
}
export function displayCenterList(filter='') {
    const container = document.getElementById('center-list-container');
    if(!container) return;
    container.innerHTML = "";
    const list = MEM_CENTERS.filter(c => c.toLowerCase().includes(filter.toLowerCase()));
    list.forEach(c => {
        const l = MEM_LOCATIONS[c]||{};
        const div = document.createElement('div');
        div.className='center-item';
        div.innerHTML=`<div class="info"><span class="center-name">${c}</span><div class="action-buttons"><button class="edit-btn">수정</button><button class="delete-btn">삭제</button></div></div>${l.address?`<span class="note">주소: ${l.address}</span>`:''}`;
        div.querySelector('.edit-btn').onclick = () => handleCenterEdit(div,c);
        div.querySelector('.delete-btn').onclick = () => {
            if(!confirm('삭제?')) return;
            const idx = MEM_CENTERS.indexOf(c);
            if(idx>-1) MEM_CENTERS.splice(idx,1);
            delete MEM_LOCATIONS[c];
            saveData();
            displayCenterList(document.getElementById('center-search-input').value);
        };
        container.appendChild(div);
    });
}
function handleCenterEdit(div, c) {
    const l = MEM_LOCATIONS[c]||{};
    div.innerHTML = `<div class="edit-form"><input class="edit-input" value="${c}"><input class="edit-address-input" value="${l.address||''}"><div class="action-buttons"><button class="setting-save-btn">저장</button><button class="cancel-edit-btn">취소</button></div></div>`;
    div.querySelector('.setting-save-btn').onclick = () => {
        const nn = div.querySelector('.edit-input').value.trim();
        const na = div.querySelector('.edit-address-input').value.trim();
        if(!nn) return;
        if(nn!==c) {
            const idx = MEM_CENTERS.indexOf(c);
            if(idx>-1) MEM_CENTERS.splice(idx,1);
            if(!MEM_CENTERS.includes(nn)) MEM_CENTERS.push(nn);
            delete MEM_LOCATIONS[c];
            saveData();
        }
        updateLocationData(nn, na);
        displayCenterList(document.getElementById('center-search-input').value);
    };
    div.querySelector('.cancel-edit-btn').onclick = () => displayCenterList(document.getElementById('center-search-input').value);
}