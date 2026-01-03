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

    const lines = input.split('\n'); 
    let foundCount = 0;
    const sortedCenters = [...Data.MEM_CENTERS].sort((a, b) => b.length - a.length);

    lines.forEach((line) => {
        let text = line.trim();
        if(!text || text.length < 5 || /^\d+\.\d+$/.test(text) || text.includes("Web발신")) return;
        
        // 층간 이동 및 불필요한 기호 제거
        let cleaned = text.replace(/\d+층\s*->\s*\d+층/g, " ");
        cleaned = cleaned.replace(/\[?\d+호\]?|\d{1,2}:\d{2}|[1-9][0-9]?T|\d+층|\d+\s*호/g, " ");
        cleaned = cleaned.replace(/\(([^)]+)\)/g, " $1 ");

        let matches = [];
        let tempText = cleaned.toUpperCase();

        sortedCenters.forEach(center => {
            const centerUpper = center.toUpperCase();
            let pos = tempText.indexOf(centerUpper);
            
            if (pos !== -1) {
                matches.push({ name: center, index: pos });
                tempText = tempText.substring(0, pos) + " ".repeat(center.length) + tempText.substring(pos + center.length);
            } 
            else {
                // 숫자가 포함된 지능형 매칭 (예: 인천32)
                const numMatch = cleaned.match(/\d+/); 
                if (numMatch && center.includes(numMatch[0])) {
                    const prefix = cleaned.substring(0, 2);
                    if (center.includes(prefix)) {
                        pos = cleaned.indexOf(numMatch[0]);
                        matches.push({ name: center, index: pos });
                    }
                }
            }
        });

        matches.sort((a, b) => a.index - b.index);

        if (matches.length < 2) {
            const words = cleaned.split(/\s+/).filter(w => w.length > 1);
            if (words.length >= 2) {
                matches = [{ name: words[0], index: 0 }, { name: words[1], index: 1 }];
            } else return;
        }

        const finalFrom = matches[0].name;
        const finalTo = matches[1].name;

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

export function registerParsedTrip(btn, from, to) {
    const key = `${from}-${to}`;
    const savedIncome = Data.MEM_FARES[key] || 0;
    const savedDistance = Data.MEM_DISTANCES[key] || 0;

    Data.addRecord({
        id: Date.now() + Math.floor(Math.random() * 1000),
        date: Utils.getTodayString(),
        time: "", 
        type: "화물운송",
        from: from,
        to: to,
        distance: savedDistance,
        income: savedIncome,
        cost: 0, liters: 0, unitPrice: 0, brand: "", expenseItem: "", supplyItem: "", mileage: 0
    });
    
    btn.disabled = true;
    btn.textContent = "등록 완료";
    btn.style.background = "#bdc3c7";
    btn.closest('.sms-item-card').style.background = "#f0fdf4";

    Utils.showToast(`${from} → ${to} 등록되었습니다.`);
    if (window.updateAllDisplays) window.updateAllDisplays();
}