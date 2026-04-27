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

// ⭐ 2번 요청 반영: HTML 구조와 무관하게 "닉네임 / 로그아웃" 형태로 자동 통일 렌더링
window.updateAuthUI = function() {
  const userMenu = document.querySelector('.user-menu');
  if (!userMenu) return; 
  
  if (window.currentUser) {
    // 관리자 확인 로직
    const isAdmin = window.currentUser.email === 'fjrzlsiyoung@gmail.com';
    const adminTag = isAdmin ? " <span style='font-size:0.8rem;'>(👑관리자)</span>" : "";
    
    userMenu.innerHTML = `
      <button onclick="window.setNickname()" style="background:none; border:none; color:#fff; font-size:1rem; font-weight:bold; cursor:pointer; font-family:inherit; padding:5px; transition:0.2s;" onmouseover="this.style.color='#3498db'" onmouseout="this.style.color='#fff'">
        ${window.customNickname}${adminTag}
      </button>
      <span style="color:#555; font-weight:bold; margin:0 5px;">/</span>
      <button onclick="window.logout()" style="background:#3498db; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer; font-family:inherit; transition:0.2s;" onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
        로그아웃
      </button>
    `;
  } else {
    userMenu.innerHTML = `
      <button onclick="window.login()" style="background:#3498db; color:white; border:none; padding:8px 16px; border-radius:6px; font-weight:bold; cursor:pointer; font-family:inherit; transition:0.2s;" onmouseover="this.style.background='#2980b9'" onmouseout="this.style.background='#3498db'">
        구글 로그인
      </button>
    `;
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
  const board = document.getElementById('board') || document.querySelector('.tier-board');
  const div = document.createElement('div');
  div.className = 'tier-row';
  div.innerHTML = `<div class="tier-label" contenteditable="true">NEW</div><div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div><button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button>`;
  board.appendChild(div);
  window.updateRowColors();
};

// ⭐ 5번 요청 반영: 무조건 삭제 가능하게 하여 E 미만으로 줄일 수 있음
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
// 5. DB 저장 및 메인 티어표 불러오기 (수정됨)
// ==========================================
window.saveBoard = async function() {
  if (!window.currentUser) return alert("로그인해야 저장할 수 있습니다!");

  const tierRows = document.querySelectorAll('.tier-row');
  const boardData = [];
  let thumbnailImg = ""; 
  let totalPlacedItems = 0; // 배치된 항목 카운트용

  tierRows.forEach(row => {
    const labelEl = row.querySelector('.tier-label');
    const labelText = labelEl ? labelEl.innerText.trim() : "NEW";
    const labelColor = labelEl ? labelEl.style.backgroundColor : "#ccc";

    const itemsContainer = row.querySelector('.tier-items');
    const items = [];
    
    if (itemsContainer) {
      Array.from(itemsContainer.children).forEach(item => {
        const img = item.querySelector('img');
        // 혹시라도 이미지가 없는 찌꺼기 요소가 들어왔다면 무시 (에러 방지)
        if (!img) return; 
        
        totalPlacedItems++;
        const imgSrc = img.src;
        if (!thumbnailImg) thumbnailImg = imgSrc;
        
        const titleEl = item.querySelector('.item-title');
        
        // 무조건 순수한 문자열(String)로 변환해서 저장
        items.push({
          src: String(imgSrc || ""),
          title: titleEl ? String(titleEl.innerText.trim()) : "",
          desc: item.dataset.desc ? String(item.dataset.desc) : ""
        });
      });
    }
    
    boardData.push({ 
      label: String(labelText), 
      items: items, 
      color: String(labelColor) 
    });
  });

  if (totalPlacedItems === 0) {
    return alert("티어표에 아무 항목도 올라가 있지 않습니다. 아이템을 배치한 후 저장해주세요.");
  }

  const bankContainer = document.getElementById('item-bank');
  const bankItems = [];
  if (bankContainer) {
    Array.from(bankContainer.children).forEach(item => {
      const img = item.querySelector('img');
      if (!img) return;
      
      const titleEl = item.querySelector('.item-title');
      
      bankItems.push({
        src: String(img.src || ""),
        title: titleEl ? String(titleEl.innerText.trim()) : "",
        desc: item.dataset.desc ? String(item.dataset.desc) : ""
      });
    });
  }

  const titleInput = document.getElementById('tier-list-title');
  const boardTitle = titleInput && titleInput.value.trim() !== "" ? titleInput.value.trim() : "나만의 무제 티어표";
  const categorySelect = document.getElementById('category-select');
  
  // ⭐ 핵심 해결책: JSON 변환을 통해 객체 내부에 숨어있는 undefined나 DOM 참조를 완벽하게 제거합니다.
  const payload = JSON.parse(JSON.stringify({
    title: boardTitle,
    authorId: window.currentUser.uid,
    authorName: window.customNickname || "익명",
    category: categorySelect ? categorySelect.value : "기타",
    tiers: boardData,
    bank: bankItems,
    likes: 0,
    dislikes: 0,
    views: 0, 
    thumbnailUrl: thumbnailImg || ""
  }));
  
  // 서버 시간(serverTimestamp)은 JSON 파싱이 안 되므로 세탁 후에 따로 추가해 줍니다.
  payload.createdAt = serverTimestamp();

  try {
    document.querySelector('.btn-save').innerText = "저장 중...";
    await addDoc(collection(db, "tierLists"), payload); 
    alert("성공적으로 저장되었습니다! 내 보관함으로 이동합니다.");
    window.location.href = "mylist.html"; 
  } catch (e) {
    alert("저장 실패: " + e.message);
    console.error("Firebase 저장 에러 상세:", e);
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
      
      const board = document.getElementById('board') || document.querySelector('.tier-board');
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
// 7. 내 보관함 로드 함수
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

// ==========================================
// 8. 이미지 저장 기능 추가 (⭐ 6번 요청 반영)
// ==========================================
window.saveAsImage = function() {
  // 저장할 티어표 보드 영역 찾기
  const target = document.querySelector('.tier-board') || document.getElementById('board');
  if (!target) return alert("저장할 티어표 영역을 찾을 수 없습니다.");

  // 이미지에 보기 싫은 X 버튼이 찍히지 않도록 임시로 숨김
  const deleteBtns = target.querySelectorAll('.delete-tier-btn');
  deleteBtns.forEach(btn => btn.style.display = 'none');

  html2canvas(target, {
    useCORS: true, 
    backgroundColor: "#111", // 배경색 유지
    scale: 2 // 고화질 저장
  }).then(canvas => {
    // 숨겼던 버튼 다시 보이기
    deleteBtns.forEach(btn => btn.style.display = 'block');
    
    const link = document.createElement('a');
    link.download = 'my-tier-list.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(err => {
    // 에러 시에도 버튼은 다시 보여야 함
    deleteBtns.forEach(btn => btn.style.display = 'block');
    console.error("이미지 저장 실패:", err);
    alert("이미지 저장 중 오류가 발생했습니다.");
  });
};
