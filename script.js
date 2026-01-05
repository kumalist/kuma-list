// ===============================================
// ▼ script.js 아래쪽 generateImage 관련 함수들 교체 ▼
// ===============================================

// 1. 둥근 사각형 그리기 헬퍼 함수
function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

// 2. 폰트 로딩 함수 (이미지에서 글씨 깨짐 방지)
async function loadFont(name, url) {
    const font = new FontFace(name, `url(${url})`);
    await font.load();
    document.fonts.add(font);
}

// 3. 이미지 생성 함수 (최종 수정판)
async function generateImage() {
    const ids = [...checkedItems[currentTab]];
    if (ids.length === 0) return alert("선택된 인형이 없어요!");
    
    const showName = document.getElementById('showName').checked;
    const showPrice = document.getElementById('showPrice').checked;
    const btn = document.getElementById('genBtn');
    const originalText = btn.innerText;

    btn.innerText = "폰트 로딩 중...";
    btn.disabled = true;

    try {
        // 주아체 폰트 로딩
        await loadFont('Jua', 'https://fonts.gstatic.com/s/jua/v14/co364W5X5_Y8yykk.woff2');
        btn.innerText = "이미지 생성 중...";

        const items = ids.map(id => productData.find(p => p.id === id)).filter(p => p);
        const cvs = document.createElement('canvas');
        const ctx = cvs.getContext('2d');

        // ★ [수정 3] 동적 폭 조절: 아이템이 4개보다 적으면 그 개수만큼만 폭 설정
        const cols = Math.min(items.length, 4); 
        const rows = Math.ceil(items.length / cols);

        const cardW = 300, cardH = 420;
        const gap = 30, padding = 60;
        
        // ★ [수정 2] 타이틀 여백 조정: 헤더 높이를 200으로 설정하고 글자를 정중앙에 배치할 예정
        const headerH = 200; 
        const cornerRadius = 40; // ★ [수정 4] 라운드 반경

        // 캔버스 크기 설정
        cvs.width = padding * 2 + (cardW * cols) + (gap * (cols - 1));
        cvs.height = headerH + padding * 2 + (cardH * rows) + (gap * (rows - 1));

        // ★ [수정 4] 전체 라운드 효과 (클리핑)
        roundedRect(ctx, 0, 0, cvs.width, cvs.height, cornerRadius);
        ctx.clip(); // 이 아래로는 둥근 영역 안쪽에만 그려짐

        // 배경색 채우기
        ctx.fillStyle = "#fdfbf7";
        ctx.fillRect(0, 0, cvs.width, cvs.height);

        // ★ [수정 5] 테마 통일: 위시리스트여도 무조건 '보유(파랑)' 색상(#aeb4d1) 사용
        // 나중에 테마 기능 넣을 때 여기를 변수로 바꾸면 됨!
        ctx.fillStyle = "#aeb4d1"; 
        
        // 타이틀 그리기 (가운데 정렬 + 수직 중앙 정렬)
        ctx.font = "bold 70px 'Jua', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; // ★ [수정 2] 글자 높이 기준을 가운데로 변경
        
        // 제목 내용도 통일할지, 아니면 '위시리스트'라고 띄울지는 선택 (일단 텍스트는 구분함)
        const titleText = currentTab === 'owned' ? "내 농담곰 컬렉션" : "농담곰 위시리스트";
        ctx.fillText(titleText, cvs.width / 2, headerH / 2); // 헤더의 정중앙(높이 100지점)에 배치

        const loadImage = (src) => new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = src;
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
        });

        // 카드 그리기
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const c = i % cols;
            const r = Math.floor(i / cols);
            const x = padding + c * (cardW + gap);
            const y = headerH + padding + r * (cardH + gap); // 헤더 높이만큼 띄우고 시작

            ctx.save();
            roundedRect(ctx, x, y, cardW, cardH, 20); // 카드 둥글게
            ctx.fillStyle = "white";
            ctx.shadowColor = "rgba(0,0,0,0.1)";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 5;
            ctx.fill();
            
            ctx.shadowColor = "transparent";
            ctx.strokeStyle = "#eae8e4";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.clip();

            // 이미지 그리기
            const img = await loadImage(item.image);
            if (img) {
                const aspect = img.width / img.height;
                let dw = 260, dh = 260;
                if (aspect > 1) dh = dw / aspect; else dw = dh * aspect;
                ctx.drawImage(img, x + (cardW - dw)/2, y + 30 + (260 - dh)/2, dw, dh);
            }
            ctx.restore();

            // 텍스트 그리기
            if (showName) {
                ctx.textAlign = "center";
                ctx.textBaseline = "alphabetic"; // 다시 기본값으로 복구
                ctx.fillStyle = "#2d3436";
                ctx.font = "bold 22px 'Gowun Dodum', sans-serif";
                const name = item.nameKo;
                const words = name.split(' ');
                let line = '', lineY = y + 320;
                for(let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + ' ';
                    if (ctx.measureText(testLine).width > 260 && n > 0) {
                        ctx.fillText(line, x + cardW/2, lineY);
                        line = words[n] + ' '; lineY += 28;
                    } else { line = testLine; }
                }
                ctx.fillText(line, x + cardW/2, lineY);
            }

            if (showPrice) {
                ctx.fillStyle = "#a4b0be";
                ctx.font = "bold 18px 'Gowun Dodum', sans-serif";
                const priceY = showName ? y + 395 : y + 340; 
                ctx.fillText(item.price, x + cardW/2, priceY);
            }
        }

        // 다운로드
        const link = document.createElement('a');
        link.download = `nongdam_${currentTab}_list.png`;
        link.href = cvs.toDataURL('image/png');
        link.click();

    } catch (err) {
        alert("오류 발생: " + err.message);
        console.error(err);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
