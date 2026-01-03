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

    // 1. 건별 분리 (날짜형식이나 Web발신, 혹은 빈 줄 기준)
    // 줄바꿈을 기준으로 한 줄씩 처리하되, 의미 없는 줄(날짜 등)은 거릅니다.
    const lines = input.split('\n'); 
    let foundCount = 0;

    // 내 지역 목록 정렬 (긴 이름 우선 매칭)
    const sortedCenters = [...Data.MEM_CENTERS].sort((a, b) => b.length - a.length);

    lines.forEach((line) => {
        let text = line.trim();
        // 너무 짧거나 날짜(1.2), Web발신 등은 무시
        if(!text || text.length < 5 || /^\d+\.\d+$/.test(text) || text.includes("Web발신")) return;
        
        // 2. [노이즈 제거] 상하차 정보 외의 모든 잡동사니 제거
        // 층간이동(7층 -> 6층), 시간(10:20), 톤수(5T), 호수([1호]) 등 제거
        let cleaned = text.replace(/\d+층\s*->\s*\d+층/g, " ");
        cleaned = cleaned.replace(/\[?\d+호\]?|\d{1,2}:\d{2}|[1-9][0-9]?T|\d+층|\d+\s*호/g, " ");
        // 괄호 안의 내용도 일단 공백으로 치환 (단, 안의 내용이 지명일 수 있으므로 주의)
        cleaned = cleaned.replace(/\(([^)]+)\)/g, " $1 ");

        // 3. [지능형 매칭] cleaned 문장에서 등록된 지명 찾기
        let matches = [];
        let tempText = cleaned.toUpperCase();

        sortedCenters.forEach(center => {
            const centerUpper = center.toUpperCase();
            let pos = tempText.indexOf(centerUpper);
            
            // 일반 매칭 성공 시
            if (pos !== -1) {
                matches.push({ name: center, index: pos });
                // 찾은 자리는 공백으로 지워서 중복 매칭 방지
                tempText = tempText.substring(0, pos) + " ".repeat(center.length) + tempText.substring(pos + center.length);
            } 
            // [그룹 매칭] 인천32 -> 인천31.32.41.42 자동 연결
            else {
                const numInText = cleaned.match(/\d+/); // 문자의 숫자(32)
                if (numInText && center.includes(numInText[0])) {
                    // 숫자가 등록명에 포함되어 있고, 앞 2글자가 지역명과 유사하면 매칭
                    const prefix = cleaned.substring(0, 2);
                    if (center.includes(prefix)) {
                        pos = cleaned.indexOf(numInText[0]);
                        matches.push({ name: center, index: pos });
                    }
                }
            }
        });

        // 문장에서 나타난 순서대로 정렬
        matches.sort((a, b) => a.index - b.index);

        // 상차지와 하차지(최소 2개)가 발견되어야 함
        if (matches.length < 2) {
            // 매칭 실패 시 공백 기준으로 잘라서 첫 단어, 두 번째 단어라도 시도
            const words = cleaned.split(/\s+/).filter(w => w.length > 1);
            if (words.length >= 2) {
                matches = [
                    { name: words[0], index: 0 },
                    { name: words[1], index: 1 }
                ];
            } else return;
        }

        const finalFrom = matches[0].name;
        const finalTo = matches[1].name;

        // 4. 결과 UI 생성 (중복 제거를 위해 set 사용 가능하나 여기선 생략)
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

    if(foundCount === 0) resultsDiv.innerHTML = "<p style='text-align:center; color:#666; font-size:0.9em;'>인식된 구간이 없습니다.</p>";
}

/**
 * 즉시 운행 등록 (새로고침 없음)
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
        liters: 0, unitPrice: 0, brand: "", expenseItem: "", supplyItem: "", mileage: 0
    };

    Data.addRecord(newRecord);
    
    // 버튼 상태만 변경하여 리프레시 방지
    btn.disabled = true;
    btn.textContent = "등록 완료";
    btn.style.background = "#bdc3c7";
    btn.closest('.sms-item-card').style.background = "#f0fdf4";

    Utils.showToast(`${from} → ${to} 등록되었습니다.`);

    if (window.updateAllDisplays) {
        window.updateAllDisplays();
    }
}