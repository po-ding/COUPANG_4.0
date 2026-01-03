import * as Utils from './utils.js';
import * as Data from './data.js';
import * as UI from './ui.js';
import * as Stats from './stats.js';
import { parseSmsText, registerParsedTrip } from './sms_parser.js';

function setupEventListeners() {
    const getEl = (id) => document.getElementById(id);

    // ✅ SMS 인식 버튼 및 전역 함수 연결 (?. 사용하여 에러 방지)
    getEl('btn-parse-sms')?.addEventListener('click', parseSmsText);
    window.registerParsedTrip = registerParsedTrip;
    window.updateAllDisplays = updateAllDisplays;

    // ✅ 설정 창 지역 검색 리스너 (누락되었던 기능)
    getEl('center-search-input')?.addEventListener('input', (e) => {
        UI.displayCenterList(e.target.value);
    });

    // 모바일 아코디언 토글
    const toggleSections = ['datetime', 'type'];
    toggleSections.forEach(section => {
        const legend = getEl(`legend-${section}`);
        const body = getEl(`body-${section}`);
        if(legend && body) {
            legend.addEventListener('click', () => {
                if(window.innerWidth <= 768) {
                    legend.classList.toggle('active');
                    body.classList.toggle('active');
                }
            });
        }
    });

    // 주소 클릭 시 복사
    getEl('address-display')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('address-clickable')) {
            const addr = e.target.dataset.address;
            if (addr) Utils.copyTextToClipboard(addr, '주소 복사됨');
        }
    });

    // 테이블 클릭 (수정 모드 진입 및 주소 복사)
    document.querySelector('#today-records-table tbody')?.addEventListener('click', (e) => {
        const addrTarget = e.target.closest('.location-clickable');
        if (addrTarget) {
            const center = addrTarget.getAttribute('data-center');
            const loc = Data.MEM_LOCATIONS[center];
            if(loc && loc.address) Utils.copyTextToClipboard(loc.address, '주소 복사됨');
            else Utils.copyTextToClipboard(center, '이름 복사됨');
            return;
        }
        const rowTarget = e.target.closest('tr');
        if (rowTarget && rowTarget.dataset.id) {
            UI.editRecord(parseInt(rowTarget.dataset.id));
        }
    });

    // 상/하차지 입력 시 자동 로드
    const handleLocationInput = () => {
        const fromIn = getEl('from-center');
        const toIn = getEl('to-center');
        const typeIn = getEl('type');
        if(!fromIn || !toIn) return;
        const from = fromIn.value.trim();
        const to = toIn.value.trim();
        const type = typeIn.value;
        if((type === '화물운송' || type === '대기') && from && to) {
            const key = `${from}-${to}`;
            const incomeEl = getEl('income');
            if(incomeEl && Data.MEM_FARES[key]) incomeEl.value = (Data.MEM_FARES[key]/10000).toFixed(2);
            const distEl = getEl('manual-distance');
            if(distEl && Data.MEM_DISTANCES[key]) distEl.value = Data.MEM_DISTANCES[key];
        }
        UI.updateAddressDisplay();
    };
    getEl('from-center')?.addEventListener('input', handleLocationInput);
    getEl('to-center')?.addEventListener('input', handleLocationInput);

    // 기록 관리 버튼들 (?. 사용하여 존재할 때만 연결)
    getEl('btn-register-trip')?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        Data.addRecord({ id: Date.now(), date: getEl('date').value, time: getEl('time').value, ...formData });
        Utils.showToast('등록되었습니다.');
        UI.resetForm();
        updateAllDisplays();
    });
    getEl('btn-start-trip')?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), ...formData });
        Utils.showToast('운행 시작됨');
        UI.resetForm();
        updateAllDisplays();
    });
    getEl('btn-end-trip')?.addEventListener('click', () => {
        Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), type: '운행종료', distance: 0, cost: 0, income: 0 });
        Utils.showToast('운행 종료됨');
        UI.resetForm();
        updateAllDisplays();
    });
    getEl('btn-save-general')?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        Data.addRecord({ id: Date.now(), date: getEl('date').value, time: getEl('time').value, ...formData });
        Utils.showToast('저장되었습니다.');
        UI.resetForm();
        updateAllDisplays();
    });

    // ✅ 수정 모드 버튼 그룹
    getEl('btn-update-record')?.addEventListener('click', () => {
        const id = parseInt(getEl('edit-id').value);
        const index = Data.MEM_RECORDS.findIndex(r => r.id === id);
        if (index > -1) {
            const original = Data.MEM_RECORDS[index];
            const formData = UI.getFormDataWithoutTime();
            Data.MEM_RECORDS[index] = { ...original, ...formData, date: original.date, time: original.time };
            Data.saveData();
            Utils.showToast('수정 완료');
            UI.resetForm();
            updateAllDisplays();
        }
    });
    getEl('btn-delete-record')?.addEventListener('click', () => {
        if(confirm('정말 삭제하시겠습니까?')) {
            const id = parseInt(getEl('edit-id').value);
            Data.removeRecord(id);
            UI.resetForm();
            updateAllDisplays();
        }
    });
    getEl('btn-cancel-edit')?.addEventListener('click', UI.resetForm);

    // 날짜 이동
    getEl('refresh-btn')?.addEventListener('click', () => { UI.resetForm(); location.reload(); });
    getEl('prev-day-btn')?.addEventListener('click', () => moveDate(-1));
    getEl('next-day-btn')?.addEventListener('click', () => moveDate(1));

    // 화면 전환
    getEl('go-to-settings-btn')?.addEventListener('click', () => { 
        getEl('main-page')?.classList.add("hidden"); 
        getEl('settings-page')?.classList.remove("hidden"); 
        getEl('go-to-settings-btn')?.classList.add("hidden"); 
        getEl('back-to-main-btn')?.classList.remove("hidden"); 
        Stats.displayCumulativeData(); 
        Stats.displayCurrentMonthData(); 
    });
    getEl('back-to-main-btn')?.addEventListener('click', () => { 
        if(window.location.pathname.includes('settings.html')) {
            window.location.href = 'index.html';
        } else {
            getEl('main-page')?.classList.remove("hidden"); 
            getEl('settings-page')?.classList.add("hidden"); 
            getEl('go-to-settings-btn')?.classList.remove("hidden"); 
            getEl('back-to-main-btn')?.classList.add("hidden"); 
            updateAllDisplays(); 
        }
    });

    // 데이터 관리 버튼
    getEl('export-json-btn')?.addEventListener('click', () => { 
        const data = { records: Data.MEM_RECORDS, centers: Data.MEM_CENTERS, locations: Data.MEM_LOCATIONS }; 
        const b = new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); 
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download=`backup_${Utils.getTodayString()}.json`; 
        a.click(); 
    });
}

function updateAllDisplays() {
    const picker = document.getElementById('today-date-picker');
    if(!picker) return;
    const targetDate = picker.value;
    Stats.displayTodayRecords(targetDate);
    Stats.displayDailyRecords();
    Stats.displayWeeklyRecords();
    Stats.displayMonthlyRecords();
}

function initialSetup() {
    Data.loadAllData();
    UI.populateCenterDatalist();
    UI.populateExpenseDatalist();
    
    const todayStr = Utils.getTodayString();
    const nowTime = Utils.getCurrentTimeString();
    if(document.getElementById('date')) document.getElementById('date').value = todayStr;
    if(document.getElementById('time')) document.getElementById('time').value = nowTime;
    if(document.getElementById('today-date-picker')) document.getElementById('today-date-picker').value = todayStr;

    setupEventListeners();
    updateAllDisplays();
    UI.resetForm();
}

function moveDate(offset) {
    const picker = document.getElementById('today-date-picker');
    if (!picker || !picker.value) return;
    const parts = picker.value.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    dateObj.setDate(dateObj.getDate() + offset);
    picker.value = dateObj.toISOString().slice(0, 10);
    updateAllDisplays();
}

document.addEventListener("DOMContentLoaded", initialSetup);