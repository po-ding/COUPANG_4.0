import * as Data from './data.js';
import * as Utils from './utils.js';

/**
 * 문자 분석 버튼 클릭 시 실행
 */
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

    // 1. 건별 분리 (Web발신 또는 빈 줄 기준)
    const blocks = input.split(/\n\s*\n|\[Web발신\]|Web발신/); 
    let foundCount = 0;

    // 내 지역 목록을 글자수가 긴 순서대로 정렬 (매칭 정확도 향상)
    const sortedCenters = [...Data.MEM_CENTERS].sort((a, b) => b.length - a.length);

    blocks.forEach((block) => {
        const rawLine = block.trim();
        if(!rawLine || rawLine.length < 5 || /^\d+\.\d+$/.test(rawLine)) return; 
        
        // 2. [매우 중요] 층간 이동 화살표 미리 제거하여 상하차 구분자와의 혼동 방지
        let cleanedLine = rawLine.replace(/\d+층\s*->\s*\d+층/g, " ");
        
        // 3. 기타 노이즈(시간, 호수, 톤수 등) 제거
        cleanedLine = cleanedLine.replace(/\[?\d+호\]?|\d{1,2}:\d{2}|[1-9][0-9]?T|\d+층|\d+\s*호/g, " ");
        
        /**
         * [지능형 매칭 알고리즘]
         * 문장에서 내가 등록한 지역명(MEM_CENTERS)이 있는지 위치별로 찾습니다.
         */
        let matches = [];
        
        // 검색용 복사본
        let tempLine = cleanedLine.toUpperCase();

        sortedCenters.forEach(center => {
            const centerUpper = center.toUpperCase();
            
            // A. 이름 전체가 문장에 포함되어 있는지 먼저 체크
            let pos = tempLine.indexOf(centerUpper);
            
            // B. [그룹 매칭] 이름에 숫자가 포함된 경우 (예: "인천31.32.41.42")
            // 문자의 "인천32"에서 "32"라는 숫자만 뽑아 등록지 이름에 있는지 확인
            const numberMatch = cleanedLine.match(/\d+/); // 문장에서 숫자 추출
            if (pos === -1 && numberMatch) {
                const num = numberMatch[0];
                // 내 등록지에 "인천"이 있고 "32"도 있다면 매칭 성공
                if (center.includes(num) && (center.includes(cleanedLine.substring(0, 2)) || center.includes("인천") || center.includes("안성"))) {
                    pos = cleanedLine.indexOf(num);
                }
            }

            if (pos !== -1) {
                matches.push({ name: center, index: pos });
                // 중복 매칭 방지를 위해 찾은 자리를 공백으로 가림
                let placeholder = " ".repeat(center.length);
                tempLine = tempLine.substring(0, pos) + placeholder + tempLine.substring(pos + center.length);
            }
        });

        // 문장에서 나타난 순서대로 정렬 (먼저 나오는게 상차지)
        matches.sort((a, b) => a.index - b.index);

        let finalFrom = "";
        let finalTo = "";

        if (matches.length >= 2) {
            // 등록된 지명이 2개 이상 발견됨
            finalFrom = matches[0].name;
            finalTo = matches[1].name;
        } else {
            // 매칭 실패 시 수동 분리 (화살표 기준)
            const parts = cleanedLine.split(/->|>/).map(p => p.trim());
            if (parts.length >= 2) {
                finalFrom = matches[0]?.name || parts[0].split(/[(\s]/)[0];
                finalTo = parts[1].split(/[(\s]/)[0];
            } else {
                return; // 분석 불능
            }
        }

        // 4. 리스트 UI 생성
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

/**
 * 개별 리스트의 '운행 등록' 버튼 클릭 시 실행
 */
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
        liters: 0,
        unitPrice: 0,
        brand: "",
        expenseItem: "",
        supplyItem: "",
        mileage: 0
    };

    Data.addRecord(newRecord);
    
    btn.disabled = true;
    btn.textContent = "등록 완료";
    btn.style.background = "#bdc3c7";
    btn.closest('.sms-item-card').style.background = "#f0fdf4";
    btn.closest('.sms-item-card').style.border = "1px solid #28a745";

    Utils.showToast(`${from} → ${to} 등록되었습니다.`);

    if (window.updateAllDisplays) {
        window.updateAllDisplays();
    }
}