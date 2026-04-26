// Firebase 최신 버전(v10) 모듈 불러오기
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// 회원님의 Firebase 인증 정보
const firebaseConfig = {
  apiKey: "AIzaSyAwVjpUANfil947xb0bjKALw2uuGvZYQcs",
  authDomain: "mytierlist-70989.firebaseapp.com",
  projectId: "mytierlist-70989",
  storageBucket: "mytierlist-70989.firebasestorage.app",
  messagingSenderId: "13881580770",
  appId: "1:13881580770:web:6f7f9148c4bf5f95add2bb"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let itemIdCounter = 0;
window.currentUser = null; 
window.customNickname = "익명"; 

// 1. 진짜 구글 로그인 기능
window.login = function() {
  signInWithPopup(auth, provider).catch(error => {
    console.error(error);
    alert("로그인 실패: " + error.message);
  });
};

window.logout = function() {
  signOut(auth).then(() => {
    alert("로그아웃 되었습니다.");
  }).catch(error => alert("로그아웃 실패: " + error.message));
};

window.setNickname = function() {
  const nick = prompt("사용하실 닉네임을 입력하세요:", window.customNickname);
  if(nick && nick.trim() !== "") {
    const newName = nick.trim();
    // Firebase 계정 프로필에 닉네임 진짜로 업데이트하기
    updateProfile(auth.currentUser, { displayName: newName }).then(() => {
      window.customNickname = newName;
      window.updateAuthUI();
      alert(`닉네임이 [${window.customNickname}](으)로 변경되었습니다!`);
    }).catch(error => {
      alert("닉네임 변경 실패: " + error.message);
    });
  }
};

// 로그인 상태 실시간 감지 (새로고침해도 로그인 유지됨)
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.currentUser = user;
    window.customNickname = user.displayName || "익명"; // 설정한 닉네임이 있으면 불러옴
  } else {
    window.currentUser = null;
    window.customNickname = "익명";
  }
  window.updateAuthUI();
});

window.updateAuthUI = function() {
  const nameDisplay = document.getElementById('user-name-display');
  if(window.currentUser) {
    nameDisplay.innerText = window.customNickname + "님";
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

// 4. 아이템 추가
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
  item.className = 'item'; item.id = 'item-' + (itemIdCounter++); item.draggable = true; item.ondragstart = window.drag;
  item.innerHTML = `<img src="${src}">${title ? `<div class="item-title">${title}</div>` : ''}`;
  document.getElementById('item-bank').appendChild(item);
}

// 초기화
window.onload = function() {
  const board = document.getElementById('board');
  ['S','A','B','C','D','E'].forEach(l => {
    board.innerHTML += `<div class="tier-row"><div class="tier-label" contenteditable="true">${l}</div><div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div><button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button></div>`;
  });
  window.updateRowColors();
};
