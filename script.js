// === 1. 데이터 (테스트용 더미 데이터, 원래 쓰던 데이터로 교체 가능) ===
const items = [
    { id: 1, name: "기본 농담곰 S", price: "18,000", country: "korea", character: "kuma", company: "new", img: "images/placeholder.png" },
    { id: 2, name: "하치와레 곰", price: "22,000", country: "japan", character: "kuma", company: "old", img: "images/placeholder.png" },
    { id: 3, name: "두더지 고로케 M", price: "25,000", country: "japan", character: "mogukoro", company: "new", img: "images/placeholder.png" },
    { id: 4, name: "퍼그상 쿠션", price: "30,000", country: "korea", character: "pug", company: "old", img: "images/placeholder.png" },
];

// === 2. 상태 변수 ===
let currentTab = 'owned'; // 'owned' or 'wish'
let filters = {
    country: 'all',
    character: 'all',
    company: 'all' // 'old', 'new'
};

// 로컬 스토리지에서 데이터 불러오기
let ownedItems = JSON.parse(localStorage.getItem('nongdam_owned')) || [];
let wishItems = JSON.parse(localStorage.getItem('nongdam_wish')) || [];

// === 3. 초기화 및 렌더링 ===
document.addEventListener('DOMContentLoaded', () => {
    renderItems();
    updateTitleInput(); // 초기 탭에 맞춰 타이틀 설정
});

// 탭 전환 함수
function switchTab(tabName) {
    currentTab = tabName;
    
    // 버튼 스타일 업데이트
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // 탭 변경 시 저장 옵션의 타이틀도 자동으로 변경해주기
    updateTitleInput();
    
    renderItems();
}

function updateTitleInput() {
    const titleInput = document.getElementById('imgTitleInput');
    if (currentTab === 'owned') {
        titleInput.value = "[농담곰 인형 보유 리스트]";
    } else {
        titleInput.value = "[농담곰 인형 위시 리스트]";
    }
}

// 필터 설정 함수
function setFilter(type, value) {
    filters[type] = value;
    // 버튼 활성화 스타일 처리는 여기서 생략 (기존 코드 참고)
    renderItems();
}

function setCompanyFilter(value) {
    filters.company = value;
    renderItems();
}

// 아이템 렌더링 (핵심)
function renderItems() {
    const container = document.getElementById('listContainer');
    container.innerHTML = '';

    const filteredItems = items.filter(item => {
        // 필터 로직 (간소화됨)
        if (filters.country !== 'all' && item.country !== filters.country) return false;
        if (filters.character !== 'all' && item.character !== filters.character) return false;
        if (filters.company !== 'all' && item.company !== filters.company) return false;
        
        // 보유/위시 탭 로직
        const isOwned = ownedItems.includes(item.id);
        const isWished = wishItems.includes(item.id);

        if (currentTab === 'owned' && !isOwned) return false;
        if (currentTab === 'wish' && !isWished) return false; // 위시는 보유하지 않은 것만 보여줄지, 찜한건 다 보여줄지 선택
        
        return true;
    });

    if (filteredItems.length === 0) {
        container.innerHTML = '<div class="empty-msg">해당하는 농담곰이 없어요...💦</div>';
        return;
    }

    filteredItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'item-card'; // CSS에 .item-card 스타일 필요
        itemEl.innerHTML = `
            <div class="img-box" style="background-color: #eee; height: 150px;">
                <span>${item.name}</span>
            </div>
            <div class="info-box">
                <h4>${item.name}</h4>
                <p>${item.price}원</p>
                <button onclick="toggleItem(${item.id})">
                    ${currentTab === 'owned' ? '삭제' : '보유로 이동'}
                </button>
            </div>
        `;
        container.appendChild(itemEl);
    });
}

// 아이템 상태 토글 (보유 <-> 미보유 등) - 간략 구현
function toggleItem(id) {
    if (currentTab === 'owned') {
        ownedItems = ownedItems.filter(i => i !== id);
        localStorage.setItem('nongdam_owned', JSON.stringify(ownedItems));
    } else {
        // 위시에서 누르면 보유로 이동한다고 가정
        if (!ownedItems.includes(id)) {
            ownedItems.push(id);
            localStorage.setItem('nongdam_owned', JSON.stringify(ownedItems));
        }
    }
    renderItems();
}

// 닉네임 입력 시 체크박스 자동 체크
function toggleNickCheck() {
    const nickInput = document.getElementById('nickInput');
    const nickCheck = document.getElementById('showNick');
    
    if (nickInput.value.trim().length > 0) {
        nickCheck.checked = true;
    } else {
        nickCheck.checked = false;
    }
}

// === 4. 이미지 생성 함수 (요청사항 반영) ===
function generateImage() {
    const listContainer = document.getElementById('listContainer');
    if (!listContainer || listContainer.children.length === 0) {
        alert("저장할 농담곰이 없어요! 😅");
        return;
    }

    // 사용자 옵션 값 가져오기
    const showName = document.getElementById('showName').checked;
    const showPrice = document.getElementById('showPrice').checked;
    const showNick = document.getElementById('showNick').checked;
    
    const customTitle = document.getElementById('imgTitleInput').value;
    const customNick = document.getElementById('nickInput').value;

    // 1. 캡처를 위한 임시 컨테이너 생성 (화면 밖이나 위에 덮어씌움)
    const captureDiv = document.createElement('div');
    captureDiv.id = 'capture-area';
    // 캡처 영역 스타일 (중요: 여기서 디자인 결정)
    captureDiv.style.cssText = `
        position: fixed; top: 0; left: 0; z-index: 9999;
        width: 800px; /* 이미지 고정 너비 */
        background: white;
        font-family: 'Pretendard', sans-serif;
    `;

    // 2. 헤더 생성 (높이 줄임)
    const headerHtml = `
        <div style="background-color: #2c3e50; color: white; padding: 15px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">${customTitle}</h1>
            ${showNick ? `<div style="margin-top: 5px; font-size: 14px; opacity: 0.9;">By. ${customNick}</div>` : ''}
        </div>
    `;

    // 3. 아이템 그리드 생성
    let gridHtml = '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; padding: 20px;">';
    
    // 현재 화면에 보이는 아이템만 복사해서 넣기
    // (실제로는 items 데이터를 순회하며 현재 필터에 맞는 것만 넣는게 깔끔함)
    // 여기서는 간단히 DOM 복사 방식 사용
    const currentItems = document.querySelectorAll('.item-card');
    currentItems.forEach(card => {
        // 카드 내용 복사 및 스타일 정리
        const nameText = card.querySelector('h4').innerText;
        const priceText = card.querySelector('p').innerText;
        
        gridHtml += `
            <div style="border: 1px solid #eee; border-radius: 8px; overflow: hidden; text-align: center; padding-bottom: 10px;">
                <div style="height: 150px; background: #f9f9f9; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                    <span style="color:#aaa;">IMG</span> 
                </div>
                ${showName ? `<div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${nameText}</div>` : ''}
                ${showPrice ? `<div style="color: #666; font-size: 12px;">${priceText}</div>` : ''}
            </div>
        `;
    });
    gridHtml += '</div>';

    // 4. 합치기
    captureDiv.innerHTML = headerHtml + gridHtml;
    document.body.appendChild(captureDiv);

    // 5. html2canvas로 캡처
    html2canvas(captureDiv).then(canvas => {
        // 다운로드 링크 생성
        const link = document.createElement('a');
        link.download = `nongdamgom_list_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();

        // 뒷정리 (임시 컨테이너 삭제)
        document.body.removeChild(captureDiv);
    });
}

function resetFilters() {
    filters = { country: 'all', character: 'all', company: 'all' };
    renderItems();
}

function resetRecords() {
    if(confirm("정말 모든 기록을 지울까요? 💦")) {
        localStorage.removeItem('nongdam_owned');
        localStorage.removeItem('nongdam_wish');
        location.reload();
    }
}
