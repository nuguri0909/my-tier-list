let itemIdCounter = 0;
// 로그인 & 닉네임 상태 관리
let currentUser = null; 
let customNickname = "익명"; 
let loadedListUid = "new-list"; 

// 1. 로그인 및 닉네임 설정 기능
window.login = function() {
  // 실제 연동 시 Firebase 로그인 코드 작성 영역
  currentUser = { uid: "user123", email: "test@google.com" };
  updateAuthUI();
  alert("임시 구글 로그인이 완료되었습니다!");
};

window.logout = function() {
  currentUser = null;
  customNickname = "익명";
  updateAuthUI();
  alert("로그아웃 되었습니다.");
};

window.setNickname = function() {
  const nick = prompt("사용하실 닉네임을 입력하세요:", customNickname);
  if(nick && nick.trim() !== "") {
    customNickname = nick.trim();
    updateAuthUI();
    alert(`닉네임이 [${customNickname}]으로 변경되었습니다!`);
  }
};

window.updateAuthUI = function() {
  const nameDisplay = document.getElementById('user-name-display');
  if(currentUser) {
    nameDisplay.innerText = customNickname + "님";
    document.getElementById('btn-login').style.display = 'none';
    document.getElementById('btn-logout').style.display = 'inline-block';
    document.getElementById('btn-nickname').style.display = 'inline-block';
  } else {
    nameDisplay.innerText = "로그인해주세요";
    document.getElementById('btn-login').style.display = 'inline-block';
    document.getElementById('btn-logout').style.display = 'none';
    document.getElementById('btn-nickname').style.display = 'none';
  }
};

// 2. 무지개 색상 로직
const rainbowStops = [0, 30, 60, 120, 220, 270];
window.updateRowColors = function() {
  const rows = document.querySelectorAll('.tier-row');
  const total = rows.length;
  if (total === 0) return;
  rows.forEach((row, index) => {
    let hue = (total <= 6 && rainbowStops[index] !== undefined) ? rainbowStops[index] 
      : (total <= 6 ? 270 : rainbowStops[Math.floor((index / (total - 1)) * 5)] + (rainbowStops[Math.ceil((index / (total - 1)) * 5)] - rainbowStops[Math.floor((index / (total - 1)) * 5)]) * ((index / (total - 1)) * 5 - Math.floor((index / (total - 1)) * 5)));
    row.querySelector('.tier-label').style.backgroundColor = `hsl(${hue}, 85%, 60%)`;
  });
};

// 3. 줄 관리 및 드래그 앤 드롭
window.addTier = function() {
  const board = document.getElementById('board');
  const div = document.createElement('div');
  div.className = 'tier-row';
  div.innerHTML = `<div class="tier-label" contenteditable="true">NEW</div><div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div><button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button>`;
  board.appendChild(div);
  window.updateRowColors();
};

window.deleteTier = function(btn) {
  const row = btn.parentElement;
  while (row.querySelector('.tier-items').firstChild) document.getElementById('item-bank').appendChild(row.querySelector('.tier-items').firstChild);
  row.remove();
  window.updateRowColors();
};

window.allowDrop = (ev) => ev.preventDefault();
window.drag = (ev) => ev.dataTransfer.setData("text", ev.target.id);
window.drop = function(ev) {
  ev.preventDefault();
  const data = ev.dataTransfer.getData("text");
  const target = ev.target.classList.contains('tier-items') || ev.target.id === 'item-bank' ? ev.target : ev.target.closest('.tier-items, #item-bank');
  if (target) target.appendChild(document.getElementById(data));
};

// 4. 아이템 추가 (내 컴퓨터 파일 + URL 모두 지원)
window.addNewItem = function() {
  const fileInput = document.getElementById('img-file');
  const urlInput = document.getElementById('img-url').value;
  const title = document.getElementById('img-title').value;

  if (fileInput.files && fileInput.files[0]) {
    // 파일을 선택한 경우
    const reader = new FileReader();
    reader.onload = function(e) {
      createItemBox(e.target.result, title);
    };
    reader.readAsDataURL(fileInput.files[0]);
    fileInput.value = ''; // 초기화
  } else if (urlInput) {
    // URL을 입력한 경우
    createItemBox(urlInput, title);
    document.getElementById('img-url').value = '';
  } else {
    alert("이미지 파일을 선택하거나 URL을 입력해주세요!");
  }
  document.getElementById('img-title').value = '';
};

function createItemBox(src, title) {
  const item = document.createElement('div');
  item.className = 'item'; item.id = 'item-' + (itemIdCounter++); item.draggable = true; item.ondragstart = window.drag;
  item.innerHTML = `<img src="${src}">${title ? `<div class="item-title">${title}</div>` : ''}`;
  document.getElementById('item-bank').appendChild(item);
}

// 초기화
window.onload = function() {
  window.updateAuthUI();
  const board = document.getElementById('board');
  ['S','A','B','C','D','E'].forEach(l => {
    board.innerHTML += `<div class="tier-row"><div class="tier-label" contenteditable="true">${l}</div><div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div><button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button></div>`;
  });
  window.updateRowColors();
};
