
// script.js (최종 수정본)

// [설정] 구글 스프레드시트 ID
const SHEET_ID = '1hTPuwTZkRnPVoo5GUUC1fhuxbscwJrLdWVG-eHPWaIM';

// 데이터가 로드될 변수
let productData = [];

let currentTab = 'owned'; 
let filters = { country: 'all', character: 'all' }; 
let isViewCheckedOnly = false; 

let checkedItems = {
    owned: new Set(JSON.parse(localStorage.getItem('nongdam_owned') || '[]')),
    wish: new Set(JSON.parse(localStorage.getItem('nongdam_wish') || '[]'))
};

const listContainer = document.getElementById('listContainer');
const mainContent = document.getElementById('mainContent'); 
const scrollTopBtn = document.getElementById('scrollTopBtn'); 

// 초기화 함수
async function init() {
    await fetchData(); 
    renderList();
    updateTabUI();
    
    // 스크롤 이벤트
    mainContent.addEventListener('scroll', scrollFunction);

    // [PC 버그 수정] 체크박스 이벤트 리스너 강제 등록
    const viewCheckInput = document.getElementById('viewCheckedOnly');
    if (viewCheckInput) {
        viewCheckInput.addEventListener('change', toggleViewChecked);
    }
}

// 구글 시트 CSV 데이터 가져오기
async function fetchData() {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("네트워크 응답이 올바르지 않습니다.");
        
        const text = await response.text();
        productData = parseCSV(text);
        
        console.log("데이터 로드 성공:", productData.length + "개");
    } catch (error) {
        console.error("데이터 로드 실패:", error);
        listContainer.innerHTML = `<div style="text-align:center; padding:50px; color:#aaa; line-height:1.6;">
            데이터를 불러오지 못했습니다.<br>
            <span style="font-size:12px;">(컴퓨터 파일로 열었다면 Github에 올려서 확인해주세요!)</span>
        </div>`;
    }
}

// CSV 파싱 함수
function parseCSV(csvText) {
    const rows = csvText.split('\n').map(row => {
        const regex = /(?:^|,)(\"(?:[^\"]+|\"\")*\"|[^,]*)/g;
        let columns = [];
        let match;
        while (match = regex.exec(row)) {
            let col = match[1].replace(/^"|"$/g, '').replace(/""/g, '"');
            columns.push(col.trim());
        }
        return columns;
    });

    const headers = rows[0]; 
    const data = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < headers.length) continue;

        const item = {};
        headers.forEach((header, index) => {
            let value = row[index];
            item[header] = value;
        });
        
        if(item.id) data.push(item);
    }
    return data;
}

function switchTab(tab) {
    currentTab = tab;
    
    if (tab === 'wish') { 
        document.body.classList.add('theme-wish'); 
    } else { 
        document.body.classList.remove('theme-wish'); 
    }
    
    // [수정] 모아보기 버튼 텍스트 변경 (내 콜렉션 / 내 위시)
    const viewCheckText = document.getElementById('viewCheckText');
    if (viewCheckText) {
        viewCheckText.innerText = tab === 'owned' ? "내 콜렉션 모아보기" : "내 위시 모아보기";
    }
    
    updateTabUI();
    renderList();

    const titleInput = document.getElementById('customTitle');
    if(titleInput) {
        titleInput.value = tab === 'owned' ? "농담곰 인형 보유 리스트" : "농담곰 인형 위시 리스트";
    }

    const badge = document.getElementById('mobileModeBadge');
    if (badge) {
        badge.innerText = tab === 'owned' ? "보유" : "위시";
    }
}

function updateTabUI() {
    document.querySelectorAll('.tab-btn').forEach(btn => { btn.classList.toggle('active', btn.dataset.tab === currentTab); });
}

// 체크한 것만 모아보기 토글 함수
function toggleViewChecked() {
    const checkbox = document.getElementById('viewCheckedOnly');
    isViewCheckedOnly = checkbox.checked;
    renderList();
}

// [핵심 수정] 리스트 렌더링 함수
function renderList() {
    listContainer.innerHTML = '';
    
    const filteredData = getFilteredData(); 

    if (filteredData.length === 0) {
        if (productData.length === 0) return; 
        listContainer.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;">해당하는 농담곰이 없어요 😢</div>';
        return;
    }

    const grouped = {};
    filteredData.forEach(item => {
        let groupKey;
        if (filters.character === 'ngn' && item.subGroup) {
            groupKey = item.subGroup;
        } else {
            groupKey = item.group;
        }
        if (!grouped[groupKey]) grouped[groupKey] = [];
        grouped[groupKey].push(item);
    });

    let hasAnyItem = false; 

    Object.keys(grouped).forEach(groupName => {
        const groupItems = grouped[groupName];
        
        let totalCount = groupItems.length;
        let checkedCount = 0;

        // [수정] 무조건 '보유(owned)' 리스트에 있는 것만 카운트
        // 위시리스트 탭이어도 보유한 수량만 표시됨
        groupItems.forEach(item => {
            if (checkedItems.owned.has(item.id)) {
                checkedCount++;
            }
        });

        const grid = document.createElement('div');
        grid.className = 'items-grid';
        let visibleItemCount = 0;

        groupItems.forEach(item => {
            const isOwned = checkedItems.owned.has(item.id); 
            let isChecked = false;
            let isLocked = false; 

            if (currentTab === 'owned') {
                isChecked = isOwned;
            } else {
                if (isOwned) {
                    isChecked = true;
                    isLocked = true; 
                } else {
                    isChecked = checkedItems.wish.has(item.id);
                }
            }

            // '체크한 것만 보기' 필터링 (표시 여부 결정)
            if (isViewCheckedOnly && !isChecked) {
                return; 
            }

            // [수정 핵심] '모아보기' 모드에서는 체크된 아이템이라도
            // 시각적으로는 원본(체크 안 된 상태)처럼 보여주고 클릭을 막음
            if (isViewCheckedOnly) {
                isChecked = false; // 시각적 체크 해제
                isLocked = false; // 락 해제 (보유 중인 위시템도 원본으로 감상)
            }

            visibleItemCount++;

            const card = document.createElement('div');
            card.className = `item-card ${isChecked ? 'checked' : ''} ${isLocked ? 'owned-in-wish' : ''}`;
            
            // [수정] 모아보기 모드일 때는 클릭 이벤트 아예 없음 (감상용)
            if (!isViewCheckedOnly) {
                card.onclick = () => {
                    if (isLocked) return; 
                    toggleCheck(item.id, card);
                };
            } else {
                // 모아보기 모드: 커서 기본으로 변경
                card.style.cursor = 'default';
            }

            card.innerHTML = `
                <div class="item-img-wrapper">
                    <img src="${item.image}" alt="${item.nameKo}" loading="lazy">
                    <div class="check-overlay"></div>
                </div>
                <div class="item-info">
                    <div class="item-name">${item.nameKo}</div>
                    <div class="item-price">${item.price}</div>
                </div>
            `;
            grid.appendChild(card);
        });

        if (visibleItemCount > 0) {
            hasAnyItem = true;
            const title = document.createElement('h3');
            title.className = 'group-title';
            // 카운트 표시 (보유수량 / 전체수량)
            title.innerHTML = `${groupName} <span class="group-count">(${checkedCount}/${totalCount})</span>`;
            
            listContainer.appendChild(title);
            listContainer.appendChild(grid);
        }
    });

    if (!hasAnyItem && isViewCheckedOnly) {
        listContainer.innerHTML = '<div style="text-align:center; padding:50px; color:#aaa;">체크된 인형이 없습니다.</div>';
    }
}

function getFilteredData() {
    return productData.filter(item => {
        if (filters.country !== 'all' && item.country !== filters.country) return false;
        if (filters.character !== 'all' && item.character !== filters.character) return false;
        return true;
    });
}

function toggleCheck(id, cardElement) {
    if (checkedItems[currentTab].has(id)) { 
        checkedItems[currentTab].delete(id); 
        cardElement.classList.remove('checked'); 
    } else { 
        checkedItems[currentTab].add(id); 
        cardElement.classList.add('checked'); 
    }
    saveData();
    
    // 상태 변경 시 리스트 다시 그리기
    renderList();
}

function saveData() { localStorage.setItem(`nongdam_${currentTab}`, JSON.stringify([...checkedItems[currentTab]])); }

function setFilter(type, value) {
    filters[type] = value;
    const parentWrapper = event.currentTarget.closest('.filter-item-wrapper');
    if (parentWrapper) {
        parentWrapper.querySelectorAll('.flag-btn, .char-btn, .text-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }
    event.currentTarget.classList.add('active');
    renderList();
}

function resetFilters() {
    filters = { country: 'all', character: 'all' }; 
    document.querySelectorAll('.flag-btn, .char-btn, .text-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('button[onclick*="all"]').forEach(btn => btn.classList.add('active'));
    
    isViewCheckedOnly = false;
    const chk = document.getElementById('viewCheckedOnly');
    if(chk) chk.checked = false;

    renderList();
}

function resetRecords() {
    const listName = currentTab === 'owned' ? '보유' : '위시';
    if (confirm(`${listName} 리스트의 체크 기록을 모두 삭제하시겠습니까?`)) {
        checkedItems[currentTab].clear();
        saveData();
        renderList();
        alert(`${listName} 리스트를 초기화했습니다.`);
    }
}

function toggleNickCheck() {
    const nickInput = document.getElementById('nickInput');
    const nickCheck = document.getElementById('showNick');
    
    if (nickInput.value.trim().length > 0) {
        nickCheck.checked = true;
    } else {
        nickCheck.checked = false;
    }
}

function scrollFunction() {
    if (mainContent.scrollTop > 300) {
        scrollTopBtn.style.display = "block";
        setTimeout(() => scrollTopBtn.style.opacity = "1", 10);
    } else {
        scrollTopBtn.style.opacity = "0";
        setTimeout(() => scrollTopBtn.style.display = "none", 300);
    }
}

function scrollToTop() {
    mainContent.scrollTo({ top: 0, behavior: 'smooth' });
}

// [이미지 생성 함수]
async function generateImage(mode = 'all') {
    let sourceData = [];

    if (mode === 'all') {
        sourceData = productData;
    } else {
        sourceData = getFilteredData();
    }

    const items = sourceData.filter(p => {
        const isChecked = checkedItems[currentTab].has(p.id);
        if (currentTab === 'wish' && checkedItems.owned.has(p.id)) {
            return false; 
        }
        return isChecked;
    });

    if (items.length === 0) return alert("저장할 위시 아이템이 없습니다.\n(보유한 인형은 제외됩니다)");
    
    await document.fonts.ready;

    const showName = document.getElementById('showName').checked;
    const showPrice = document.getElementById('showPrice').checked;
    const showNick = document.getElementById('showNick').checked;
    const showTitle = document.getElementById('showTitle').checked;
    
    const customTitle = document.getElementById('customTitle').value;
    const nickText = document.getElementById('nickInput').value;

    const btnId = mode === 'all' ? 'genBtnAll' : 'genBtnCurrent';
    const btn = document.getElementById(btnId);
    const originalText = btn.innerText;
    btn.innerText = "생성 중...";
    btn.disabled = true;

    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');
    
    const maxCols = 4;
    const cols = items.length < maxCols ? items.length : maxCols;
    
    const cardW = 300, cardH = 420;
    const gap = 30, padding = 60;
    
    const headerH = 160; 
    const titleY = 60;    
    const nickY = 115;    

    const rows = Math.ceil(items.length / cols);

    cvs.width = padding * 2 + (cardW * cols) + (gap * (cols - 1));
    cvs.height = headerH + padding + (cardH * rows) + (gap * (rows - 1));

    ctx.fillStyle = "#fdfbf7";
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    if (showTitle) {
        const titleColor = "#aeb4d1"; 
        ctx.fillStyle = titleColor;
        ctx.font = "bold 45px 'Paperlogy', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; 
        ctx.fillText(customTitle, cvs.width / 2, titleY);
    }

    if (showNick && nickText.trim() !== "") {
        ctx.font = "bold 24px 'Paperlogy', sans-serif"; 
        ctx.fillStyle = "#636e72"; 
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(nickText, cvs.width / 2, nickY);
    }

    const loadImage = (src) => new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
    });

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const c = i % cols; 
        const r = Math.floor(i / cols);
        const x = padding + c * (cardW + gap);
        const y = headerH + r * (cardH + gap); 

        // 카드 배경 (흰색)
        ctx.fillStyle = "white";
        ctx.shadowColor = "rgba(0,0,0,0.1)";
        ctx.shadowBlur = 15;
        
        roundRect(ctx, x, y, cardW, cardH, 20);
        ctx.fill();
        
        // 카드 테두리
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = "#eae8e4"; 
        ctx.lineWidth = 2;
        roundRect(ctx, x, y, cardW, cardH, 20);
        ctx.stroke();

        const img = await loadImage(item.image);
        if (img) {
            const aspect = img.width / img.height;
            let dw = 260, dh = 260;
            if (aspect > 1) dh = dw / aspect; else dw = dh * aspect;
            ctx.drawImage(img, x + (cardW - dw)/2, y + 20 + (260 - dh)/2, dw, dh);
        }

        if (showName) {
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic"; 
            ctx.fillStyle = "#2d3436";
            ctx.font = "bold 22px 'Gowun Dodum', sans-serif";
            
            const name = item.nameKo;
            const words = name.split(' ');
            let line = '', lineY = y + 310;
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
            ctx.fillStyle = "#b2bec3";
            ctx.font = "bold 18px 'Gowun Dodum', sans-serif";
            const priceY = showName ? y + 390 : y + 330; 
            ctx.fillText(item.price, x + cardW/2, priceY);
        }
    }

    const link = document.createElement('a');
    link.download = `nongdam_${currentTab}_list.jpg`;
    link.href = cvs.toDataURL('image/jpeg');
    link.click();
    btn.innerText = originalText;
    btn.disabled = false;
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

init();