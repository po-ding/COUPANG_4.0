import { MEM_CENTERS, updateLocationData } from './data.js';
import { updateAddressDisplay } from './ui.js';
import { showToast } from './utils.js';

export function parseSmsText() {
    const input = document.getElementById('sms-input').value;
    if (!input.trim()) return;

    const resultsDiv = document.getElementById('sms-parse-results');
    resultsDiv.innerHTML = "";
    resultsDiv.classList.remove('hidden');

    const blocks = input.split(/\n\s*\n/); // 빈 줄 기준 건별 분리
    
    blocks.forEach((block, index) => {
        if(!block.trim() || block.includes("Web발신")) return;
        
        // 1. 노이즈 제거 (호수, 시간, 톤수, 층수 이동)
        let cleanText = block.replace(/\[?\d+호\]?|\d+호|\d{1,2}:\d{2}|\d+T|\d+톤|\d+층\s*->\s*\d+층|\d+층/g, "").trim();
        
        // 2. 쉼표 기준 상/하차지 분리
        const parts = cleanText.split(",");
        if (parts.length < 2) return;

        const rawFrom = parts[0].trim();
        const rawTo = parts[1].trim();

        // 3. 매칭 로직 (한글 3자 또는 영어 3자)
        const findMatch = (str) => {
            const kor = str.match(/[가-힣0-9]{3,}/);
            const eng = str.match(/[a-zA-Z]{3,}/);
            const key = kor ? kor[0] : (eng ? eng[0] : null);
            return key ? MEM_CENTERS.find(c => c.includes(key)) : null;
        };

        const fMatch = findMatch(rawFrom);
        const tMatch = findMatch(rawTo);

        const itemDiv = document.createElement('div');
        itemDiv.style = "background:white; padding:10px; border-radius:5px; margin-bottom:10px; border:1px solid #ddd; font-size:0.85em;";
        
        itemDiv.innerHTML = `
            <b>건 #${index} 분석 결과</b><br>
            상차: ${fMatch ? `<span style="color:green;">[기존] ${fMatch}</span>` : `<span style="color:red;">[신규] ${rawFrom}</span>`}<br>
            하차: ${tMatch ? `<span style="color:green;">[기존] ${tMatch}</span>` : `<span style="color:red;">[신규] ${rawTo}</span>`}<br>
            <button type="button" onclick="window.applyParsedSms('${(fMatch||rawFrom).replace(/'/g, "\\'")}', '${(tMatch||rawTo).replace(/'/g, "\\'")}')" style="padding:4px; margin-top:5px; width:100%; background:#fab005; color:black; border-radius:4px; border:none; cursor:pointer;">입력창 채우기</button>
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

        // main.js의 handleLocationInput(운임/거리 자동로드) 트리거를 위한 이벤트 발생
        fromIn.dispatchEvent(new Event('input'));
        toIn.dispatchEvent(new Event('input'));

        updateAddressDisplay();
        showToast("입력창에 반영되었습니다.");
        document.getElementById('sms-parse-results').classList.add('hidden');
        document.getElementById('sms-input').value = "";
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}