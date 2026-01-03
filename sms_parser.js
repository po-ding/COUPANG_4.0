import * as Data from './data.js';
import * as Utils from './utils.js';

export function parseSmsText() {
    const inputEl = document.getElementById('sms-input');
    const input = inputEl ? inputEl.value : "";
    if (!input.trim()) {
        Utils.showToast("분석할 문자를 입력해주세요.");
        return;
    }

    const resultsDiv = document.getElementById('sms-parse-results');
    if(!resultsDiv) return;
    
    resultsDiv.innerHTML = "";
    resultsDiv.classList.remove('hidden');

    const blocks = input.split(/\n\s*\n|\[Web발신\]|Web발신/); 
    let foundCount = 0;

    // 내 지역 목록을 긴 순서대로 정렬 (인천32물류센터를 인천보다 먼저 매칭)
    const sortedCenters = [...Data.MEM_CENTERS].sort((a, b) => b.length - a.length);

    blocks.forEach((block) => {
        const rawLine = block.trim();
        if(!rawLine || rawLine.length < 5 || /^\d+\.\d+$/.test(rawLine)) return; 
        
        // 1. [핵심] 층간 이동 화살표 미리 제거 (상하차 구분자와 혼동 방지)
        let cleanedLine = rawLine.replace(/\d+층\s*->\s*\d+층/g, " ");
        
        // 2. 시간, 호수, 톤수 등 노이즈 제거
        cleanedLine = cleanedLine.replace(/\[?\d+호\]?|\d{1,2}:\d{2}|[1-9][0-9]?T|\d+층|\d+\s*호/g, " ");
        
        let matches = [];
        let tempLine = cleanedLine.toUpperCase();

        // 3. 지능형 매칭 (글자 매칭 + 숫자 그룹 매칭)
        sortedCenters.forEach(center => {
            const centerUpper = center.toUpperCase();
            
            // A. 이름 전체가 포함된 경우
            let pos = tempLine.indexOf(centerUpper);
            
            // B. 이름에 숫자가 포함된 그룹 매칭 (예: "인천32" -> "인천31.32.41.42")
            if (pos === -1) {
                const numInSms = cleanedLine.match(/\d+/); // 문자의 "32"
                if (numInSms && center.includes(numInSms[0])) {
                    // 숫자가 등록지 명칭에 포함되어 있고, 앞 2글자(지역명)가 일치하면 매칭
                    const prefix = cleanedLine.substring(0, 2);
                    if (center.includes(prefix)) {
                        pos = cleanedLine.indexOf(numInSms[0]);
                    }
                }
            }

            if (pos !== -1) {
                matches.push({ name: center, index: pos });
                // 중복 매칭 방지를 위해 가림 처리
                let placeholder = " ".repeat(center.length);
                tempLine = tempLine.substring(0, pos) + placeholder + tempLine.substring(pos + center.length);
            }
        });

        // 문장 내 등장 순서대로 정렬
        matches.sort((a, b) => a.index - b.index);

        if (matches.length < 2) return; // 상/하차지 2개가 안 나오면 패스

        const finalFrom = matches[0].name;
        const finalTo = matches[1].name;

        // 4. 결과 UI 생성
        const itemDiv = document.createElement('div');
        itemDiv.className = "sms-item-card";
        itemDiv.style = "background:white; padding:12px; border-radius:6px; margin-bottom:10px; border:1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display:flex; justify-content:space-between; align-items:center;";
        
        itemDiv.innerHTML = `
            <div style="font-size:0.95em; color:#333;">
                <span style="font-weight:bold; color:#007bff;">${finalFrom}</span>
                <span style="margin:0 5px; color:#999;">→</span>
                <span style="font-weight:bold; color:#dc3545;">${finalTo}</span>
            </div>
            <button type="button" 
                onclick="window.registerParsedTrip(this, '${finalFrom.replace(/'/g, "\\'")}', '${finalTo.replace(/'/g, "\\'")}')" 
                style="background:#28a745; color:white; border:none; padding:8px 12px; border-radius:4px; font-size:0.85em; cursor:pointer; font-weight:bold; width:auto; flex-shrink:0;">
                운행 등록
            </button>
        `;
        resultsDiv.appendChild(itemDiv);
        foundCount++;
    });

    if(foundCount === 0) resultsDiv.innerHTML = "<p style='text-align:center; color:#666; font-size:0.9em;'>등록된 지역 목록과 일치하는 구간을 찾지 못했습니다.</p>";
}

export function registerParsedTrip(btn, from, to) {
    const key = `${from}-${to}`;
    const savedIncome = Data.MEM_FARES[key] || 0;
    const savedDistance = Data.MEM_DISTANCES[key] || 0;

    const newRecord = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: Utils.getTodayString(),
        time: "", 
        type: "화물운송",
        from: from,
        to: to,
        distance: savedDistance,
        income: savedIncome,
        cost: 0,
        liters: 0, unitPrice: 0, brand: "", expenseItem: "", supplyItem: "", mileage: 0
    };

    Data.addRecord(newRecord);
    
    // 버튼 상태 변경
    btn.disabled = true;
    btn.textContent = "등록 완료";
    btn.style.background = "#bdc3c7";
    btn.closest('.sms-item-card').style.background = "#f0fdf4";

    Utils.showToast("등록되었습니다.");

    if (window.updateAllDisplays) {
        window.updateAllDisplays();
    }
}