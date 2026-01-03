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
    // 제공된 샘플처럼 한 줄 띄어쓰기로 구분된 경우를 모두 잡습니다.
    const blocks = input.split(/\n\s*\n|\[Web발신\]|Web발신/); 
    let foundCount = 0;

    blocks.forEach((block) => {
        const line = block.trim();
        if(!line || line.length < 5) return; // 너무 짧거나 빈 줄 패스
        
        // 2. 상/하차 구간 대략적 분리
        // "->" 기호가 있으면 그것을 기준으로, 없으면 공백을 기준으로 분리 시도
        let fromPart = "";
        let toPart = "";

        if (line.includes("->")) {
            const splitPoint = line.split("->");
            fromPart = splitPoint[0];
            toPart = splitPoint[1];
        } else {
            // 화살표가 없는 경우 (예: XRC12(LGL) 고양1센터) 
            // 단어들을 배열로 만들어 앞부분을 상차, 뒷부분을 하차로 추정
            const words = line.split(/\s+/).filter(w => !w.match(/\d{1,2}:\d{2}|[1-9]T|\d+층|\d+호/));
            if (words.length >= 2) {
                fromPart = words[0];
                toPart = words[1];
            }
        }

        /**
         * [핵심 매칭 로직] 
         * 문자에 "XRC13(판토스)"가 있어도 내 리스트에 "XRC13"이 있다면 "XRC13"을 선택
         */
        const extractRegisteredName = (text) => {
            if(!text) return "";
            // 불필요한 기호 제거
            let clean = text.replace(/\[|\]|\(|\)/g, " ").trim();
            
            // 내 지역 목록(MEM_CENTERS) 중에서 이 문장에 포함된 단어가 있는지 전수 조사
            // 긴 이름부터 매칭하여 정확도를 높임
            const sortedCenters = [...Data.MEM_CENTERS].sort((a, b) => b.length - a.length);
            const matched = sortedCenters.find(center => 
                line.toUpperCase().includes(center.toUpperCase()) && text.toUpperCase().includes(center.toUpperCase())
            );
            
            if (matched) return matched;

            // 매칭되는게 없으면 괄호나 공백 앞의 첫 단어만 추출
            return text.split(/[(\s]/)[0].replace(/\[|\]/g, "").trim();
        };

        const finalFrom = extractRegisteredName(fromPart);
        const finalTo = extractRegisteredName(toPart);

        if(!finalFrom || !finalTo || finalFrom === finalTo) return;

        // 3. 리스트 항목 생성
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

    if(foundCount === 0) resultsDiv.innerHTML = "<p style='text-align:center; color:#666; font-size:0.9em;'>인식된 구간이 없습니다. 지역 명칭을 확인해주세요.</p>";
}

/**
 * 개별 리스트의 '운행 등록' 버튼 클릭 시 실행
 * 시간 입력 안함, 리프레시 없음
 */
export function registerParsedTrip(btn, from, to) {
    const key = `${from}-${to}`;
    
    // 기존에 등록된 이력이 있다면 운임과 거리를 자동 연동
    const savedIncome = Data.MEM_FARES[key] || 0;
    const savedDistance = Data.MEM_DISTANCES[key] || 0;

    const newRecord = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: Utils.getTodayString(),
        time: "", // 시간은 비워둠 (상세에서 수정)
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

    // 1. 데이터 저장
    Data.addRecord(newRecord);
    
    // 2. 버튼 상태 업데이트 (항목 리프레시 방지)
    btn.disabled = true;
    btn.textContent = "등록 완료";
    btn.style.background = "#bdc3c7";
    btn.closest('.sms-item-card').style.background = "#f0fdf4";
    btn.closest('.sms-item-card').style.border = "1px solid #28a745";

    Utils.showToast(`${from} → ${to} 등록되었습니다.`);

    // 3. 메인 화면 테이블 즉시 갱신 (전체 리프레시 아님)
    if (window.updateAllDisplays) {
        window.updateAllDisplays();
    }
}