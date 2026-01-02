import { MEM_CENTERS } from './data.js';
import { updateAddressDisplay } from './ui.js';
import { showToast } from './utils.js';

export function parseSmsText() {
    const smsInput = document.getElementById('sms-input');
    const input = smsInput ? smsInput.value : "";
    if (!input.trim()) {
        showToast("텍스트를 입력해주세요.");
        return;
    }

    const resultsDiv = document.getElementById('sms-parse-results');
    if(!resultsDiv) return;
    resultsDiv.innerHTML = "";
    resultsDiv.classList.remove('hidden');

    const blocks = input.split(/\n\s*\n/); // 빈 줄 기준 건별 분리
    
    blocks.forEach((block, index) => {
        if(!block.trim() || block.includes("Web발신")) return;
        
        // 1. 노이즈 제거
        let cleanText = block.replace(/\[?\d+호\]?|\d+호|\d{1,2}:\d{2}|\d+T|\d+톤|\d+층\s*->\s*\d+층|\d+층/g, "").trim();
        
        // 2. 쉼표 또는 줄바꿈 기준 분리
        const parts = cleanText.split(/,|\n/);
        if (parts.length < 2) return;

        const rawFrom = parts[0].trim();
        const rawTo = parts[1].trim();

        // 3. 매칭 로직
        const findMatch = (str) => {
            const kor = str.match(/[가-힣0-9]{2,}/);
            const key = kor ? kor[0] : null;
            return key ? MEM_CENTERS.find(c => c.includes(key)) : null;
        };

        const fMatch = findMatch(rawFrom);
        const tMatch = findMatch(rawTo);

        const itemDiv = document.createElement('div');
        itemDiv.style = "background:white; padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #ddd; font-size:0.85em; color:#333;";
        
        itemDiv.innerHTML = `
            <b>건 #${index + 1} 분석 결과</b><br>
            상차: ${fMatch ? `<span style="color:green; font-weight:bold;">[기존] ${fMatch}</span>` : `<span style="color:red;">[신규] ${rawFrom}</span>`}<br>
            하차: ${tMatch ? `<span style="color:green; font-weight:bold;">[기존] ${tMatch}</span>` : `<span style="color:red;">[신규] ${rawTo}</span>`}<br>
            <button type="button" onclick="window.applyParsedSms('${(fMatch||rawFrom).replace(/'/g, "\\'")}', '${(tMatch||rawTo).replace(/'/g, "\\'")}')" style="padding:6px; margin-top:8px; width:100%; background:#fab005; color:black; border-radius:4px; border:none; cursor:pointer; font-weight:bold;">입력창 채우기</button>
        `;
        resultsDiv.appendChild(itemDiv);
    });
}

export function applyParsedSms(f, t) {
    const fromIn = document.getElementById('from-center');
    const toIn = document.getElementById('to-center');
    
    if (fromIn && toIn) {
        fromIn.value = f;
        toIn.value = t;

        // 인풋 이벤트 발생시켜서 메인 화면의 운임/거리 자동로드 트리거
        fromIn.dispatchEvent(new Event('input'));
        toIn.dispatchEvent(new Event('input'));

        updateAddressDisplay();
        showToast("반영되었습니다.");
        
        const resDiv = document.getElementById('sms-parse-results');
        const smsIn = document.getElementById('sms-input');
        if(resDiv) resDiv.classList.add('hidden');
        if(smsIn) smsIn.value = "";
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}