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

    // 1. 의미 있는 줄만 필터링 (날짜줄, Web발신 제외)
    const lines = input.split('\n').filter(line => {
        const l = line.trim();
        return l.length > 5 && !/^\d+\.\d+$/.test(l) && !l.includes("Web발신");
    });

    let foundCount = 0;
    // 내 등록지 목록 (긴 이름 우선순위)
    const sortedCenters = [...Data.MEM_CENTERS].sort((a, b) => b.length - a.length);

    lines.forEach((line) => {
        let originalText = line.trim();
        
        // 2. [노이즈 제거 단계 - 매우 중요]
        // 상하차지와 관계없는 숫자 데이터를 먼저 삭제하여 오매칭(XRC11 등)을 원천 차단합니다.
        let cleaned = originalText.replace(/\d+층\s*->\s*\d+층/g, " "); // 층간이동 화살표 제거
        cleaned = cleaned.replace(/\[?\d+호\]?|\d+\s*호/g, " "); // [1호], 2 호 등 호수 제거 (오매칭 주범)
        cleaned = cleaned.replace(/\d{1,2}:\d{2}/g, " "); // 시간(10:20) 제거
        cleaned = cleaned.replace(/[1-9][0-9]?T/g, " "); // 톤수(5T) 제거
        cleaned = cleaned.replace(/\d+층/g, " "); // 단독 층수 제거

        // 3. [지능형 매칭 알고리즘]
        let matches = [];
        let searchQueue = cleaned.toUpperCase();

        // A. 1단계: 내 등록지 명칭이 문장에 통째로 있는지 검색 (정확도 1순위)
        sortedCenters.forEach(center => {
            const centerUpper = center.toUpperCase();
            let pos = searchQueue.indexOf(centerUpper);
            if (pos !== -1) {
                matches.push({ name: center, index: pos });
                // 매칭된 영역은 공백처리하여 중복 검색 방지
                searchQueue = searchQueue.substring(0, pos) + " ".repeat(center.length) + searchQueue.substring(pos + center.length);
            }
        });

        // B. 2단계: 그룹 매칭 (예: 문자 "인천32" -> 등록지 "인천31.32.41.42")
        // 아직 상하차지를 다 못 찾았을 경우에만 실행
        if (matches.length < 2) {
            sortedCenters.forEach(center => {
                // 이미 찾은 등록지는 스킵
                if (matches.find(m => m.name === center)) return;

                const digits = cleaned.match(/\d+/g); // 문자에 남은 숫자들 (예: 32)
                if (digits) {
                    digits.forEach(num => {
                        // 숫자가 등록지 이름에 포함되어 있고(32), 지역명(인천)이 문장에 있으면 매칭
                        const regionPrefix = center.substring(0, 2); 
                        if (center.includes(num) && cleaned.includes(regionPrefix)) {
                            let pos = cleaned.indexOf(num);
                            // 중복 위치 체크 후 추가
                            if (!matches.find(m => m.index === pos)) {
                                matches.push({ name: center, index: pos });
                            }
                        }
                    });
                }
            });
        }

        // 4. 문장 내 나타난 순서대로 정렬 (먼저 나오면 상차)
        matches.sort((a, b) => a.index - b.index);

        // 결과 확정
        let finalFrom = "";
        let finalTo = "";

        if (matches.length >= 2) {
            finalFrom = matches[0].name;
            finalTo = matches[1].name;
        } else {
            // 매칭 실패 시 Fallback (공백 기준 첫 단어들)
            const words = cleaned.split(/\s+/).filter(w => w.trim().length >= 2);
            if (words.length >= 2) {
                finalFrom = words[0];
                finalTo = words[1];
            } else return;
        }

        // 5. UI 출력
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

    if(foundCount === 0) resultsDiv.innerHTML = "<p style='text-align:center; color:#666; font-size:0.9em;'>구간을 분석하지 못했습니다. 등록된 지역명을 확인해주세요.</p>";
}

/**
 * 즉시 등록 함수 (원본 데이터 유지)
 */
export function registerParsedTrip(btn, from, to) {
    const key = `${from}-${to}`;
    const savedIncome = Data.MEM_FARES[key] || 0;
    const savedDistance = Data.MEM_DISTANCES[key] || 0;

    Data.addRecord({
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: Utils.getTodayString(),
        time: "", 
        type: "화물운송",
        from: from, to: to, distance: savedDistance, income: savedIncome,
        cost: 0, liters: 0, unitPrice: 0, brand: "", expenseItem: "", supplyItem: "", mileage: 0
    });
    
    btn.disabled = true;
    btn.textContent = "등록 완료";
    btn.style.background = "#bdc3c7";
    btn.closest('.sms-item-card').style.background = "#f0fdf4";

    Utils.showToast(`${from} → ${to} 등록되었습니다.`);
    if (window.updateAllDisplays) window.updateAllDisplays();
}