// ✅ 올바른 import 문법으로 수정
import * as Utils from './utils.js';
import * as Data from './data.js';
import * as UI from './ui.js';
import * as Stats from './stats.js'; 
import { parseSmsText, applyParsedSms } from './sms_parser.js';

function setupEventListeners() {
    const getEl = (id) => document.getElementById(id);

    // [추가] SMS 인식 버튼 연결 - 버튼이 없을 수 있으므로 ?. 사용
    getEl('btn-parse-sms')?.addEventListener('click', parseSmsText);
    window.applyParsedSms = applyParsedSms;

    // 모바일 아코디언 (안전하게 연결)
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
            e.preventDefault(); e.stopPropagation();
            const addr = e.target.dataset.address;
            if (addr) Utils.copyTextToClipboard(addr, '주소 복사됨');
        }
    });

    // 테이블 클릭 (수정모드)
    document.querySelector('#today-records-table tbody')?.addEventListener('click', (e) => {
        const addrTarget = e.target.closest('.location-clickable');
        if (addrTarget) {
            e.preventDefault(); e.stopPropagation();
            const center = addrTarget.getAttribute('data-center');
            if(center) {
                const loc = Data.MEM_LOCATIONS[center];
                if(loc && loc.address) Utils.copyTextToClipboard(loc.address, '주소 복사됨');
                else Utils.copyTextToClipboard(center, '이름 복사됨');
            }
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
        const type = typeIn?.value;

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
        }
        UI.updateAddressDisplay();
    };

    getEl('from-center')?.addEventListener('input', handleLocationInput);
    getEl('to-center')?.addEventListener('input', handleLocationInput);

    // 버튼 액션 (?. 연산자를 사용하여 페이지에 버튼이 없어도 자바스크립트가 멈추지 않음)
    getEl('btn-register-trip')?.addEventListener('click', () => {
        const formData = UI.getFormDataWithoutTime();
        if (formData.type === '화물운송' && formData.distance <= 0) { alert('운행거리를 입력해주세요.'); return; }
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

    // 화면 전환 버튼 (설정으로 가기)
    getEl('go-to-settings-btn')?.addEventListener('click', () => { 
        const mainP = getEl('main-page');
        const setP = getEl('settings-page');
        if(mainP && setP) {
            mainP.classList.add("hidden"); 
            setP.classList.remove("hidden"); 
            getEl('go-to-settings-btn').classList.add("hidden"); 
            getEl('back-to-main-btn').classList.remove("hidden"); 
            Stats.displayCumulativeData(); 
            Stats.displayCurrentMonthData(); 
        } else {
            location.href = 'settings.html';
        }
    });

    // 화면 전환 버튼 (메인으로 가기)
    getEl('back-to-main-btn')?.addEventListener('click', () => { 
        const mainP = getEl('main-page');
        const setP = getEl('settings-page');
        if(mainP && setP && mainP.children.length > 0) { // index.html 내부인 경우
            mainP.classList.remove("hidden"); 
            setP.classList.add("hidden"); 
            getEl('go-to-settings-btn')?.classList.remove("hidden"); 
            getEl('back-to-main-btn')?.classList.add("hidden"); 
            updateAllDisplays(); 
        } else {
            location.href = 'index.html'; // settings.html인 경우 이동
        }
    });

    getEl('refresh-btn')?.addEventListener('click', () => { UI.resetForm(); location.reload(); });

    document.querySelectorAll('.collapsible-header').forEach(header => { 
        header.addEventListener("click", () => { 
            const body = header.nextElementSibling; 
            header.classList.toggle("active"); 
            body.classList.toggle("hidden"); 
            if (header.id === 'toggle-center-management' && !body.classList.contains('hidden')) UI.displayCenterList();
        }); 
    });

    document.querySelectorAll('.tab-btn').forEach(btn => { 
        btn.addEventListener("click", event => { 
            if(btn.parentElement.classList.contains('view-tabs')) { 
                document.querySelectorAll('.tab-btn').forEach(b => { if(b.parentElement.classList.contains('view-tabs')) b.classList.remove("active"); }); 
                btn.classList.add("active"); 
                document.querySelectorAll('.view-content').forEach(c => c.classList.remove('active')); 
                const targetView = getEl(btn.dataset.view + "-view");
                if(targetView) targetView.classList.add("active"); 
                updateAllDisplays(); 
            } 
        });
    });

    getEl('type')?.addEventListener('change', UI.toggleUI);
    
    initPrintAndDataFeatures();
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
    const dateIn = document.getElementById('date');
    const timeIn = document.getElementById('time');
    const picker = document.getElementById('today-date-picker');
    
    if(dateIn) dateIn.value = todayStr;
    if(timeIn) timeIn.value = nowTime;
    if(picker) picker.value = todayStr;

    // 공통 셀렉트박스 설정
    const y = new Date().getFullYear();
    const yrs = []; for(let i=0; i<5; i++) yrs.push(`<option value="${y-i}">${y-i}년</option>`);
    ['daily-year-select', 'weekly-year-select', 'monthly-year-select', 'print-year-select'].forEach(id => {
        const el = document.getElementById(id); if(el) el.innerHTML = yrs.join('');
    });
    
    if(window.location.pathname.includes('settings.html')) {
        Stats.displayCumulativeData(); 
        Stats.displayCurrentMonthData();
    }

    setupEventListeners();
    updateAllDisplays();
}

function initPrintAndDataFeatures() {
    const getEl = (id) => document.getElementById(id);
    getEl('export-json-btn')?.addEventListener('click', () => { 
        const data = { records: Data.MEM_RECORDS, centers: Data.MEM_CENTERS, locations: Data.MEM_LOCATIONS }; 
        const b = new Blob([JSON.stringify(data,null,2)],{type:"application/json"}); 
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download=`backup_${Utils.getTodayString()}.json`; 
        a.click(); 
    });
    getEl('clear-btn')?.addEventListener('click', () => { if(confirm('전체삭제?')) { localStorage.clear(); location.reload(); }});
}

document.addEventListener("DOMContentLoaded", initialSetup);