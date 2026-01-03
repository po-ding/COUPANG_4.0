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
        const line = block.trim();
        if(!line || line.length < 5 || /^\d+\.\d+$/.test(line)) return; 
        
        // 2. 불필요한 정보 제거 (층간 이동, 시간, 호수 등)
        let cleanedLine = line.replace(/\d+층\s*->\s*\d+층/g, " ");
        cleanedLine = cleanedLine.replace(/\[?\d+호\]?|\d{1,2}:\d{2}|[1-9][0-9]?T|\d+층|\d+\s*호/g, " ");

        /**
         * [핵심: 지능형 매칭 함수]
         * 문자의 "인천32물류센터" -> 내 등록지 "인천31.32.41.42" 연결
         */
        const findBestMatch = (fullText) => {
            // A. 문자에서 불필요한 수식어 제거 (어근 추출)
            const rootWord = fullText.replace(/물류센터|센터|HUB|하브/g, "").trim();
            
            // B. 등록지 목록에서 매칭 시도
            for (let center of sortedCenters) {
                // 1) 등록지 이름이 문자 어근에 포함되어 있는가? (예: 등록지 "인천"이 "인천32"에 포함)
                if (rootWord.includes(center)) return center;
                
                // 2) 혹은 등록지 이름(인천31.32.41.42)이 문자 어근(인천32)의 핵심 단어를 포함하는가?
                const baseName = center.substring(0, 2); // '인천', '안성' 등 앞 2글자
                if (rootWord.startsWith(baseName)) {
                    // 숫자까지 포함해서 더 정밀하게 체크 (예: '32'가 '31.32.41.42' 안에 있는지)
                    const digits = rootWord.match(/\d+/);
                    if (digits && center.includes(digits[0])) return center;
                    // 숫자가 없더라도 앞글자가 같으면 일단 매칭
                    if (!digits) return center;
                }
            }
            return null;
        };

        // 3. 상하차 구간 분리 시도 (화살표 기준)
        let fromPart = "", toPart = "";
        if (cleanedLine.includes("->")) {
            [fromPart, toPart] = cleanedLine.split("->");
        } else {
            // 화살표가 없으면 공백 기준으로 대략 분리
            const words = cleanedLine.split(/\s+/).filter(w => w.length > 1);
            fromPart = words[0] || "";
            toPart = words[1] || "";
        }

        // 4. 추출된 파트별 매칭 진행
        let finalFrom = findBestMatch(fromPart) || fromPart.split(/[(\s]/)[0];
        let finalTo = findBestMatch(toPart) || toPart.split(/[(\s]/)[0];

        if(!finalFrom || !finalTo) return;

        // 5. 리스트 UI 생성
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

    if(foundCount === 0) resultsDiv.innerHTML = "<p style='text-align:center; color:#666; font-size:0.9em;'>등록된 지역명과 일치하는 항목을 찾지 못했습니다.</p>";
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