import { MEM_CENTERS } from './data.js';
import { updateAddressDisplay } from './ui.js';
import { showToast } from './utils.js';

export function parseSmsText() {
    const input = document.getElementById('sms-input')?.value;
    if (!input || !input.trim()) {
        showToast("텍스트를 입력해주세요.");
        return;
    }

    const resultsDiv = document.getElementById('sms-parse-results');
    if(!resultsDiv) return;

    resultsDiv.innerHTML = "";
    resultsDiv.classList.remove('hidden');

    const blocks = input.split(/\n\s*\n/); // 빈 줄 기준 분리
    let foundCount = 0;

    blocks.forEach((block, index) => {
        if(!block.trim() || block.includes("Web발신")) return;
        
        let cleanText = block.replace(/\[?\d+호\]?|\d+호|\d{1,2}:\d{2}|\d+T|\d+톤|\d+층\s*->\s*\d+층|\d+층/g, "").trim();
        const parts = cleanText.split(/,|\n/);
        if (parts.length < 2) return;

        const rawFrom = parts[0].trim();
        const rawTo = parts[1].trim();

        const findMatch = (str) => {
            const kor = str.match(/[가-힣0-9]{2,}/); 
            const key = kor ? kor[0] : null;
            return key ? MEM_CENTERS.find(c => c.includes(key)) : null;
        };

        const fMatch = findMatch(rawFrom);
        const tMatch = findMatch(rawTo);

        const itemDiv = document.createElement('div');
        itemDiv.style = "background:#f8f9fa; padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #ddd; font-size:0.85em; color:#333;";
        
        itemDiv.innerHTML = `
            <b>건 #${foundCount + 1} 분석 결과</b><br>
            상차: ${fMatch ? `<span style="color:green;">[기존] ${fMatch}</span>` : `<span style="color:red;">[신규] ${rawFrom}</span>`}<br>
            하차: ${tMatch ? `<span style="color:green;">[기존] ${tMatch}</span>` : `<span style="color:red;">[신규] ${rawTo}</span>`}<br>
            <button type="button" onclick="window.applyParsedSms('${(fMatch||rawFrom).replace(/'/g, "\\'")}', '${(tMatch||rawTo).replace(/'/g, "\\'")}')" style="padding:6px; margin-top:8px; width:100%; background:#fab005; color:black; border-radius:4px; border:none; cursor:pointer; font-weight:bold;">입력창 채우기</button>
        `;
        resultsDiv.appendChild(itemDiv);
        foundCount++;
    });

    if(foundCount === 0) resultsDiv.innerHTML = "분석된 구간이 없습니다.";
}

export function applyParsedSms(f, t) {
    const fromIn = document.getElementById('from-center');
    const toIn = document.getElementById('to-center');
    
    if (fromIn && toIn) {
        fromIn.value = f;
        toIn.value = t;
        fromIn.dispatchEvent(new Event('input'));
        toIn.dispatchEvent(new Event('input'));
        updateAddressDisplay();
        showToast("반영되었습니다.");
        document.getElementById('sms-parse-results')?.classList.add('hidden');
        const smsIn = document.getElementById('sms-input');
        if(smsIn) smsIn.value = "";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}