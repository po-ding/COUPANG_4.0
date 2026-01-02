import { formatToManwon, getStatisticalDate, getTodayString } from './utils.js';
import { MEM_RECORDS, MEM_LOCATIONS } from './data.js';
import { editRecord } from './ui.js';

let displayedSubsidyCount = 0;

function safeInt(value) {
    if (!value) return 0;
    const num = parseInt(String(value).replace(/,/g, ''), 10);
    return isNaN(num) ? 0 : num;
}

function safeFloat(value) {
    if (!value) return 0;
    const num = parseFloat(String(value).replace(/,/g, ''));
    return isNaN(num) ? 0 : num;
}

export function calculateTotalDuration(records) {
    const sorted = [...records].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    let totalMinutes = 0;
    if (sorted.length < 2) return '0h 0m';
    for (let i = 1; i < sorted.length; i++) {
        const curr = new Date(`${sorted[i].date}T${sorted[i].time}`);
        const prev = new Date(`${sorted[i-1].date}T${sorted[i-1].time}`);
        if (sorted[i-1].type !== '운행종료') {
            totalMinutes += (curr - prev) / 60000;
        }
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
}

export function createSummaryHTML(title, records) {
    const validRecords = records.filter(r => r.type !== '운행취소' && r.type !== '운행종료');
    let totalIncome = 0, totalExpense = 0, totalDistance = 0, totalTripCount = 0;
    let totalFuelCost = 0, totalFuelLiters = 0;
    
    validRecords.forEach(r => {
        totalIncome += safeInt(r.income);
        totalExpense += safeInt(r.cost);
        if (r.type === '주유소') { 
            totalFuelCost += safeInt(r.cost); 
            totalFuelLiters += safeFloat(r.liters); 
        }
        if (['화물운송'].includes(r.type)) { 
            totalDistance += safeFloat(r.distance); 
            totalTripCount++; 
        }
    });

    const netIncome = totalIncome - totalExpense;
    
    const metrics = [
        { label: '수입', value: formatToManwon(totalIncome), unit: ' 만원', className: 'income' },
        { label: '지출', value: formatToManwon(totalExpense), unit: ' 만원', className: 'cost' },
        { label: '정산', value: formatToManwon(netIncome), unit: ' 만원', className: 'net' },
        { label: '운행거리', value: totalDistance.toFixed(1), unit: ' km' },
        { label: '운행건수', value: totalTripCount, unit: ' 건' },
        { label: '주유금액', value: formatToManwon(totalFuelCost), unit: ' 만원', className: 'cost' },
        { label: '주유리터', value: totalFuelLiters.toFixed(2), unit: ' L' },
    ];
    let itemsHtml = metrics.map(m => `<div class="summary-item"><span class="summary-label">${m.label}</span><span class="summary-value ${m.className || ''} hidden">${m.value}${m.unit}</span></div>`).join('');
    return `<strong>${title}</strong><div class="summary-toggle-grid" onclick="window.toggleAllSummaryValues(this)">${itemsHtml}</div>`;
}

export function displayTodayRecords(date) {
    const todayTbody = document.querySelector('#today-records-table tbody');
    const todaySummaryDiv = document.getElementById('today-summary');
    if(!todayTbody) return;
    const dayRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time) === date)
                                  .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    todayTbody.innerHTML = '';
    const displayList = dayRecords.filter(r => r.type !== '운행종료');
    displayList.forEach(r => {
        const tr = document.createElement('tr');
        tr.dataset.id = r.id; 
        let timeDisplay = r.time;
        if(r.date !== date) { timeDisplay = `<span style="font-size:0.8em; color:#888;">(익일)</span> ${r.time}`; }
        let money = '';
        const inc = safeInt(r.income);
        const cst = safeInt(r.cost);
        if(inc > 0) money += `<span class="income">+${formatToManwon(inc)}</span> `;
        if(cst > 0) money += `<span class="cost">-${formatToManwon(cst)}</span>`;
        if(money === '') money = '0'; 
        const isTransport = (r.type === '화물운송' || r.type === '대기' || r.type === '운행취소');
        if (isTransport) {
            let endTime = '진행중';
            let duration = '-';
            const idx = MEM_RECORDS.findIndex(item => item.id === r.id);
            if (idx > -1 && idx < MEM_RECORDS.length - 1) {
                const next = MEM_RECORDS[idx + 1];
                if (next.date !== r.date) {
                    const monthDay = next.date.substring(5);
                    endTime = `<span style="font-size:0.8em; color:#888;">(${monthDay})</span><br>${next.time}`;
                } else {
                    endTime = next.time;
                }
                const startObj = new Date(`${r.date}T${r.time}`);
                const endObj = new Date(`${next.date}T${next.time}`);
                const diff = endObj - startObj;
                if (diff >= 0) {
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
                }
            } else {
                endTime = '진행중';
            }
            if(endTime === '진행중') tr.classList.add('row-in-progress');
            else tr.classList.add('row-completed');
            const fromVal = (r.from||'').replace(/"/g, '&quot;');
            const toVal = (r.to||'').replace(/"/g, '&quot;');
            const fromLoc = MEM_LOCATIONS[r.from] || {};
            const toLoc = MEM_LOCATIONS[r.to] || {};
            let fromCell = `<span class="location-clickable" data-center="${fromVal}">${r.from || ''}</span>`;
            if (fromLoc.memo) fromCell += `<span class="table-memo">${fromLoc.memo}</span>`;
            let toCell = `<span class="location-clickable" data-center="${toVal}">${r.to || ''}</span>`;
            if (toLoc.memo) toCell += `<span class="table-memo">${toLoc.memo}</span>`;
            let noteCell = '';
            if(r.distance) noteCell = `<span class="note">${safeFloat(r.distance)} km</span>`;
            if(r.type === '대기') noteCell = `<span class="note">대기중</span>`;
            if(r.type === '운행취소') noteCell = `<span class="note cancelled">취소됨</span>`;
            tr.innerHTML = `<td data-label="시작">${timeDisplay}</td><td data-label="종료">${endTime}</td><td data-label="소요">${duration}</td><td data-label="상차">${fromCell}</td><td data-label="하차">${toCell}</td><td data-label="비고">${noteCell}</td><td data-label="금액">${money}</td>`;
        } else {
            const detail = r.expenseItem || r.supplyItem || r.brand || '';
            const content = `<span style="font-weight:bold; color:#555;">[${r.type}]</span>&nbsp;&nbsp;${detail}`;
            if(r.type === '운행종료') tr.classList.add('row-end');
            tr.innerHTML = `<td data-label="시작">${timeDisplay}</td><td colspan="5" data-label="" style="color:#333;">${content}</td><td data-label="금액">${money}</td>`;
        }
        todayTbody.appendChild(tr);
    });
    if(todaySummaryDiv) todaySummaryDiv.innerHTML = createSummaryHTML('오늘의 기록 (04시 기준)', dayRecords);
}

export function displayDailyRecords() {
    const yearSelect = document.getElementById('daily-year-select');
    const monthSelect = document.getElementById('daily-month-select');
    if(!yearSelect || !monthSelect) return;
    const year = yearSelect.value;
    const month = monthSelect.value;
    const selectedPeriod = `${year}-${month}`;
    const dailyTbody = document.querySelector('#daily-summary-table tbody');
    const dailySummaryDiv = document.getElementById('daily-summary');
    const monthRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(selectedPeriod));
    if(dailyTbody) dailyTbody.innerHTML = '';
    if(dailySummaryDiv) {
        dailySummaryDiv.classList.remove('hidden');
        dailySummaryDiv.innerHTML = createSummaryHTML(`${parseInt(month)}월 총계 (04시 기준)`, monthRecords);
    }
    const recordsByDate = {};
    monthRecords.forEach(r => {
        const statDate = getStatisticalDate(r.date, r.time);
        if(!recordsByDate[statDate]) recordsByDate[statDate] = { records: [], income: 0, expense: 0, fuel: 0, distance: 0, tripCount: 0 };
        recordsByDate[statDate].records.push(r);
    });
    Object.keys(recordsByDate).sort().reverse().forEach(date => {
        const dayData = recordsByDate[date];
        const transport = dayData.records.filter(r => ['화물운송', '공차이동', '대기', '운행종료', '운행취소'].includes(r.type));
        let inc = 0, exp = 0, fuel = 0, dist = 0, count = 0;
        dayData.records.forEach(r => {
            if(r.type === '주유소') {
                fuel += safeInt(r.cost);
            } else if (r.type !== '운행종료' && r.type !== '운행취소') {
                inc += safeInt(r.income); 
                exp += safeInt(r.cost); 
            }
            if(r.type === '화물운송') { dist += safeFloat(r.distance); count++; }
        });
        if (count === 0 && inc === 0 && exp === 0 && fuel === 0) return;
        const tr = document.createElement('tr');
        if(date === getTodayString()) tr.style.fontWeight = 'bold';
        tr.innerHTML = `<td data-label="일">${parseInt(date.substring(8,10))}일</td><td data-label="수입"><span class="income">${formatToManwon(inc)}</span></td><td data-label="지출"><span class="cost">${formatToManwon(exp)}</span></td><td data-label="주유"><span class="cost">${formatToManwon(fuel)}</span></td><td data-label="정산"><strong>${formatToManwon(inc-exp-fuel)}</strong></td><td data-label="거리">${dist.toFixed(1)}</td><td data-label="이동">${count}</td><td data-label="소요">${calculateTotalDuration(transport)}</td><td data-label="관리"><button class="edit-btn" onclick="window.viewDateDetails('${date}')">상세</button></td>`;
        if(dailyTbody) dailyTbody.appendChild(tr);
    });
}

export function displayWeeklyRecords() {
    const yearSelect = document.getElementById('weekly-year-select');
    const monthSelect = document.getElementById('weekly-month-select');
    if(!yearSelect || !monthSelect) return;
    const year = yearSelect.value;
    const month = monthSelect.value;
    const selectedPeriod = `${year}-${month}`;
    const weeklyTbody = document.querySelector('#weekly-summary-table tbody');
    const weeklySummaryDiv = document.getElementById('weekly-summary');
    const monthRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(selectedPeriod));
    if(weeklyTbody) weeklyTbody.innerHTML = '';
    if(weeklySummaryDiv) weeklySummaryDiv.innerHTML = createSummaryHTML(`${parseInt(month)}월 주별`, monthRecords);
    const weeks = {};
    monthRecords.forEach(r => {
        const statDate = getStatisticalDate(r.date, r.time);
        const d = new Date(statDate);
        const w = Math.ceil((d.getDate() + (new Date(d.getFullYear(), d.getMonth(), 1).getDay())) / 7);
        if(!weeks[w]) weeks[w] = [];
        weeks[w].push(r);
    });
    Object.keys(weeks).forEach(w => {
        const data = weeks[w];
        const transport = data.filter(r => ['화물운송', '공차이동', '대기', '운행종료', '운행취소'].includes(r.type));
        let inc = 0, exp = 0, fuel = 0, dist = 0, count = 0;
        data.forEach(r => { 
            if(r.type === '주유소') {
                fuel += safeInt(r.cost);
            } else if(r.type!=='운행종료'&&r.type!=='운행취소'){
                inc+=safeInt(r.income);
                exp+=safeInt(r.cost);
            } 
            if(r.type==='화물운송'){dist+=safeFloat(r.distance);count++;} 
        });
        const dates = data.map(r => new Date(getStatisticalDate(r.date, r.time)).getDate());
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="주차">${w}주차</td><td data-label="기간">${Math.min(...dates)}일~${Math.max(...dates)}일</td><td data-label="수입">${formatToManwon(inc)}</td><td data-label="지출">${formatToManwon(exp)}</td><td data-label="주유">${formatToManwon(fuel)}</td><td data-label="정산">${formatToManwon(inc-exp-fuel)}</td><td data-label="거리">${dist.toFixed(1)}</td><td data-label="이동">${count}</td><td data-label="소요">${calculateTotalDuration(transport)}</td>`;
        if(weeklyTbody) weeklyTbody.appendChild(tr);
    });
}

export function displayMonthlyRecords() {
    const yearSelect = document.getElementById('monthly-year-select');
    if(!yearSelect) return;
    const year = yearSelect.value;
    const monthlyTbody = document.querySelector('#monthly-summary-table tbody');
    const monthlyYearlySummaryDiv = document.getElementById('monthly-yearly-summary');
    const yearRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(year));
    if(monthlyYearlySummaryDiv) monthlyYearlySummaryDiv.innerHTML = createSummaryHTML(`${year}년`, yearRecords);
    if(monthlyTbody) monthlyTbody.innerHTML = '';
    const months = {};
    yearRecords.forEach(r => { 
        const statDate = getStatisticalDate(r.date, r.time);
        const m = statDate.substring(0,7); 
        if(!months[m]) months[m]={records:[]}; 
        months[m].records.push(r); 
    });
    Object.keys(months).sort().reverse().forEach(m => {
        const data = months[m];
        const transport = data.records.filter(r => ['화물운송', '공차이동', '대기', '운행종료', '운행취소'].includes(r.type));
        let inc=0,exp=0,fuel=0,dist=0,count=0;
         data.records.forEach(r => { 
            if(r.type === '주유소') {
                fuel += safeInt(r.cost);
            } else if(r.type!=='운행종료'&&r.type!=='운행취소'){
                inc+=safeInt(r.income);
                exp+=safeInt(r.cost);
            } 
            if(r.type==='화물운송'){dist+=safeFloat(r.distance);count++;} 
        });
        const tr = document.createElement('tr');
        tr.innerHTML = `<td data-label="월">${parseInt(m.substring(5))}월</td><td data-label="수입">${formatToManwon(inc)}</td><td data-label="지출">${formatToManwon(exp)}</td><td data-label="주유">${formatToManwon(fuel)}</td><td data-label="정산">${formatToManwon(inc-exp-fuel)}</td><td data-label="거리">${dist.toFixed(1)}</td><td data-label="이동">${count}</td><td data-label="소요">${calculateTotalDuration(transport)}</td>`;
        if(monthlyTbody) monthlyTbody.appendChild(tr);
    });
}

// ... displayCurrentMonthData, displayCumulativeData, renderMileageSummary, generatePrintView (기존 동일)
export function displayCurrentMonthData() {
    const now = new Date();
    let checkDate = new Date();
    if(checkDate.getHours() < 4) checkDate.setDate(checkDate.getDate() - 1);
    
    const currentPeriod = checkDate.toISOString().slice(0, 7); 
    const monthRecords = MEM_RECORDS.filter(r => getStatisticalDate(r.date, r.time).startsWith(currentPeriod) && r.type !== '운행취소' && r.type !== '운행종료'); 
    
    const titleEl = document.getElementById('current-month-title');
    if(titleEl) titleEl.textContent = `${parseInt(currentPeriod.split('-')[1])}월 실시간 요약 (04시 기준)`; 
    
    let inc = 0, exp = 0, count = 0, dist = 0, liters = 0; 
    monthRecords.forEach(r => { 
        inc += safeInt(r.income); exp += safeInt(r.cost); 
        if(r.type === '화물운송') { count++; dist += safeFloat(r.distance); } 
        if(r.type === '주유소') liters += safeFloat(r.liters); 
    }); 
    
    const days = new Set(monthRecords.map(r => getStatisticalDate(r.date, r.time))).size; 
    const net = inc - exp; 
    const avg = liters > 0 && dist > 0 ? (dist/liters).toFixed(2) : 0; 
    const costKm = dist > 0 ? Math.round(exp/dist) : 0; 
    
    const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };
    
    setTxt('current-month-operating-days', `${days} 일`); 
    setTxt('current-month-trip-count', `${count} 건`); 
    setTxt('current-month-total-mileage', `${dist.toFixed(1)} km`); 
    setTxt('current-month-income', `${formatToManwon(inc)} 만원`); 
    setTxt('current-month-expense', `${formatToManwon(exp)} 만원`); 
    setTxt('current-month-net-income', `${formatToManwon(net)} 만원`); 
    setTxt('current-month-avg-economy', `${avg} km/L`); 
    setTxt('current-month-cost-per-km', `${costKm.toLocaleString()} 원`); 
    
    const limit = parseFloat(localStorage.getItem("fuel_subsidy_limit")) || 0; 
    const remain = limit - liters; 
    const pct = limit > 0 ? Math.min(100, 100 * liters / limit).toFixed(1) : 0; 
    const subSum = document.getElementById('subsidy-summary');
    if(subSum) subSum.innerHTML = `<div class="progress-label">월 한도: ${limit.toLocaleString()} L | 사용: ${liters.toFixed(1)} L | 잔여: ${remain.toFixed(1)} L</div><div class="progress-bar-container"><div class="progress-bar progress-bar-used" style="width: ${pct}%;"></div></div>`; 
}

export function displayCumulativeData() {
    const records = MEM_RECORDS.filter(r => r.type !== '운행취소' && r.type !== '운행종료');
    let inc = 0, exp = 0, count = 0, dist = 0, liters = 0;
    records.forEach(r => {
        inc += safeInt(r.income); exp += safeInt(r.cost);
        if(r.type === '주유소') liters += safeFloat(r.liters);
        if(r.type === '화물운송') { count++; dist += safeFloat(r.distance); }
    });
    
    const correction = parseFloat(localStorage.getItem("mileage_correction")) || 0;
    const totalDist = dist + correction;
    const net = inc - exp;
    const avg = liters > 0 && totalDist > 0 ? (totalDist/liters).toFixed(2) : 0;
    const costKm = totalDist > 0 ? Math.round(exp/totalDist) : 0;
    const days = new Set(records.map(r => getStatisticalDate(r.date, r.time))).size;
    
    const setTxt = (id, txt) => { const el = document.getElementById(id); if(el) el.textContent = txt; };

    setTxt('cumulative-operating-days', `${days} 일`);
    setTxt('cumulative-trip-count', `${count} 건`);
    setTxt('cumulative-total-mileage', `${Math.round(totalDist).toLocaleString()} km`);
    setTxt('cumulative-income', `${formatToManwon(inc)} 만원`);
    setTxt('cumulative-expense', `${formatToManwon(exp)} 만원`);
    setTxt('cumulative-net-income', `${formatToManwon(net)} 만원`);
    setTxt('cumulative-avg-economy', `${avg} km/L`);
    setTxt('cumulative-cost-per-km', `${costKm.toLocaleString()} 원`);
    
    renderMileageSummary();
}

export function renderMileageSummary(period = 'monthly') {
    const validRecords = MEM_RECORDS.filter(r => ['화물운송'].includes(r.type));
    let summaryData = {};
    if (period === 'monthly') {
        for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setMonth(d.getMonth() - i);
            const k = d.toISOString().slice(0, 7);
            summaryData[k] = 0;
        }
        validRecords.forEach(r => { 
            const statDate = getStatisticalDate(r.date, r.time);
            const k = statDate.substring(0, 7); 
            if (summaryData.hasOwnProperty(k)) summaryData[k]++; 
        });
    } else {
        for (let i = 11; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - (i * 7));
            const k = d.toISOString().slice(0, 10);
            summaryData[k] = 0;
        }
        validRecords.forEach(r => {
            const statDate = getStatisticalDate(r.date, r.time);
            const d = new Date(statDate); 
            d.setDate(d.getDate() - d.getDay() + 1);
            const k = d.toISOString().slice(0, 10);
            if (summaryData.hasOwnProperty(k)) summaryData[k]++;
        });
    }
    let h = '';
    for (const k in summaryData) {
        h += `<div class="metric-card"><span class="metric-label">${k}</span><span class="metric-value">${summaryData[k]} 건</span></div>`;
    }
    const container = document.getElementById('mileage-summary-cards');
    if(container) container.innerHTML = h;
}

export function generatePrintView(year, month, period, isDetailed) {
    const sDay = period === 'second' ? 16 : 1;
    const eDay = period === 'first' ? 15 : 31;
    const periodStr = period === 'full' ? '1일 ~ 말일' : `${sDay}일 ~ ${eDay===15?15:'말'}일`;
    
    const target = MEM_RECORDS.filter(r => { 
        const statDate = getStatisticalDate(r.date, r.time);
        const d = new Date(statDate); 
        return statDate.startsWith(`${year}-${month}`) && d.getDate() >= sDay && d.getDate() <= eDay && r.type !== '운행종료'; 
    }).sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
    
    const transportList = target.filter(r => ['화물운송', '대기', '운행취소'].includes(r.type));
    const fuelList = target.filter(r => r.type === '주유소');
    const expenseList = target.filter(r => ['지출', '소모품'].includes(r.type));
    const incomeList = target.filter(r => r.type === '수입');

    let transInc = 0, transExp = 0, transDist = 0;
    transportList.forEach(r => {
        transInc += safeInt(r.income);
        transExp += safeInt(r.cost);
        transDist += safeFloat(r.distance);
    });

    let fuelTotalCost = 0, fuelTotalSubsidy = 0;
    fuelList.forEach(r => {
        fuelTotalCost += safeInt(r.cost);
        fuelTotalSubsidy += safeInt(r.subsidy);
    });
    const fuelNetCost = fuelTotalCost - fuelTotalSubsidy;

    let genExp = 0;
    expenseList.forEach(r => genExp += safeInt(r.cost));

    let genInc = 0;
    incomeList.forEach(r => genInc += safeInt(r.income));

    const totalRevenue = transInc + genInc; 
    const totalSpend = transExp + genExp + fuelNetCost; 
    const finalProfit = totalRevenue - totalSpend; 

    const workDays = new Set(
        transportList.map(r => getStatisticalDate(r.date, r.time))
    ).size;

    const w = window.open('','_blank');
    
    let h = `
    <html>
    <head>
        <title>운송내역서</title>
        <style>
            body { font-family: sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: fixed; margin-bottom: 20px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: center; word-wrap: break-word; }
            th { background: #eee; }
            .summary { border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; background-color: #f9f9f9; line-height: 1.6; }
            .date-border { border-top: 2px solid #000 !important; }
            .left-align { text-align: left; padding-left: 5px; }
            .col-date { width: 80px; }
            .col-location { width: 120px; }
            .col-note { width: 100px; }
            h3 { margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px; }
            .txt-red { color: #dc3545; font-weight: bold; }
            .txt-blue { color: #007bff; font-weight: bold; }
            .txt-green { color: #28a745; font-weight: bold; }
        </style>
    </head>
    <body>
        <h2>${year}년 ${month}월 ${periodStr} 운송 기록 (04시 기준)</h2>
        <div class="summary">
            <p><strong>[요약]</strong> 근무일: ${workDays}일 | 운행건수: ${transportList.length}건 | 운행거리: ${transDist.toFixed(1)}km</p>
            <hr style="border:0; border-top:1px dashed #ccc; margin:10px 0;">
            <p><span class="txt-blue">[ + ] 총 수입: ${totalRevenue.toLocaleString()} 원</span> (운송: ${transInc.toLocaleString()} + 기타: ${genInc.toLocaleString()})</p>
            <p><span class="txt-red">[ - ] 총 지출: ${(transExp + genExp).toLocaleString()} 원</span> (운송지출: ${transExp.toLocaleString()} + 일반지출: ${genExp.toLocaleString()})</p>
            <p><span class="txt-red">[ - ] 실 주유비: ${fuelNetCost.toLocaleString()} 원</span> (주유금액: ${fuelTotalCost.toLocaleString()} - 보조금: ${fuelTotalSubsidy.toLocaleString()})</p>
            <hr style="border:0; border-top:2px solid #333; margin:10px 0;">
            <p class="txt-green" style="font-size: 1.4em;">[ = ] 최종 순수익: ${finalProfit.toLocaleString()} 원</p>
        </div>
        <h3>1. 운송 내역</h3>
        <table>
            <thead>
                <tr>
                    <th class="col-date">날짜</th>
                    <th class="col-location">상차지</th>
                    <th class="col-location">하차지</th>
                    <th class="col-note">내용</th>
                    ${isDetailed ? '<th>거리</th><th>수입</th>' : ''}
                </tr>
            </thead>
            <tbody>`;
            
    if (transportList.length === 0) h += `<tr><td colspan="${isDetailed?6:4}">내역 없음</td></tr>`;
    
    let lastDate = '';
    transportList.forEach(r => {
        const statDate = getStatisticalDate(r.date, r.time);
        let borderClass = ''; 
        if(lastDate !== '' && lastDate !== statDate) borderClass = 'class="date-border"'; 
        lastDate = statDate;

        let dateDisplay = statDate.substring(5);
        let from = r.from || '';
        let to = r.to || '';
        let desc = r.type;
        if(r.type === '대기') desc = '대기';
        if(r.type === '운행취소') desc = '취소';

        h += `<tr ${borderClass}>
                <td>${dateDisplay}</td>
                <td class="left-align">${from}</td>
                <td class="left-align">${to}</td>
                <td>${desc}</td>
                ${isDetailed ? `<td>${safeFloat(r.distance)||'-'}</td><td>${safeInt(r.income).toLocaleString()}</td>` : ''}
              </tr>`;
    });
    h += `</tbody></table>`;

    h += `<h3>2. 주유 및 정비 내역</h3>`;
    if (fuelList.length > 0) {
        h += `<table>
                <thead>
                    <tr>
                        <th class="col-date">날짜</th>
                        <th>주유리터</th>
                        <th>주유단가</th>
                        <th>주유금액</th>
                        <th>보조금액</th>
                        <th>실결제금액</th>
                    </tr>
                </thead>
                <tbody>`;
        
        fuelList.forEach(r => {
             const statDate = getStatisticalDate(r.date, r.time);
             let dateDisplay = statDate.substring(5);
             if(r.date !== statDate) dateDisplay += ' (익일)';
             
             const cost = safeInt(r.cost);
             const subsidy = safeInt(r.subsidy);
             const netCost = cost - subsidy;

             h += `<tr>
                    <td>${dateDisplay}</td>
                    <td>${safeFloat(r.liters).toFixed(2)} L</td>
                    <td>${safeInt(r.unitPrice).toLocaleString()} 원</td>
                    <td>${cost.toLocaleString()} 원</td>
                    <td style="color:red;">${subsidy > 0 ? '-' + subsidy.toLocaleString() : '0'} 원</td>
                    <td style="font-weight:bold;">${netCost.toLocaleString()} 원</td>
                   </tr>`;
        });
        h += `</tbody></table>`;
    } else {
        h += `<p>내역 없음</p>`;
    }

    h += `<h3>3. 지출 내역</h3>`;
    if (expenseList.length > 0) {
        h += `<table>
                <thead>
                    <tr>
                        <th class="col-date">날짜</th>
                        <th>내용 (적요)</th>
                        <th>지출금액</th>
                    </tr>
                </thead>
                <tbody>`;
        expenseList.forEach(r => {
            const statDate = getStatisticalDate(r.date, r.time);
            let dateDisplay = statDate.substring(5);
            let item = r.expenseItem || r.supplyItem || r.type;
            
            h += `<tr>
                    <td>${dateDisplay}</td>
                    <td class="left-align">${item}</td>
                    <td>${safeInt(r.cost).toLocaleString()} 원</td>
                  </tr>`;
        });
        h += `</tbody></table>`;
    } else {
        h += `<p>내역 없음</p>`;
    }

    h += `<h3>4. 수입 내역</h3>`;
    if (incomeList.length > 0) {
        h += `<table>
                <thead>
                    <tr>
                        <th class="col-date">날짜</th>
                        <th>내용 (적요)</th>
                        <th>수입금액</th>
                    </tr>
                </thead>
                <tbody>`;
        incomeList.forEach(r => {
            const statDate = getStatisticalDate(r.date, r.time);
            let dateDisplay = statDate.substring(5);
            let item = r.expenseItem || r.type; 
            
            h += `<tr>
                    <td>${dateDisplay}</td>
                    <td class="left-align">${item}</td>
                    <td>${safeInt(r.income).toLocaleString()} 원</td>
                  </tr>`;
        });
        h += `</tbody></table>`;
    } else {
        h += `<p>내역 없음</p>`;
    }

    h += `<button onclick="window.print()" style="padding:10px 20px; font-size:1.2em; cursor:pointer;">인쇄하기</button>
    </body>
    </html>`;
    
    w.document.write(h); 
    w.document.close();
}

// [누락된 함수 복구] displaySubsidyRecords
export function displaySubsidyRecords(append = false) {
    const subsidyRecordsList = document.getElementById('subsidy-records-list');
    const subsidyLoadMoreContainer = document.getElementById('subsidy-load-more-container');
    const fuelRecords = MEM_RECORDS.filter(r => r.type === '주유소').sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    
    if (!append) { 
        displayedSubsidyCount = 0; 
        if(subsidyRecordsList) subsidyRecordsList.innerHTML = ''; 
    }
    
    if (fuelRecords.length === 0) { 
        if(subsidyRecordsList) subsidyRecordsList.innerHTML = '<p class="note" style="text-align:center; padding:1em;">주유 내역이 없습니다.</p>'; 
        if(subsidyLoadMoreContainer) subsidyLoadMoreContainer.innerHTML = ''; 
        return; 
    }
    
    const nextBatch = fuelRecords.slice(displayedSubsidyCount, displayedSubsidyCount + 10);
    nextBatch.forEach(r => {
        const div = document.createElement('div');
        div.className = 'center-item'; 
        div.style.marginBottom = '5px';
        div.innerHTML = `
            <div class="info">
                <span class="center-name">${r.date} <span class="note">(${r.brand || '기타'})</span></span>
                <span style="font-weight:bold;">${formatToManwon(safeInt(r.cost))} 만원</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:4px; font-size:0.9em; color:#555;">
                <span>주유량: ${parseFloat(r.liters).toFixed(2)} L</span>
                <span>단가: ${r.unitPrice} 원</span>
            </div>`;
        if(subsidyRecordsList) subsidyRecordsList.appendChild(div);
    });
    
    displayedSubsidyCount += nextBatch.length;
    
    if (displayedSubsidyCount < fuelRecords.length && subsidyLoadMoreContainer) { 
        subsidyLoadMoreContainer.innerHTML = '<button class="load-more-btn" style="margin-top:10px; padding:10px;">▼ 더 보기</button>'; 
        subsidyLoadMoreContainer.querySelector('button').onclick = () => displaySubsidyRecords(true); 
    } else if (subsidyLoadMoreContainer) { 
        subsidyLoadMoreContainer.innerHTML = ''; 
    }
}