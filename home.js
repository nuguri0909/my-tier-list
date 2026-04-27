// home.js

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwVjpUANfil947xb0bjKALw2uuGvZYQcs",
  authDomain: "mytierlist-70989.firebaseapp.com",
  projectId: "mytierlist-70989",
  storageBucket: "mytierlist-70989.firebasestorage.app",
  messagingSenderId: "13881580770",
  appId: "1:13881580770:web:6f7f9148c4bf5f95add2bb"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

function timeAgo(timestamp) {
  if (!timestamp) return '알 수 없음';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  return `${Math.floor(diffInSeconds / 86400)}일 전`;
}

// ⭐ 2번 요청: 좌우 5열 카드 디자인에 맞춰 HTML 구조 변경
function renderCards(posts, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = ''; 
  
  // 컨테이너에 CSS 그리드 클래스 추가
  container.className = 'home-grid';

  if (posts.length === 0) {
    container.innerHTML = '<p style="color: #aaa; padding: 20px; grid-column: 1 / -1; text-align: center;">아직 작성된 티어리스트가 없습니다.</p>';
    return;
  }

  posts.forEach(post => {
    const thumbnailHtml = post.thumbnailUrl 
      ? `<img src="${post.thumbnailUrl}" alt="썸네일">` 
      : `<div style="color:#666; font-size: 0.9rem;">(이미지 없음)</div>`;

    const cardHtml = `
      <div class="home-tier-card">
        <div class="home-tier-card-img">
          ${thumbnailHtml}
        </div>
        <div class="home-tier-card-info">
          <div>
            <h3 class="home-card-title">${post.title || '무제 티어표'}</h3>
            <div class="home-card-desc">
              ${post.authorName || '익명'} 님의 티어리스트<br>
              ❤️ ${post.likes || 0} &nbsp; 👁️ ${post.views || 0} &nbsp;·&nbsp; ${timeAgo(post.createdAt)}
            </div>
          </div>
          <div class="home-card-btn" onclick="location.href='board.html?id=${post.id}'">
            티어리스트 보기
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHtml);
  });
}

async function loadHomePosts() {
  try {
    const postsRef = collection(db, "tierLists"); 

    // ⭐ 2번 요청: 좌우 최대 5개까지 불러오도록 limit(5)으로 수정
    const popularQuery = query(postsRef, orderBy("likes", "desc"), limit(5));
    const popularSnapshot = await getDocs(popularQuery);
    const popularPosts = popularSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCards(popularPosts, "popular-grid");

    const recentQuery = query(postsRef, orderBy("createdAt", "desc"), limit(5));
    const recentSnapshot = await getDocs(recentQuery);
    const recentPosts = recentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCards(recentPosts, "recent-grid");

  } catch (error) {
    console.error("데이터를 불러오는 중 에러 발생:", error);
    const popGrid = document.getElementById("popular-grid");
    const recGrid = document.getElementById("recent-grid");
    if(popGrid) popGrid.innerHTML = '<p style="grid-column: 1 / -1;">데이터를 불러오지 못했습니다.</p>';
    if(recGrid) recGrid.innerHTML = '<p style="grid-column: 1 / -1;">데이터를 불러오지 못했습니다.</p>';
  }
}

window.addEventListener('DOMContentLoaded', loadHomePosts);
