import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// ✨ 추가된 기능(좋아요, 댓글 등)을 위해 필요한 Firestore 함수들을 임포트에 추가했습니다.
import { getFirestore, collection, addDoc, getDoc, doc, serverTimestamp, updateDoc, increment, deleteDoc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

window.currentUser = null; 
window.customNickname = "익명";
let itemIdCounter = 0;

const urlParams = new URLSearchParams(window.location.search);
const loadId = urlParams.get('load');
const loadMode = urlParams.get('mode'); 
let originalAuthorId = null;

// ==========================================
// 1. 로그인 및 인증 UI 업데이트 로직
// ==========================================
window.login = () => signInWithPopup(auth, provider).catch(err => alert(err.message));
window.logout = () => signOut(auth).then(() => alert("로그아웃 되었습니다."));

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
  if (user) { 
    window.currentUser = user; 
    window.customNickname = user.displayName || "익명"; 
  } else { 
    window.currentUser = null; 
    window.customNickname = "익명"; 
  }
  window.updateAuthUI();
});

window.updateAuthUI = function() {
  const nm = document.getElementById('user-name-display');
  if(!nm) return; 
  
  if(window.currentUser) {
    nm.innerText = window.customNickname + "님";
    if(document.getElementById('btn-login')) document.getElementById('btn-login').style.display = 'none';
    if(document.getElementById('btn-logout')) document.getElementById('btn-logout').style.display = 'inline-block';
    if(document.getElementById('btn-nickname')) document.getElementById('btn-nickname').style.display = 'inline-block';
  } else {
    nm.innerText = "로그인해주세요";
    if(document.getElementById('btn-login')) document.getElementById('btn-login').style.display = 'inline-block';
    if(document.getElementById('btn-logout')) document.getElementById('btn-logout').style.display = 'none';
    if(document.getElementById('btn-nickname')) document.getElementById('btn-nickname').style.display = 'none';
  }
};

// ==========================================
// 2. 무지개 색상 및 티어 줄 관리
// ==========================================
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
  while (row.querySelector('.tier-items').firstChild) {
    document.getElementById('item-bank').appendChild(row.querySelector('.tier-items').firstChild);
  }
  row.remove();
  window.updateRowColors();
};

// ==========================================
// 3. 아이템 추가 함수
// ==========================================
window.addNewItem = function() {
  const fileInput = document.getElementById('img-file');
  const urlInput = document.getElementById('img-url') ? document.getElementById('img-url').value : "";
  const titleInput = document.getElementById('img-title') ? document.getElementById('img-title').value : "";

  if (fileInput && fileInput.files && fileInput.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) { createItemBox(e.target.result, titleInput); };
    reader.readAsDataURL(fileInput.files[0]);
    fileInput.value = ''; 
  } else if (urlInput) {
    createItemBox(urlInput, titleInput);
    if(document.getElementById('img-url')) document.getElementById('img-url').value = '';
  } else {
    alert("이미지 파일을 선택하거나 URL을 입력해주세요!");
  }
  if(document.getElementById('img-title')) document.getElementById('img-title').value = '';
};

function createItemBox(src, title, desc="", parentElement=null) {
  const item = document.createElement('div');
  item.className = 'item'; 
  item.id = 'item-' + (itemIdCounter++); 
  item.draggable = true; 
  item.ondragstart = window.drag; 
  item.ondragend = window.dragEnd;
  item.dataset.desc = desc; 
  
  item.onclick = function() { window.openItemModal(this.id); };
  item.innerHTML = `<img src="${src}">${title ? `<div class="item-title">${title}</div>` : ''}`;
  
  if(!parentElement) parentElement = document.getElementById('item-bank');
  parentElement.appendChild(item);
}

// ==========================================
// 4. 드래그 앤 드롭 및 미리보기 기능
// ==========================================
window.draggedItemId = null;

window.drag = (ev) => {
  ev.dataTransfer.setData("text", ev.target.id);
  window.draggedItemId = ev.target.id;
  setTimeout(() => ev.target.style.opacity = '0.5', 0);
};

window.dragEnd = (ev) => {
  ev.target.style.opacity = '1'; 
  const placeholder = document.getElementById('drag-placeholder');
  if (placeholder) placeholder.remove();
};

window.allowDrop = (ev) => {
  ev.preventDefault();
  const target = ev.target.classList.contains('tier-items') || ev.target.id === 'item-bank' ? ev.target : ev.target.closest('.tier-items, #item-bank');
  
  if (target && window.draggedItemId) {
    let placeholder = document.getElementById('drag-placeholder');
    if (!placeholder) {
      const originalItem = document.getElementById(window.draggedItemId);
      if (originalItem) {
        placeholder = originalItem.cloneNode(true);
        placeholder.id = 'drag-placeholder';
        placeholder.className = 'item item-placeholder';
      }
    }
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
  if(placeholder) placeholder.remove(); 

  if (target && data) {
    const item = document.getElementById(data);
    item.style.opacity = '1';
    target.appendChild(item);
  }
};

// ==========================================
// 5. 모달(팝업) 제어 로직
// ==========================================
window.currentItemForModal = null;

window.openItemModal = function(itemId) {
  window.currentItemForModal = itemId;
  const item = document.getElementById(itemId);
  document.getElementById('modal-img-preview').src = item.querySelector('img').src;
  
  const titleDiv = item.querySelector('.item-title');
  document.getElementById('modal-title').value = titleDiv ? titleDiv.innerText : '';
  document.getElementById('modal-desc').value = item.dataset.desc || '';
  
  document.getElementById('item-modal').style.display = 'flex';
};

window.closeModal = () => { 
  document.getElementById('item-modal').style.display = 'none'; 
  window.currentItemForModal = null;
};

window.saveItemInfo = function() {
  if(!window.currentItemForModal) return;
  const item = document.getElementById(window.currentItemForModal);
  item.dataset.desc = document.getElementById('modal-desc').value;
  
  const newTitle = document.getElementById('modal-title').value.trim();
  let titleDiv = item.querySelector('.item-title');
  if (newTitle) {
    if (!titleDiv) { 
      titleDiv = document.createElement('div'); 
      titleDiv.className = 'item-title'; 
      item.appendChild(titleDiv); 
    }
    titleDiv.innerText = newTitle;
  } else if (titleDiv) {
    titleDiv.remove();
  }
  window.closeModal();
};

window.deleteItem = function() { 
  if(window.currentItemForModal) {
    document.getElementById(window.currentItemForModal).remove(); 
    window.closeModal(); 
  }
};

// ==========================================
// 6. DB 저장 및 불러오기 (요청사항 1번 반영)
// ==========================================
window.saveBoard = async function() {
  if (!window.currentUser) return alert("로그인해야 저장할 수 있습니다!");

  const tierRows = document.querySelectorAll('.tier-row');
  const boardData = [];
  tierRows.forEach(row => {
    const label = row.querySelector('.tier-label').innerText;
    const items = Array.from(row.querySelector('.tier-items').children).map(item => ({
      src: item.querySelector('img').src,
      title: item.querySelector('.item-title') ? item.querySelector('.item-title').innerText : "",
      desc: item.dataset.desc || ""
    }));
    boardData.push({ label, items, color: row.querySelector('.tier-label').style.backgroundColor });
  });

  const bankItems = Array.from(document.getElementById('item-bank').children).map(item => ({
    src: item.querySelector('img').src,
    title: item.querySelector('.item-title') ? item.querySelector('.item-title').innerText : "",
    desc: item.dataset.desc || ""
  }));

  // ✨ 제목 입력창(id="tier-list-title")이 있으면 가져오고, 없으면 기본값 설정
  const titleInput = document.getElementById('tier-list-title');
  const boardTitle = titleInput && titleInput.value.trim() !== "" ? titleInput.value.trim() : "나만의 무제 티어표";

  const payload = {
    title: boardTitle, // 1번: 보관함에서 볼 수 있게 제목 추가
    authorId: window.currentUser.uid, // 1번: 내 보관함 필터링을 위한 UID
    authorName: window.customNickname,
    category: document.getElementById('category-select') ? document.getElementById('category-select').value : "기타",
    tiers: boardData,
    bank: bankItems,
    likes: 0,    // 4번: 좋아요 초기값 설정
    dislikes: 0, // 4번: 싫어요 초기값 설정
    createdAt: serverTimestamp()
  };

  try {
    document.querySelector('.btn-save').innerText = "저장 중...";
    await addDoc(collection(db, "tierLists"), payload);
    alert("성공적으로 저장되었습니다! 내 보관함으로 이동합니다.");
    window.location.href = "mylist.html"; 
  } catch (e) {
    alert("저장 실패: " + e.message);
    document.querySelector('.btn-save').innerText = "💾 저장하기";
  }
};

window.loadBoardData = async function() {
  if (!loadId) return; 
  try {
    const docSnap = await getDoc(doc(db, "tierLists", loadId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      originalAuthorId = data.authorId;
      
      const board = document.getElementById('board');
      const itemBank = document.getElementById('item-bank');
      if(board) board.innerHTML = ''; 
      if(itemBank) itemBank.innerHTML = '';

      if (loadMode === 'v1' || !loadMode) {
        data.tiers.forEach(tier => {
          const row = document.createElement('div'); row.className = 'tier-row';
          row.innerHTML = `<div class="tier-label" contenteditable="true">${tier.label}</div><div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div><button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button>`;
          board.appendChild(row);
          tier.items.forEach(it => createItemBox(it.src, it.title, it.desc, row.querySelector('.tier-items')));
        });
        if(data.bank) data.bank.forEach(it => createItemBox(it.src, it.title, it.desc, itemBank));
      } else if (loadMode === 'v2') {
        data.tiers.forEach(tier => {
          const row = document.createElement('div'); row.className = 'tier-row';
          row.innerHTML = `<div class="tier-label" contenteditable="true">${tier.label}</div><div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div><button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button>`;
          board.appendChild(row);
          tier.items.forEach(it => createItemBox(it.src, it.title, it.desc, itemBank));
        });
        if(data.bank) data.bank.forEach(it => createItemBox(it.src, it.title, it.desc, itemBank));
      }
      window.updateRowColors();
    }
  } catch (error) { console.error("불러오기 에러:", error); }
};

// ==========================================
// 7. 페이지 초기 셋팅
// ==========================================
window.onload = function() {
  if (loadId) {
    window.loadBoardData(); 
  } else {
    const board = document.getElementById('board');
    if(board) {
      ['S','A','B','C','D','E'].forEach(l => {
        board.innerHTML += `<div class="tier-row"><div class="tier-label" contenteditable="true">${l}</div><div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div><button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button></div>`;
      });
      window.updateRowColors();
    }
  }
};

// ==========================================
// 8. 게시판 뷰어, 좋아요, 댓글 기능 (새로 추가)
// ==========================================

// 3번 & 4번: 게시판에서 글 클릭 시 티어표와 좋아요 버튼 띄우기
window.openPostDetail = async function(postId) {
  const docRef = doc(db, "tierLists", postId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    
    // 티어표 렌더링 (게시판 HTML 안에 id="board-viewer" 영역이 있어야 합니다)
    const viewer = document.getElementById('board-viewer'); 
    if(viewer) {
      viewer.innerHTML = ''; 
      data.tiers.forEach(tier => {
        let itemsHtml = tier.items.map(it => `<div class="item" style="pointer-events:none;"><img src="${it.src}"></div>`).join('');
        viewer.innerHTML += `
          <div class="tier-row" style="min-height: 80px; margin-bottom: 5px;">
            <div class="tier-label" style="background-color: ${tier.color || '#ccc'}; width: 100px; display:flex; align-items:center; justify-content:center; font-weight:bold;">${tier.label}</div>
            <div class="tier-items" style="display:flex; flex-wrap:wrap; gap:5px; padding:5px;">${itemsHtml}</div>
          </div>
        `;
      });
    }

    // 4번: 좋아요/싫어요 버튼 렌더링
    const voteSection = document.getElementById('vote-section');
    if(voteSection) {
      voteSection.innerHTML = `
        <button class="btn" style="background:#e74c3c;" onclick="window.vote('${postId}', 'like')">👍 좋아요 (${data.likes || 0})</button>
        <button class="btn" style="background:#7f8c8d;" onclick="window.vote('${postId}', 'dislike')">👎 싫어요 (${data.dislikes || 0})</button>
      `;
    }

    // 댓글 목록 불러오기 시작
    window.loadComments(postId);
    
    // 모달창 띄우기 (게시판 HTML에 팝업이 구현되어 있을 경우)
    const modal = document.getElementById('post-detail-modal');
    if(modal) modal.style.display = 'flex';
  }
};

// 4번: 좋아요/싫어요 처리 로직
window.vote = async function(postId, type) {
  if (!window.currentUser) return alert("로그인 후 이용할 수 있습니다.");
  const docRef = doc(db, "tierLists", postId);
  if(type === 'like') await updateDoc(docRef, { likes: increment(1) });
  else await updateDoc(docRef, { dislikes: increment(1) });
  window.openPostDetail(postId); // 반영 후 화면 새로고침
};

// 2번: 댓글 삭제 로직 (내가 쓴 댓글만 삭제 버튼이 보이도록)
window.loadComments = function(postId) {
  const commentList = document.getElementById('comment-list');
  if(!commentList) return;

  const q = query(collection(db, `tierLists/${postId}/comments`), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    commentList.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const c = docSnap.data();
      const commentId = docSnap.id;
      
      // 내 댓글이면 삭제 버튼 표시
      const isMine = window.currentUser && c.authorId === window.currentUser.uid;
      const deleteBtn = isMine ? `<button style="background:transparent; color:#e74c3c; border:none; cursor:pointer;" onclick="window.deleteComment('${postId}', '${commentId}')">삭제</button>` : '';

      commentList.innerHTML += `
        <div style="background:#222; padding:10px; margin-bottom:5px; border-radius:5px; display:flex; justify-content:space-between;">
          <div><strong>${c.authorName}:</strong> ${c.text}</div>
          ${deleteBtn}
        </div>
      `;
    });
  });
};

window.deleteComment = async function(postId, commentId) {
  if(confirm("이 댓글을 삭제할까요?")) {
    await deleteDoc(doc(db, `tierLists/${postId}/comments`, commentId));
  }
};
