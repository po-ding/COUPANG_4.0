import * as Data from './data.js';
import * as Utils from './utils.js';

/**
 * [최종형] 문자 분석 - 지능형 매칭 및 오매칭 방지
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

    // 1. 배차 문자 건별 분리 (줄바꿈 기준 정밀 분석)
    const lines = input.split('\n').filter(line => {
        const l = line.trim();
        return l.length > 5 && !/^\d+\.\d+$/.test(l) && !l.includes("Web발신");
    });

    let foundCount = 0;
    // 내 등록지 목록 (글자수 긴 이름 우선순위로 정확도 확보)
    const sortedCenters = [...Data.MEM_CENTERS].sort((a, b) => b.length - a.length);

    lines.forEach((line) => {
        let originalText = line.trim();
        
        // 2. [오매칭 방지용 노이즈 삭제]
        // 지명 매칭에 방해되는 숫자 데이터를 미리 제거합니다.
        let cleaned = originalText.replace(/\d+층\s*->\s*\d+층/g, " "); // 7층->6층 삭제
        cleaned = cleaned.replace(/\[?\d+호\]?|\d+\s*호/g, " "); // [1호], 2 호 삭제 (XRC11 등 오인 방지)
        cleaned = cleaned.replace(/\d{1,2}:\d{2}/g, " "); // 시간(10:20) 삭제
        cleaned = cleaned.replace(/[1-9][0-9]?T/g, " "); // 톤수(5T, 11T) 삭제
        cleaned = cleaned.replace(/\d+층/g, " "); // 단독 층수 삭제

        // 3. [지능형 매칭 알고리즘]
        let matches = [];
        let searchQueue = cleaned.toUpperCase();

        // A. 1단계: 내 등록지 명칭이 문장에 통째로 포함되어 있는지 검색 (XRC13 등)
        sortedCenters.forEach(center => {
            const centerUpper = center.toUpperCase();
            let pos = searchQueue.indexOf(centerUpper);
            if (pos !== -1) {
                matches.push({ name: center, index: pos });
                // 매칭된 영역은 가려서 중복 검색 방지
                searchQueue = searchQueue.substring(0, pos) + " ".repeat(center.length) + searchQueue.substring(pos + center.length);
            }
        });

        // B. 2단계: 그룹 지능형 매칭 (인천32 -> 인천31.32.41.42)
        if (matches.length < 2) {
            const digitsInSms = cleaned.match(/\d+/g); // 문자에 남은 숫자 추출 (예: 32)
            if (digitsInSms) {
                digitsInSms.forEach(num => {
                    sortedCenters.forEach(center => {
                        if (matches.find(m => m.name === center)) return;
                        
                        // 지역명(인천, 안성 등)이 같고, 숫자가 그룹명에 포함되어 있으면 매칭
                        const prefix = center.substring(0, 2);
                        if (cleaned.includes(prefix) && center.includes(num)) {
                            let pos = cleaned.indexOf(num);
                            if (!matches.find(m => m.index === pos)) {
                                matches.push({ name: center, index: pos });
                            }
                        }
                    });
                });
            }
        }

        // 4. 문장 내 등장 순서대로 정렬 (먼저 나오면 상차)
        matches.sort((a, b) => a.index - b.index);

        let finalFrom = "";
        let finalTo = "";

        if (matches.length >= 2) {
            finalFrom = matches[0].name;
            finalTo = matches[1].name;
        } else {
            // 매칭 실패 시 Fallback (공백 기준 첫 두 단어)
            const words = cleaned.split(/\s+/).filter(w => w.trim().length >= 2);
            if (words.length >= 2) {
                finalFrom = words[0];
                finalTo = words[1];
            } else return;
        }

        // 5. UI 카드 생성
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

    if(foundCount === 0) resultsDiv.innerHTML = "<p style='text-align:center; color:#666; font-size:0.9em;'>정확한 구간을 분석하지 못했습니다. 등록지 이름을 확인해주세요.</p>";
}

/**
 * 즉시 등록 함수 (상태 유지 및 테이블 갱신)
 */
export function registerParsedTrip(btn, from, to) {
    const key = `${from}-${to}`;
    // 기존 운임 및 거리 정보 자동 로드
    const savedIncome = Data.MEM_FARES[key] || 0;
    const savedDistance = Data.MEM_DISTANCES[key] || 0;

    Data.addRecord({
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: Utils.getTodayString(),
        time: "", // 시간은 비워둠
        type: "화물운송",
        from: from, to: to, distance: savedDistance, income: savedIncome,
        cost: 0, liters: 0, unitPrice: 0, brand: "", expenseItem: "", supplyItem: "", mileage: 0
    });
    
    // UI 상태 변경 (리스트 유지)
    btn.disabled = true;
    btn.textContent = "등록 완료";
    btn.style.background = "#bdc3c7";
    btn.closest('.sms-item-card').style.background = "#f0fdf4";

    Utils.showToast(`${from} → ${to} 등록되었습니다.`);
    // 메인 테이블 즉시 업데이트
    if (window.updateAllDisplays) window.updateAllDisplays();
}