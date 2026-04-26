// ==========================================
// 1. 초기 설정 및 변수
// ==========================================
// ⭐ 본인의 Firebase 설정으로 교체하세요 (기존에 쓰시던 설정 복사)
const firebaseConfig = {
  // apiKey: "API_KEY",
  // authDomain: "PROJECT_ID.firebaseapp.com",
  // projectId: "PROJECT_ID",
  // ...
};

// 현재 유저 정보 (나중에 파이어베이스 로그인 기능과 연결하세요)
let currentUser = { 
  uid: "temp-user-id", // 임시 아이디
  displayName: "익명 유저" 
}; 
let loadedListUid = currentUser.uid; // 현재 열려있는 티어표의 원작자 UID
let itemIdCounter = 0; // 아이템 고유 번호 생성을 위한 카운터

// ==========================================
// 2. 색상 및 화면 초기화
// ==========================================
// 6가지 무지개색 HSL 기준
const rainbowStops = [0, 30, 60, 120, 220, 270];

window.updateRowColors = function() {
  const rows = document.querySelectorAll('.tier-row');
  const total = rows.length;
  if (total === 0) return;

  rows.forEach((row, index) => {
    const label = row.querySelector('.tier-label');
    let hue;

    if (total <= 6) {
      hue = rainbowStops[index] !== undefined ? rainbowStops[index] : rainbowStops[rainbowStops.length - 1];
    } else {
      const ratio = index / (total - 1);
      const p = ratio * (rainbowStops.length - 1);
      const lowIdx = Math.floor(p);
      const highIdx = Math.ceil(p);
      const interpolation = p - lowIdx;
      hue = rainbowStops[lowIdx] + (rainbowStops[highIdx] - rainbowStops[lowIdx]) * interpolation;
    }

    label.style.backgroundColor = `hsl(${hue}, 85%, 60%)`;
    label.style.color = "#333";
    label.style.textShadow = "none";
  });
};

window.createDefaultBoard = function() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  // 기본 6줄 생성
  ['S', 'A', 'B', 'C', 'D', 'E'].forEach(label => {
    board.innerHTML += `
      <div class="tier-row">
        <div class="tier-label" contenteditable="true">${label}</div>
        <div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div>
        <button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button>
      </div>`;
  });
  window.updateRowColors();
};

// ==========================================
// 3. 드래그 앤 드롭 로직
// ==========================================
window.allowDrop = function(ev) {
  ev.preventDefault();
};

window.drag = function(ev) {
  ev.dataTransfer.setData("text", ev.target.id);
};

window.drop = function(ev) {
  ev.preventDefault();
  const data = ev.dataTransfer.getData("text");
  const draggedElement = document.getElementById(data);
  
  // 드롭한 곳이 아이템 박스(tier-items)이거나 대기열(item-bank)일 경우에만 들어가게 함
  if (ev.target.classList.contains('tier-items') || ev.target.classList.contains('item-bank')) {
    ev.target.appendChild(draggedElement);
  } else if (ev.target.closest('.tier-items') || ev.target.closest('.item-bank')) {
    ev.target.closest('.tier-items, .item-bank').appendChild(draggedElement);
  }
};

// ==========================================
// 4. 티어 조작 및 아이템 추가
// ==========================================
window.addTier = function() {
  const board = document.getElementById('board');
  const rowDiv = document.createElement('div');
  rowDiv.className = 'tier-row';
  rowDiv.innerHTML = `
    <div class="tier-label" contenteditable="true">NEW</div>
    <div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div>
    <button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button>
  `;
  board.appendChild(rowDiv);
  window.updateRowColors();
};

window.deleteTier = function(btn) {
  const row = btn.parentElement;
  const items = row.querySelector('.tier-items');
  const bank = document.getElementById('item-bank');
  
  // 지우려는 줄에 아이템이 있다면 대기열로 살려보냄
  while (items.firstChild) {
    bank.appendChild(items.firstChild);
  }
  
  row.remove();
  window.updateRowColors();
};

window.addNewItem = function() {
  const url = document.getElementById('img-url').value;
  const title = document.getElementById('img-title').value;
  
  if(!url) {
    alert("이미지 주소를 입력해주세요!");
    return;
  }
  
  const bank = document.getElementById('item-bank');
  bank.appendChild(createItemElement({ src: url, title: title }));
  
  document.getElementById('img-url').value = '';
  document.getElementById('img-title').value = '';
};

function createItemElement(data) {
  const div = document.createElement('div');
  div.className = 'item'; 
  div.draggable = true; 
  div.id = 'item-' + (itemIdCounter++);
  div.ondragstart = window.drag;
  
  const img = document.createElement('img'); 
  img.src = data.src; 
  div.appendChild(img);
  
  if(data.title) {
    const tDiv = document.createElement('div'); 
    tDiv.className = 'item-title';
    tDiv.textContent = data.title; 
    div.appendChild(tDiv);
  }
  return div;
}

// ==========================================
// 5. 남의 티어표 가져오기 기능 (새 기능!)
// ==========================================
window.applyPermissions = function() {
  const isOwner = (currentUser.uid === loadedListUid);
  
  // 내 티어표면 [저장 버튼]을 보여주고, 남의 티어표면 [가져오기 버튼]을 보여줌
  document.querySelector('.btn-save').style.display = isOwner ? 'inline-block' : 'none';
  document.getElementById('btn-import-bank').style.display = isOwner ? 'none' : 'inline-block';
};

window.importToBank = function() {
  if(!confirm("이 티어표의 모든 이미지를 대기열로 이동시켜서 내 맘대로 새로 배치하시겠습니까?")) return;
  
  const bank = document.getElementById('item-bank');
  // 티어 보드 위에 올라가 있는 모든 이미지를 찾아서 대기열로 강제 이동
  document.querySelectorAll('.tier-items .item').forEach(item => {
    bank.appendChild(item);
  });
  
  // 이제 이 티어표의 소유권을 '나'로 변경하고 저장 권한을 줌
  loadedListUid = currentUser.uid; 
  window.applyPermissions();
  
  alert("모든 아이템이 대기열로 이동되었습니다! 이제 배치하고 저장해 보세요.");
};

// ==========================================
// 6. 데이터 저장 및 불러오기 (Firebase)
// ==========================================
window.saveBoard = function() {
  // 사용자가 선택한 카테고리 가져오기
  const category = document.getElementById('category-select').value;
  const title = prompt("저장할 티어표의 제목을 입력하세요:", "나의 멋진 티어표");
  
  if(!title) return; // 취소 누름
  
  // 현재 화면의 데이터를 객체 형태로 수집하는 로직 (기존 저장 로직과 유사)
  // ... 파이어베이스 저장 로직 작성 공간 ...
  
  alert(`[${category}] 카테고리에 '${title}'(으)로 저장되었습니다!`);
};

// 페이지 로드 시 무조건 실행할 내용
window.onload = function() {
  window.createDefaultBoard();
  window.applyPermissions();
};
