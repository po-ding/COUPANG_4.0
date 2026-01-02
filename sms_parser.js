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

    // 1. 건별 분리 (빈 줄 또는 Web발신 기준)
    const blocks = input.split(/\n\s*\n|Web발신/); 
    let foundCount = 0;

    blocks.forEach((block) => {
        if(!block.trim()) return;
        
        // 2. 불필요한 정보 제거 (시간, 호수, 톤수 등)
        let cleanText = block.replace(/\[?\d+호\]?|\d{1,2}:\d{2}|\d+T|\d+톤|\d+층|상차:|하차:|상차지:|하차지:/g, " ").trim();
        
        // 3. 상하차지 분리 (쉼표, 화살표, 줄바꿈, 다중공백 기준)
        let parts = cleanText.split(/,|\s*->\s*|\s*>\s*|\n|\s{2,}/);
        
        // 공백 하나로만 구분된 경우 대비
        if (parts.length < 2) parts = cleanText.split(/\s+/);

        const validParts = parts.map(p => p.trim()).filter(p => p.length >= 2);
        if (validParts.length < 2) return; 

        let rawFrom = validParts[0];
        let rawTo = validParts[1];

        // 4. 이름 치환 로직: 기존 등록지(MEM_CENTERS)에 있는 이름인지 확인
        const matchRegisteredName = (name) => {
            // 기존 등록된 이름들 중 문자의 단어가 포함되거나, 등록된 이름이 문자의 단어를 포함하는 경우 검색
            const matched = Data.MEM_CENTERS.find(center => 
                name.includes(center) || center.includes(name)
            );
            return matched || name; // 매칭되는게 있으면 기존 등록명, 없으면 문자 그대로 사용
        };

        const finalFrom = matchRegisteredName(rawFrom);
        const finalTo = matchRegisteredName(rawTo);

        // 5. 결과 리스트 UI 생성
        const itemDiv = document.createElement('div');
        itemDiv.className = "sms-item-card";
        itemDiv.style = "background:white; padding:12px; border-radius:6px; margin-bottom:10px; border:1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05);";
        
        itemDiv.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:0.95em; color:#333;">
                    <span style="font-weight:bold; color:#007bff;">${finalFrom}</span>
                    <span style="margin:0 5px; color:#999;">→</span>
                    <span style="font-weight:bold; color:#dc3545;">${finalTo}</span>
                </div>
                <button type="button" 
                    onclick="window.registerParsedTrip(this, '${finalFrom.replace(/'/g, "\\'")}', '${finalTo.replace(/'/g, "\\'")}')" 
                    style="background:#28a745; color:white; border:none; padding:8px 12px; border-radius:4px; font-size:0.85em; cursor:pointer; font-weight:bold; width:auto;">
                    운행 등록
                </button>
            </div>
        `;
        resultsDiv.appendChild(itemDiv);
        foundCount++;
    });

    if(foundCount === 0) resultsDiv.innerHTML = "<p style='text-align:center; color:#666;'>분석된 구간이 없습니다.</p>";
}

/**
 * 분석 리스트에서 즉시 저장 (새로고침 없음)
 */
export function registerParsedTrip(btn, from, to) {
    const key = `${from}-${to}`;
    
    // 기존 데이터에서 해당 구간의 운임과 거리 가져오기
    const savedIncome = Data.MEM_FARES[key] || 0;
    const savedDistance = Data.MEM_DISTANCES[key] || 0;

    const newRecord = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: Utils.getTodayString(),
        time: "", // 시간은 입력하지 않음
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

    // 데이터 추가 및 저장
    Data.addRecord(newRecord);
    
    // 버튼 및 카드 상태 변경 (UI 피드백)
    btn.disabled = true;
    btn.textContent = "등록 완료";
    btn.style.background = "#bdc3c7";
    btn.closest('.sms-item-card').style.background = "#f9f9f9";
    btn.closest('.sms-item-card').style.border = "1px solid #28a745";

    Utils.showToast(`${from} -> ${to} 등록되었습니다.`);

    // 메인 화면 테이블 즉시 갱신 (전체 리프레시 아님)
    if (window.updateAllDisplays) {
        window.updateAllDisplays();
    }
}