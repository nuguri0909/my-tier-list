import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// DB 모듈 추가!
import { getFirestore, collection, addDoc, getDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db = getFirestore(app); // DB 연결
const provider = new GoogleAuthProvider();

window.currentUser = null; 
window.customNickname = "익명";
let itemIdCounter = 0;

// URL에서 불러올 티어표 ID 확인 (게시판에서 V1, V2로 가져왔을 때)
const urlParams = new URLSearchParams(window.location.search);
const loadId = urlParams.get('load');
const loadMode = urlParams.get('mode'); // 'v1' (티어유지) or 'v2' (대기열초기화)
let originalAuthorId = null; // 원작자 ID 저장 (본인인지 확인용)

// --- [인증 로직 (기존 동일)] ---
window.login = () => signInWithPopup(auth, provider).catch(err => alert(err.message));
window.logout = () => signOut(auth).then(() => alert("로그아웃 됨"));
onAuthStateChanged(auth, (user) => {
  window.currentUser = user || null;
  window.customNickname = user ? (user.displayName || "익명") : "익명";
  window.updateAuthUI();
});
window.updateAuthUI = () => { /* 기존 UI 업데이트 코드 유지 (생략하지 말고 그대로 넣으셔도 됩니다. 공간상 단축합니다) */
  const nm = document.getElementById('user-name-display');
  if(nm) nm.innerText = window.currentUser ? window.customNickname + "님" : "로그인해주세요";
};

// --- [✨ 진짜 DB 저장 기능] ---
window.saveBoard = async function() {
  if (!window.currentUser) return alert("로그인해야 저장할 수 있습니다!");

  // 화면에 있는 모든 아이템 정보 긁어모으기
  const tierRows = document.querySelectorAll('.tier-row');
  const boardData = [];
  tierRows.forEach(row => {
    const label = row.querySelector('.tier-label').innerText;
    const items = Array.from(row.querySelector('.tier-items').children).map(item => ({
      src: item.querySelector('img').src,
      title: item.querySelector('.item-title') ? item.querySelector('.item-title').innerText : "",
      desc: item.dataset.desc || ""
    }));
    boardData.push({ label, items });
  });

  const bankItems = Array.from(document.getElementById('item-bank').children).map(item => ({
    src: item.querySelector('img').src,
    title: item.querySelector('.item-title') ? item.querySelector('.item-title').innerText : "",
    desc: item.dataset.desc || ""
  }));

  const payload = {
    authorId: window.currentUser.uid, // 만든 사람 ID (권한 확인용)
    authorName: window.customNickname,
    category: document.getElementById('category-select') ? document.getElementById('category-select').value : "기타",
    tiers: boardData,
    bank: bankItems,
    createdAt: serverTimestamp()
  };

  try {
    document.querySelector('.btn-save').innerText = "저장 중...";
    await addDoc(collection(db, "tierLists"), payload);
    alert("성공적으로 저장되었습니다! 내 보관함으로 이동합니다.");
    window.location.href = "mylist.html"; // 저장 후 보관함으로 자동 이동!
  } catch (e) {
    alert("저장 실패: " + e.message);
    document.querySelector('.btn-save').innerText = "💾 저장하기";
  }
};

// --- [✨ 다른 사람 티어표 불러오기 로직 (V1 / V2)] ---
window.loadBoardData = async function() {
  if (!loadId) return; // 불러올 게 없으면 패스
  
  try {
    const docSnap = await getDoc(doc(db, "tierLists", loadId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      originalAuthorId = data.authorId;
      
      const board = document.getElementById('board');
      const itemBank = document.getElementById('item-bank');
      board.innerHTML = ''; itemBank.innerHTML = '';

      // [버전 1]: 티어 그대로 유지
      if (loadMode === 'v1') {
        data.tiers.forEach(tier => {
          const row = document.createElement('div'); row.className = 'tier-row';
          row.innerHTML = `<div class="tier-label" contenteditable="true">${tier.label}</div><div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div><button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button>`;
          board.appendChild(row);
          tier.items.forEach(it => createItemBox(it.src, it.title, it.desc, row.querySelector('.tier-items')));
        });
        data.bank.forEach(it => createItemBox(it.src, it.title, it.desc, itemBank));
      } 
      // [버전 2]: 대기열로 모두 쏟아내기
      else if (loadMode === 'v2') {
        data.tiers.forEach(tier => {
          const row = document.createElement('div'); row.className = 'tier-row';
          row.innerHTML = `<div class="tier-label" contenteditable="true">${tier.label}</div><div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div><button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button>`;
          board.appendChild(row);
          // 티어에 있던 아이템들을 모조리 뱅크로!
          tier.items.forEach(it => createItemBox(it.src, it.title, it.desc, itemBank));
        });
        data.bank.forEach(it => createItemBox(it.src, it.title, it.desc, itemBank));
      }
      window.updateRowColors();
    }
  } catch (error) { console.error("불러오기 에러:", error); }
};

// --- [아이템 생성 함수 개선] ---
function createItemBox(src, title, desc="", parentElement) {
  const item = document.createElement('div');
  item.className = 'item'; item.id = 'item-' + (itemIdCounter++); item.draggable = true; 
  item.ondragstart = window.drag; item.ondragend = window.dragEnd;
  item.dataset.desc = desc; // 내용 저장
  item.onclick = function() { window.openItemModal(this.id); };
  item.innerHTML = `<img src="${src}">${title ? `<div class="item-title">${title}</div>` : ''}`;
  if(!parentElement) parentElement = document.getElementById('item-bank');
  parentElement.appendChild(item);
}

// 초기화 시 데이터 로드 실행
window.onload = function() {
  if (loadId) {
    window.loadBoardData(); // 남의 거 불러오기
  } else {
    // 새치기 (기본 보드 세팅)
    const board = document.getElementById('board');
    if(board) {
      ['S','A','B','C','D','E'].forEach(l => {
        board.innerHTML += `<div class="tier-row"><div class="tier-label" contenteditable="true">${l}</div><div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div><button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button></div>`;
      });
      window.updateRowColors();
    }
  }
};

// (기타 drag/drop 로직, 모달창 띄우기/닫기 등 이전 코드는 생략없이 그대로 유지하시면 됩니다. 길이상 생략)
window.drag = (ev) => { /* 이전코드 */ ev.dataTransfer.setData("text", ev.target.id); };
window.allowDrop = (ev) => ev.preventDefault();
window.drop = (ev) => { /* 이전코드 */ ev.preventDefault(); const data = ev.dataTransfer.getData("text"); const target = ev.target.closest('.tier-items, #item-bank'); if(target && data) target.appendChild(document.getElementById(data)); };
window.updateRowColors = () => { /* 이전코드 */ };

// ✨ [초대형 모달창 연결 로직]
window.openItemModal = function(itemId) {
  window.currentItemForModal = itemId;
  const item = document.getElementById(itemId);
  document.getElementById('modal-img-preview').src = item.querySelector('img').src;
  const titleDiv = item.querySelector('.item-title');
  document.getElementById('modal-title').value = titleDiv ? titleDiv.innerText : '';
  document.getElementById('modal-desc').value = item.dataset.desc || '';
  document.getElementById('item-modal').style.display = 'flex';
};
window.closeModal = () => { document.getElementById('item-modal').style.display = 'none'; };
window.saveItemInfo = function() {
  const item = document.getElementById(window.currentItemForModal);
  item.dataset.desc = document.getElementById('modal-desc').value;
  // 제목 로직(이전과 동일)
  const newTitle = document.getElementById('modal-title').value.trim();
  let titleDiv = item.querySelector('.item-title');
  if (newTitle) {
    if (!titleDiv) { titleDiv = document.createElement('div'); titleDiv.className = 'item-title'; item.appendChild(titleDiv); }
    titleDiv.innerText = newTitle;
  } else if (titleDiv) titleDiv.remove();
  window.closeModal();
};
window.deleteItem = function() { document.getElementById(window.currentItemForModal).remove(); window.closeModal(); };
