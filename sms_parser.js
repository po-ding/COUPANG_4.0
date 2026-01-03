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

    // 1. 건별 분리 로직 강화
    // 줄바꿈을 기준으로 나누되, 날짜(1.2)나 빈 줄, Web발신 등 의미 없는 줄은 필터링
    const lines = input.split('\n').filter(line => {
        const l = line.trim();
        return l.length > 5 && !/^\d+\.\d+$/.test(l) && !l.includes("Web발신");
    });

    let foundCount = 0;
    // 내 등록지 목록을 긴 이름 순서대로 정렬 (매칭 정확도 향상)
    const sortedCenters = [...Data.MEM_CENTERS].sort((a, b) => b.length - a.length);

    lines.forEach((line) => {
        let originalLine = line.trim();
        
        // 2. [노이즈 제거] 상하차 장소 외의 모든 데이터 제거
        // 층간이동(7층 -> 6층) 삭제
        let cleaned = originalLine.replace(/\d+층\s*->\s*\d+층/g, " ");
        // 시간(10:20), 톤수(5T, 11T), 호수([1호], 2 호) 삭제
        cleaned = cleaned.replace(/\[?\d+호\]?|\d{1,2}:\d{2}|[1-9][0-9]?T|\d+층|\d+\s*호/g, " ");
        // 불필요한 특수문자 제거 (괄호 안의 내용은 지명일 수 있으므로 괄호만 제거)
        cleaned = cleaned.replace(/[\[\]\(\)]/g, " ");

        // 3. [지능형 매칭 알고리즘]
        let matches = [];
        let tempText = cleaned.toUpperCase();

        sortedCenters.forEach(center => {
            const centerUpper = center.toUpperCase();
            
            // A. 직접 매칭 (내 목록의 이름이 문자에 포함된 경우)
            let pos = tempText.indexOf(centerUpper);
            if (pos !== -1) {
                matches.push({ name: center, index: pos });
                // 매칭된 부분은 지워서 중복 매칭 방지
                tempText = tempText.substring(0, pos) + " ".repeat(center.length) + tempText.substring(pos + center.length);
            } 
            // B. 지능형 숫자 매칭 (문자엔 "인천32", 내 목록엔 "인천31.32.41.42")
            else {
                // 문자의 숫자(예: 32)가 내 등록지 이름에 포함되어 있는지 확인
                const numInSms = cleaned.match(/\d+/g); 
                if (numInSms) {
                    numInSms.forEach(num => {
                        // 숫자가 등록지에 포함되어 있고, 앞 2글자(지역명)가 일치하면 매칭
                        const prefix = cleaned.trim().substring(0, 2);
                        if (center.includes(num) && center.includes(prefix)) {
                            // 이미 매칭된 위치가 아니면 추가
                            if (!matches.find(m => m.name === center)) {
                                matches.push({ name: center, index: cleaned.indexOf(num) });
                            }
                        }
                    });
                }
            }
        });

        // 문장에서 나타난 순서대로 정렬 (먼저 나오면 상차, 나중 나오면 하차)
        matches.sort((a, b) => a.index - b.index);

        let finalFrom = "";
        let finalTo = "";

        if (matches.length >= 2) {
            finalFrom = matches[0].name;
            finalTo = matches[1].name;
        } else {
            // 매칭 실패 시 Fallback (공백 기준 분리 후 첫 두 단어)
            const words = cleaned.split(/\s+/).filter(w => w.trim().length >= 2);
            if (words.length >= 2) {
                finalFrom = words[0];
                finalTo = words[1];
            } else {
                return; // 2개 미만이면 무시
            }
        }

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

    if(foundCount === 0) resultsDiv.innerHTML = "<p style='text-align:center; color:#666; font-size:0.9em;'>인식된 구간이 없습니다. 등록지 목록을 확인해주세요.</p>";
}

/**
 * 개별 리스트의 '운행 등록' 버튼 클릭 시 실행
 */
export function registerParsedTrip(btn, from, to) {
    const key = `${from}-${to}`;
    
    // 기존 데이터에서 운임/거리 자동 매칭
    const savedIncome = Data.MEM_FARES[key] || 0;
    const savedDistance = Data.MEM_DISTANCES[key] || 0;

    const newRecord = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: Utils.getTodayString(),
        time: "", // 시간은 비워둠
        type: "화물운송",
        from: from,
        to: to,
        distance: savedDistance,
        income: savedIncome,
        cost: 0,
        liters: 0, unitPrice: 0, brand: "", expenseItem: "", supplyItem: "", mileage: 0
    };

    Data.addRecord(newRecord);
    
    // UI 업데이트 (항목 리프레시 방지)
    btn.disabled = true;
    btn.textContent = "등록 완료";
    btn.style.background = "#bdc3c7";
    btn.closest('.sms-item-card').style.background = "#f0fdf4";

    Utils.showToast(`${from} → ${to} 등록되었습니다.`);

    if (window.updateAllDisplays) {
        window.updateAllDisplays();
    }
}