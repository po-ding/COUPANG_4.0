import * as Utils from './utils.js';
import * as Data from './data.js';
import * as UI from './ui.js';
import * as Stats from './stats.js';
import { parseSmsText, registerParsedTrip } from './sms_parser.js';

function setupEventListeners() {
    const getEl = (id) => document.getElementById(id);

    // SMS 및 전역 등록
    getEl('btn-parse-sms')?.addEventListener('click', parseSmsText);
    window.registerParsedTrip = registerParsedTrip;
    window.updateAllDisplays = updateAllDisplays;

    // 모바일 토글
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

    // 주소 복사
    getEl('address-display')?.addEventListener('click', (e) => {
        if (e.target.classList.contains('address-clickable')) {
            const addr = e.target.dataset.address;
            if (addr) Utils.copyTextToClipboard(addr, '주소 복사됨');
        }
    });

    // 테이블 클릭 (수정모드)
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

    // 자동 로드
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
            if(incomeEl) {
                if(Data.MEM_FARES[key]) incomeEl.value = (Data.MEM_FARES[key]/10000).toFixed(2);
                else incomeEl.value = ''; 
            }
            const distEl = getEl('manual-distance');
            if(distEl) {
                if(Data.MEM_DISTANCES[key]) distEl.value = Data.MEM_DISTANCES[key];
                else distEl.value = ''; 
            }
            const costEl = getEl('cost');
            if(costEl) {
                if(Data.MEM_COSTS[key]) costEl.value = (Data.MEM_COSTS[key]/10000).toFixed(2);
                else costEl.value = ''; 
            }
        }
        UI.updateAddressDisplay();
    };
    getEl('from-center')?.addEventListener('input', handleLocationInput);
    getEl('to-center')?.addEventListener('input', handleLocationInput);

    // 버튼 동작들
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
    getEl('btn-trip-cancel')?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), ...formData, type: '운행취소' });
        Utils.showToast('취소됨');
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

    // 수정 완료/삭제 버튼
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

    getEl('btn-edit-start-trip')?.addEventListener('click', () => {
        const id = parseInt(getEl('edit-id').value);
        const index = Data.MEM_RECORDS.findIndex(r => r.id === id);
        if (index > -1) {
            Data.MEM_RECORDS[index].date = Utils.getTodayString();
            Data.MEM_RECORDS[index].time = Utils.getCurrentTimeString();
            Data.saveData();
            Utils.showToast('시작 시간 현재로 변경');
            UI.resetForm();
            updateAllDisplays();
        }
    });
    getEl('btn-edit-end-trip')?.addEventListener('click', () => {
        Data.addRecord({ id: Date.now(), date: Utils.getTodayString(), time: Utils.getCurrentTimeString(), type: '운행종료', distance: 0, cost: 0, income: 0 });
        Utils.showToast('운행 종료됨');
        UI.resetForm();
        updateAllDisplays();
    });

    getEl('refresh-btn')?.addEventListener('click', () => location.reload());
    getEl('today-date-picker')?.addEventListener('change', () => updateAllDisplays());
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
        getEl('main-page')?.classList.remove("hidden"); 
        getEl('settings-page')?.classList.add("hidden"); 
        getEl('go-to-settings-btn')?.classList.remove("hidden"); 
        getEl('back-to-main-btn')?.classList.add("hidden"); 
        updateAllDisplays(); 
    });

    getEl('center-search-input')?.addEventListener('input', (e) => UI.displayCenterList(e.target.value));

    document.querySelectorAll('.tab-btn').forEach(btn => { 
        btn.addEventListener("click", () => {
            if(btn.parentElement.classList.contains('view-tabs')) {
                document.querySelectorAll('.view-tabs .tab-btn').forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                document.querySelectorAll('.view-content').forEach(c => c.classList.remove('active'));
                getEl(btn.dataset.view + "-view")?.classList.add("active");
                updateAllDisplays();
            }
        });
    });

    getEl('type')?.addEventListener('change', UI.toggleUI);
    
    // 데이터 백업
    getEl('export-json-btn')?.addEventListener('click', () => { 
        const data = { records: Data.MEM_RECORDS, centers: Data.MEM_CENTERS, locations: Data.MEM_LOCATIONS, fares: Data.MEM_FARES, distances: Data.MEM_DISTANCES, costs: Data.MEM_COSTS }; 
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
    renderFrequentLocationButtons();
}

function initialSetup() {
    Data.loadAllData();
    UI.populateCenterDatalist();
    UI.populateExpenseDatalist();
    
    const todayStr = Utils.getTodayString();
    const nowTime = Utils.getCurrentTimeString();
    const dIn = document.getElementById('date');
    const tIn = document.getElementById('time');
    const picker = document.getElementById('today-date-picker');
    
    if(dIn) dIn.value = todayStr;
    if(tIn) tIn.value = nowTime;
    if(picker) picker.value = todayStr;

    // 년월 선택 박스 생성
    const y = new Date().getFullYear();
    const yrs = []; for(let i=0; i<5; i++) yrs.push(`<option value="${y-i}">${y-i}년</option>`);
    ['daily-year-select', 'weekly-year-select', 'monthly-year-select', 'print-year-select'].forEach(id => {
        const el = document.getElementById(id); if(el) el.innerHTML = yrs.join('');
    });
    const ms = []; for(let i=1; i<=12; i++) ms.push(`<option value="${i.toString().padStart(2,'0')}">${i}월</option>`);
    ['daily-month-select', 'weekly-month-select', 'print-month-select'].forEach(id => {
        const el = document.getElementById(id); if(el) { el.innerHTML = ms.join(''); el.value = (new Date().getMonth()+1).toString().padStart(2,'0'); }
    });

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

function renderFrequentLocationButtons() {
    const fromContainer = document.getElementById('top-from-centers');
    const toContainer = document.getElementById('top-to-centers');
    if (!fromContainer || !toContainer) return;
    const fromCounts = {};
    const toCounts = {};
    Data.MEM_RECORDS.slice(-50).forEach(r => {
        if(r.from) fromCounts[r.from] = (fromCounts[r.from] || 0) + 1;
        if(r.to) toCounts[r.to] = (toCounts[r.to] || 0) + 1;
    });
    const buildButtons = (counts, container, targetId) => {
        container.innerHTML = '';
        Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5).forEach(([name]) => {
            const btn = document.createElement('button');
            btn.type = 'button'; btn.className = 'quick-loc-btn'; btn.textContent = name;
            btn.onclick = () => { 
                const el = document.getElementById(targetId);
                if(el) { el.value = name; el.dispatchEvent(new Event('input')); }
            };
            container.appendChild(btn);
        });
    };
    buildButtons(fromCounts, fromContainer, 'from-center');
    buildButtons(toCounts, toContainer, 'to-center');
}

document.addEventListener("DOMContentLoaded", initialSetup);