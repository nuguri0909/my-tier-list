import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwVjpUANfil947xb0bjKALw2uuGvZYQcs",
  authDomain: "mytierlist-70989.firebaseapp.com",
  projectId: "mytierlist-70989",
  storageBucket: "mytierlist-70989.firebasestorage.app",
  messagingSenderId: "13881580770",
  appId: "1:13881580770:web:6f7f9148c4bf5f95add2bb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let itemIdCounter = 0;
window.currentUser = null; 
window.customNickname = "익명"; 

// [로그인 로직]
window.login = () => signInWithPopup(auth, provider).catch(error => alert("로그인 실패: " + error.message));
window.logout = () => signOut(auth).then(() => alert("로그아웃 되었습니다.")).catch(error => alert("로그아웃 실패: " + error.message));

window.setNickname = function() {
  const nick = prompt("사용하실 닉네임을 입력하세요:", window.customNickname);
  if(nick && nick.trim() !== "") {
    updateProfile(auth.currentUser, { displayName: nick.trim() }).then(() => {
      window.customNickname = nick.trim();
      window.updateAuthUI();
      alert(`닉네임이 [${window.customNickname}](으)로 변경되었습니다!`);
    });
  }
};

onAuthStateChanged(auth, (user) => {
  if (user) { window.currentUser = user; window.customNickname = user.displayName || "익명"; } 
  else { window.currentUser = null; window.customNickname = "익명"; }
  window.updateAuthUI();
});

window.updateAuthUI = function() {
  const nm = document.getElementById('user-name-display');
  if(window.currentUser) {
    nm.innerText = window.customNickname + "님";
    document.getElementById('btn-login').style.display = 'none';
    document.getElementById('btn-logout').style.display = 'inline-block';
    document.getElementById('btn-nickname').style.display = 'inline-block';
  } else {
    nm.innerText = "로그인해주세요";
    document.getElementById('btn-login').style.display = 'inline-block';
    document.getElementById('btn-logout').style.display = 'none';
    document.getElementById('btn-nickname').style.display = 'none';
  }
};

// [무지개 색상]
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

// ✨ [드래그 앤 드롭 & 미리보기 기능]
window.draggedItemId = null;

window.drag = (ev) => {
  ev.dataTransfer.setData("text", ev.target.id);
  window.draggedItemId = ev.target.id;
  // 원래 요소는 드래그 도중 살짝 투명하게 처리
  setTimeout(() => ev.target.style.opacity = '0.5', 0);
};

window.dragEnd = (ev) => {
  ev.target.style.opacity = '1'; // 원래 상태 복구
  const placeholder = document.getElementById('drag-placeholder');
  if (placeholder) placeholder.remove();
};

window.allowDrop = (ev) => {
  ev.preventDefault();
  const target = ev.target.classList.contains('tier-items') || ev.target.id === 'item-bank' ? ev.target : ev.target.closest('.tier-items, #item-bank');
  
  if (target && window.draggedItemId) {
    let placeholder = document.getElementById('drag-placeholder');
    
    // 플레이스홀더가 없으면 원본을 복제해서 반투명하게 만듦
    if (!placeholder) {
      const originalItem = document.getElementById(window.draggedItemId);
      if (originalItem) {
        placeholder = originalItem.cloneNode(true);
        placeholder.id = 'drag-placeholder';
        placeholder.className = 'item item-placeholder';
      }
    }

    // 마우스가 위치한 컨테이너(티어칸)에 반투명 미리보기 삽입
    if (placeholder && placeholder.parentElement !== target) {
      target.appendChild(placeholder);
    }
  }
};

window.drop = (ev) => {
  ev.preventDefault();
  const data = ev.dataTransfer.getData("text");
  const target = ev.target.classList.contains('tier-items') || ev.target.id === 'item-bank' ? ev.target : ev.target.closest('.tier-items, #item-bank');
  
  const placeholder = document.getElementById('drag-placeholder');
  if(placeholder) placeholder.remove(); // 놓는 순간 미리보기 삭제

  if (target && data) {
    const item = document.getElementById(data);
    item.style.opacity = '1';
    target.appendChild(item);
  }
};

// ✨ [아이템 추가 및 모달(팝업) 관련 로직]
window.addNewItem = function() {
  const fileInput = document.getElementById('img-file');
  const urlInput = document.getElementById('img-url').value;
  const title = document.getElementById('img-title').value;

  if (fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) { createItemBox(e.target.result, title); };
    reader.readAsDataURL(fileInput.files[0]);
    fileInput.value = ''; 
  } else if (urlInput) {
    createItemBox(urlInput, title);
    document.getElementById('img-url').value = '';
  } else {
    alert("이미지 파일을 선택하거나 URL을 입력해주세요!");
  }
  document.getElementById('img-title').value = '';
};

function createItemBox(src, title) {
  const item = document.createElement('div');
  item.className = 'item'; 
  item.id = 'item-' + (itemIdCounter++); 
  item.draggable = true; 
  item.ondragstart = window.drag;
  item.ondragend = window.dragEnd; // 드래그 끝날 때 이벤트 추가
  
  // 데이터 저장용 속성
  item.dataset.desc = ""; 

  // 클릭하면 설정 팝업(모달) 띄우기
  item.onclick = function() { window.openItemModal(this.id); };

  item.innerHTML = `<img src="${src}">${title ? `<div class="item-title">${title}</div>` : ''}`;
  document.getElementById('item-bank').appendChild(item);
}

// 모달 제어 변수
window.currentItemForModal = null;

window.openItemModal = function(itemId) {
  window.currentItemForModal = itemId;
  const item = document.getElementById(itemId);
  
  // 정보 불러오기
  const imgPreview = document.getElementById('modal-img-preview');
  const titleInput = document.getElementById('modal-title');
  const descInput = document.getElementById('modal-desc');
  
  imgPreview.src = item.querySelector('img').src;
  const titleDiv = item.querySelector('.item-title');
  titleInput.value = titleDiv ? titleDiv.innerText : '';
  descInput.value = item.dataset.desc || '';
  
  document.getElementById('item-modal').style.display = 'flex';
};

window.closeModal = function() {
  document.getElementById('item-modal').style.display = 'none';
  window.currentItemForModal = null;
};

// 팝업에서 수정한 정보 저장
window.saveItemInfo = function() {
  if (!window.currentItemForModal) return;
  const item = document.getElementById(window.currentItemForModal);
  const newTitle = document.getElementById('modal-title').value.trim();
  const newDesc = document.getElementById('modal-desc').value.trim();
  
  item.dataset.desc = newDesc; // 설명 저장
  
  let titleDiv = item.querySelector('.item-title');
  if (newTitle) {
    if (!titleDiv) {
      titleDiv = document.createElement('div');
      titleDiv.className = 'item-title';
      item.appendChild(titleDiv);
    }
    titleDiv.innerText = newTitle;
  } else {
    // 제목란을 다 지웠다면 이미지 위에 떠있는 글자 배경도 삭제
    if (titleDiv) titleDiv.remove();
  }
  
  window.closeModal();
};

// 팝업에서 아이템 완전히 삭제
window.deleteItem = function() {
  if (!window.currentItemForModal) return;
  const item = document.getElementById(window.currentItemForModal);
  item.remove(); // HTML 화면에서 완전히 삭제
  window.closeModal();
};

window.onload = function() {
  const board = document.getElementById('board');
  ['S','A','B','C','D','E'].forEach(l => {
    board.innerHTML += `<div class="tier-row"><div class="tier-label" contenteditable="true">${l}</div><div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div><button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button></div>`;
  });
  window.updateRowColors();
};
