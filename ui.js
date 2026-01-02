import { getTodayString, getCurrentTimeString } from './utils.js';
import { MEM_LOCATIONS, MEM_CENTERS, updateLocationData, saveData, MEM_RECORDS, MEM_EXPENSE_ITEMS } from './data.js';

// 화면 제어 및 폼 관련 함수들

export function toggleUI() {
    const typeSelect = document.getElementById('type');
    const editModeIndicator = document.getElementById('edit-mode-indicator');
    if(!typeSelect || !editModeIndicator) return;

    const type = typeSelect.value;
    const isEditMode = !editModeIndicator.classList.contains('hidden');

    // 모든 섹션 숨기기
    ['transport-details', 'fuel-details', 'supply-details', 'expense-details', 'cost-info-fieldset', 'trip-actions', 'general-actions', 'edit-actions'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    
    const costWrapper = document.getElementById('cost-wrapper');
    const incomeWrapper = document.getElementById('income-wrapper');
    const btnTripCancel = document.getElementById('btn-trip-cancel');

    if (type === '화물운송' || type === '대기') {
        document.getElementById('transport-details')?.classList.remove('hidden');
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        if(costWrapper) costWrapper.classList.add('hidden');
        if(incomeWrapper) incomeWrapper.classList.remove('hidden');
        if (!isEditMode) {
            document.getElementById('trip-actions')?.classList.remove('hidden');
            if(type === '화물운송' && btnTripCancel) btnTripCancel.classList.remove('hidden');
        }
    } else if (type === '수입') {
        document.getElementById('expense-details')?.classList.remove('hidden'); 
        const legend = document.getElementById('expense-legend');
        if(legend) legend.textContent = "수입 내역";
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        if(incomeWrapper) incomeWrapper.classList.remove('hidden');
        if(costWrapper) costWrapper.classList.add('hidden');
        if (!isEditMode) document.getElementById('general-actions')?.classList.remove('hidden');
    } else {
        document.getElementById('cost-info-fieldset')?.classList.remove('hidden');
        if(incomeWrapper) incomeWrapper.classList.add('hidden');
        if(costWrapper) costWrapper.classList.remove('hidden');
        
        if (type === '주유소') {
            document.getElementById('fuel-details')?.classList.remove('hidden');
            if (!isEditMode) document.getElementById('general-actions')?.classList.remove('hidden');
        } else if (type === '소모품') {
            document.getElementById('supply-details')?.classList.remove('hidden');
            if (!isEditMode) document.getElementById('general-actions')?.classList.remove('hidden');
        } else if (type === '지출') {
            document.getElementById('expense-details')?.classList.remove('hidden');
            const legend = document.getElementById('expense-legend');
            if(legend) legend.textContent = "지출 내역";
            if (!isEditMode) document.getElementById('general-actions')?.classList.remove('hidden');
        }
    }

    if (isEditMode) {
        document.getElementById('edit-actions')?.classList.remove('hidden');
        const btnEditEnd = document.getElementById('btn-edit-end-trip');
        const btnEditStart = document.getElementById('btn-edit-start-trip');
        
        if (type === '주유소' || type === '소모품' || type === '지출' || type === '수입') {
            if(btnEditEnd) btnEditEnd.classList.add('hidden');
            if(btnEditStart) btnEditStart.classList.add('hidden');
        } else {
            if(btnEditEnd) btnEditEnd.classList.remove('hidden');
            if(btnEditStart) btnEditStart.classList.remove('hidden');
        }
    }
}

export function updateAddressDisplay() {
    const fromValue = document.getElementById('from-center').value;
    const toValue = document.getElementById('to-center').value;
    const fromLoc = MEM_LOCATIONS[fromValue] || {};
    const toLoc = MEM_LOCATIONS[toValue] || {};
    
    let html = '';
    if (fromLoc.address) html += `<div class="address-clickable" data-address="${fromLoc.address}">[상] ${fromLoc.address}</div>`;
    if (fromLoc.memo) html += `<div class="memo-display">[상] ${fromLoc.memo}</div>`;
    if (toLoc.address) html += `<div class="address-clickable" data-address="${toLoc.address}">[하] ${toLoc.address}</div>`;
    if (toLoc.memo) html += `<div class="memo-display">[하] ${toLoc.memo}</div>`;
    
    const displayEl = document.getElementById('address-display');
    if(displayEl) displayEl.innerHTML = html;
}

export function populateCenterDatalist() {
    const dl = document.getElementById('center-list');
    if(dl) dl.innerHTML = MEM_CENTERS.map(c => `<option value="${c}"></option>`).join('');
}

export function populateExpenseDatalist() {
    const dl = document.getElementById('expense-list');
    if(dl) dl.innerHTML = MEM_EXPENSE_ITEMS.map(item => `<option value="${item}"></option>`).join('');
}

export function addCenter(newCenter, address = '', memo = '') {
    const trimmed = newCenter?.trim();
    if (!trimmed) return;
    updateLocationData(trimmed, address, memo);
    populateCenterDatalist();
}

export function getFormDataWithoutTime() {
    const fromCenter = document.getElementById('from-center');
    const toCenter = document.getElementById('to-center');
    const fromValue = fromCenter ? fromCenter.value.trim() : '';
    const toValue = toCenter ? toCenter.value.trim() : '';
    
    if(fromValue) addCenter(fromValue);
    if(toValue) addCenter(toValue);

    return {
        type: document.getElementById('type').value,
        from: fromValue,
        to: toValue,
        distance: parseFloat(document.getElementById('manual-distance').value) || 0,
        cost: Math.round((parseFloat(document.getElementById('cost').value) || 0) * 10000),
        income: Math.round((parseFloat(document.getElementById('income').value) || 0) * 10000),
        liters: parseFloat(document.getElementById('fuel-liters').value) || 0,
        unitPrice: parseInt(document.getElementById('fuel-unit-price').value) || 0,
        brand: document.getElementById('fuel-brand').value || '',
        supplyItem: document.getElementById('supply-item').value || '',
        mileage: parseInt(document.getElementById('supply-mileage').value) || 0,
        expenseItem: document.getElementById('expense-item').value || ''
    };
}

export function resetForm() {
    document.getElementById('record-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('edit-mode-indicator').classList.add('hidden');
    document.getElementById('date').value = getTodayString();
    document.getElementById('time').value = getCurrentTimeString();
    document.getElementById('date').disabled = false;
    document.getElementById('time').disabled = false;
    document.getElementById('address-display').innerHTML = '';
    toggleUI();
}

// export를 위해 window 객체에 할당하지 않고 순수 함수로 내보냅니다. 
// main.js에서 이를 window.editRecord = editRecord 로 연결할 수 있습니다.
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
    document.getElementById('fuel-brand').value = r.brand || ''; 
    document.getElementById('fuel-liters').value = r.liters || ''; 
    document.getElementById('fuel-unit-price').value = r.unitPrice || '';
    document.getElementById('expense-item').value = r.expenseItem || ''; 
    document.getElementById('supply-item').value = r.supplyItem || ''; 
    document.getElementById('supply-mileage').value = r.mileage || '';
    document.getElementById('edit-id').value = id; 
    
    document.getElementById('edit-mode-indicator').classList.remove('hidden');
    document.getElementById('date').disabled = true; 
    document.getElementById('time').disabled = true;
    
    toggleUI(); 
    window.scrollTo(0,0);
}

export function displayCenterList(filter='') {
    const container = document.getElementById('center-list-container');
    if(!container) return;
    container.innerHTML = "";
    const list = MEM_CENTERS.filter(c => c.includes(filter));
    if(list.length===0) { 
        container.innerHTML='<p class="note">결과 없음</p>'; 
        return; 
    } 
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
    div.innerHTML = `<div class="edit-form"><input class="edit-input" value="${c}"><input class="edit-address-input" value="${l.address||''}"><input class="edit-memo-input" value="${l.memo||''}"><div class="action-buttons"><button class="setting-save-btn">저장</button><button class="cancel-edit-btn">취소</button></div></div>`;
    
    div.querySelector('.setting-save-btn').onclick = () => {
        const nn = div.querySelector('.edit-input').value.trim();
        const na = div.querySelector('.edit-address-input').value.trim();
        const nm = div.querySelector('.edit-memo-input').value.trim();
        if(!nn) return;
        if(nn!==c) {
            const idx = MEM_CENTERS.indexOf(c);
            if(idx>-1) MEM_CENTERS.splice(idx,1);
            if(!MEM_CENTERS.includes(nn)) MEM_CENTERS.push(nn);
            delete MEM_LOCATIONS[c];
            MEM_RECORDS.forEach(r => { if(r.from===c) r.from=nn; if(r.to===c) r.to=nn; });
            MEM_CENTERS.sort();
            saveData();
        }
        updateLocationData(nn, na, nm);
        displayCenterList(document.getElementById('center-search-input').value);
    };
    div.querySelector('.cancel-edit-btn').onclick = () => displayCenterList(document.getElementById('center-search-input').value);
}