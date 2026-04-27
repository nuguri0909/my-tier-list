import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDoc, doc, serverTimestamp, updateDoc, increment, deleteDoc, query, orderBy, where, onSnapshot, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
// 1. 로그인/인증 및 내 보관함 로드
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
  
  if(document.getElementById('my-list-container')) {
    window.loadMyList();
  }
});

window.updateAuthUI = function() {
  const nm = document.getElementById('user-name-display');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const btnNickname = document.getElementById('btn-nickname');

  // ⭐ [추가됨] HTML 수정 없이도 style.css의 새 버튼 디자인이 자동 적용되도록 설정
  if(btnLogin) btnLogin.className = 'login-btn-header';
  if(btnLogout) btnLogout.className = 'login-btn-header logout-btn-header';
  if(btnNickname) btnNickname.className = 'login-btn-header';

  if(!nm) return; 
  
  if(window.currentUser) {
    nm.innerText = window.customNickname + "님";
    if(btnLogin) btnLogin.style.display = 'none';
    if(btnLogout) btnLogout.style.display = 'inline-block';
    if(btnNickname) btnNickname.style.display = 'inline-block';
  } else {
    nm.innerText = "로그인해주세요";
    if(btnLogin) btnLogin.style.display = 'inline-block';
    if(btnLogout) btnLogout.style.display = 'none';
    if(btnNickname) btnNickname.style.display = 'none';
  }
};

// ==========================================
// 2. 티어 보드 기본 로직
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
// 3. 아이템 생성, 드래그 & 드롭
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
// 4. 모달 창 (아이템 상세 설명)
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
// 5. DB 저장 및 메인 티어표 불러오기 (⭐ 썸네일 추가)
// ==========================================
window.saveBoard = async function() {
  if (!window.currentUser) return alert("로그인해야 저장할 수 있습니다!");

  const tierRows = document.querySelectorAll('.tier-row');
  const boardData = [];
  let thumbnailImg = ""; // ⭐ 홈 화면을 위한 대표 썸네일 이미지

  tierRows.forEach(row => {
    const label = row.querySelector('.tier-label').innerText;
    const items = Array.from(row.querySelector('.tier-items').children).map(item => {
      const imgSrc = item.querySelector('img').src;
      if(!thumbnailImg) thumbnailImg = imgSrc; // 첫 번째 이미지를 썸네일로 찜!
      return {
        src: imgSrc,
        title: item.querySelector('.item-title') ? item.querySelector('.item-title').innerText : "",
        desc: item.dataset.desc || ""
      };
    });
    boardData.push({ label, items, color: row.querySelector('.tier-label').style.backgroundColor });
  });

  const bankItems = Array.from(document.getElementById('item-bank').children).map(item => ({
    src: item.querySelector('img').src,
    title: item.querySelector('.item-title') ? item.querySelector('.item-title').innerText : "",
    desc: item.dataset.desc || ""
  }));

  const titleInput = document.getElementById('tier-list-title');
  const boardTitle = titleInput && titleInput.value.trim() !== "" ? titleInput.value.trim() : "나만의 무제 티어표";

  const payload = {
    title: boardTitle,
    authorId: window.currentUser.uid,
    authorName: window.customNickname,
    category: document.getElementById('category-select') ? document.getElementById('category-select').value : "기타",
    tiers: boardData,
    bank: bankItems,
    likes: 0,
    dislikes: 0,
    views: 0, // ⭐ 홈 화면 정렬을 위한 초기 조회수
    thumbnailUrl: thumbnailImg, // ⭐ 홈 화면에 띄울 썸네일
    createdAt: serverTimestamp()
  };

  try {
    document.querySelector('.btn-save').innerText = "저장 중...";
    await addDoc(collection(db, "tierLists"), payload); // 컬렉션 이름은 "tierLists"
    alert("성공적으로 저장되었습니다! 내 보관함으로 이동합니다.");
    window.location.href = "mylist.html"; 
  } catch (e) {
    alert("저장 실패: " + e.message);
    document.querySelector('.btn-save').innerText = "💾 서버에 저장";
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

      const modeToLoad = loadMode || 'v1';
      data.tiers.forEach(tier => {
        const row = document.createElement('div'); row.className = 'tier-row';
        row.innerHTML = `<div class="tier-label" style="background-color: ${tier.color || '#ccc'}" contenteditable="true">${tier.label}</div><div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div><button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button>`;
        board.appendChild(row);
        if(modeToLoad === 'v1') {
           tier.items.forEach(it => createItemBox(it.src, it.title, it.desc, row.querySelector('.tier-items')));
        } else {
           tier.items.forEach(it => createItemBox(it.src, it.title, it.desc, itemBank));
        }
      });
      
      if(data.bank) data.bank.forEach(it => createItemBox(it.src, it.title, it.desc, itemBank));
      window.updateRowColors();
    }
  } catch (error) { console.error("불러오기 에러:", error); }
};

window.onload = function() {
  if (loadId) {
    window.loadBoardData(); 
  } else {
    // HTML에 하드코딩된 S~E 칸들의 색상만 입혀줍니다.
    window.updateRowColors();
  }
};

// ==========================================
// 6. 게시판 전용 함수 (티어표 보기, 좋아요, 댓글)
// ==========================================
window.openPostDetail = async function(postId) {
  const docRef = doc(db, "tierLists", postId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    
    // 게시판 상세모달에 티어표 시각화
    const viewer = document.getElementById('board-viewer'); 
    if(viewer) {
      viewer.innerHTML = `<h3>${data.title || "무제 티어표"}</h3>`; 
      data.tiers.forEach(tier => {
        let itemsHtml = tier.items.map(it => `<div class="item" style="pointer-events:none;"><img src="${it.src}"></div>`).join('');
        viewer.innerHTML += `
          <div class="tier-row" style="min-height: 80px; margin-bottom: 5px; padding-right:0;">
            <div class="tier-label" style="background-color: ${tier.color || '#ccc'}; width: 100px; display:flex; align-items:center; justify-content:center; font-weight:bold; color:#000;">${tier.label}</div>
            <div class="tier-items" style="display:flex; flex-wrap:wrap; gap:5px; padding:5px;">${itemsHtml}</div>
          </div>
        `;
      });
    }

    const voteSection = document.getElementById('vote-section');
    if(voteSection) {
      voteSection.innerHTML = `
        <button class="btn" style="background:#e74c3c;" onclick="window.vote('${postId}', 'like')">👍 좋아요 (${data.likes || 0})</button>
        <button class="btn" style="background:#7f8c8d;" onclick="window.vote('${postId}', 'dislike')">👎 싫어요 (${data.dislikes || 0})</button>
      `;
    }

    window.loadComments(postId);
    
    const modal = document.getElementById('post-detail-modal');
    if(modal) modal.style.display = 'flex';
  }
};

window.closePostModal = function() {
  document.getElementById('post-detail-modal').style.display = 'none';
};

window.vote = async function(postId, type) {
  if (!window.currentUser) return alert("로그인 후 이용할 수 있습니다.");
  const docRef = doc(db, "tierLists", postId);
  if(type === 'like') await updateDoc(docRef, { likes: increment(1) });
  else await updateDoc(docRef, { dislikes: increment(1) });
  window.openPostDetail(postId); 
};

window.loadComments = function(postId) {
  const commentList = document.getElementById('comment-list');
  if(!commentList) return;

  const q = query(collection(db, `tierLists/${postId}/comments`), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    commentList.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const c = docSnap.data();
      const commentId = docSnap.id;
      const isMine = window.currentUser && c.authorId === window.currentUser.uid;
      const deleteBtn = isMine ? `<button class="btn-delete-comment" onclick="window.deleteComment('${postId}', '${commentId}')">삭제</button>` : '';

      commentList.innerHTML += `
        <div class="comment-item">
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

// ==========================================
// 7. 내 보관함 로드 함수 (⭐ index.html -> maker.html 경로 수정 완료)
// ==========================================
window.loadMyList = async function() {
  const listContainer = document.getElementById('my-list-container');
  if (!listContainer || !window.currentUser) return;

  try {
    const q = query(collection(db, "tierLists"), where("authorId", "==", window.currentUser.uid));
    const querySnapshot = await getDocs(q);
    
    listContainer.innerHTML = ''; 
    
    if (querySnapshot.empty) {
      listContainer.innerHTML = '<p style="text-align:center; padding: 50px; color:#aaa;">저장된 티어표가 없습니다.</p>';
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      listContainer.innerHTML += `
        <div class="list-item">
          <div>
            <h3 style="margin: 0 0 5px 0;">${data.title || "무제 티어표"}</h3>
            <span style="font-size:0.8rem; color:#888;">👍 ${data.likes || 0} | 👎 ${data.dislikes || 0}</span>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn" onclick="location.href='maker.html?load=${docSnap.id}'">수정하기</button>
            <button class="btn" style="background:#888;" onclick="window.openPostDetail('${docSnap.id}')">게시판 뷰로 보기</button>
          </div>
        </div>
      `;
    });
  } catch (e) {
    console.error("보관함 불러오기 에러:", e);
    listContainer.innerHTML = '<p>데이터를 불러오는데 실패했습니다.</p>';
  }
};
