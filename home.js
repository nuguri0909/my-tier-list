// home.js

// ⭐ getApps, getApp 추가 (중복 실행 방지용)
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
// ⭐ 맨 끝에 limit 추가 완료! (이게 없어서 목록이 안 떴습니다)
import { getFirestore, collection, addDoc, getDoc, doc, serverTimestamp, updateDoc, increment, deleteDoc, query, orderBy, where, onSnapshot, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAwVjpUANfil947xb0bjKALw2uuGvZYQcs",
  authDomain: "mytierlist-70989.firebaseapp.com",
  projectId: "mytierlist-70989",
  storageBucket: "mytierlist-70989.firebasestorage.app",
  messagingSenderId: "13881580770",
  appId: "1:13881580770:web:6f7f9148c4bf5f95add2bb"
};

// ⭐ 파이어베이스가 이미 켜져있으면 기존 것을 쓰고, 안 켜져있으면 새로 켭니다 (로그인 먹통 에러 해결!)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// 시간 변환 함수 (예: "방금 전", "3시간 전")
function timeAgo(timestamp) {
  if (!timestamp) return '알 수 없음';
  
  // 파이어베이스 Timestamp 형식을 일반 Date 객체로 변환
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  return `${Math.floor(diffInSeconds / 86400)}일 전`;
}

// 화면에 카드를 그려주는 함수
function renderCards(posts, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = ''; // 초기화

  if (posts.length === 0) {
    container.innerHTML = '<p style="color: #aaa; padding: 20px;">아직 작성된 티어리스트가 없습니다.</p>';
    return;
  }

  posts.forEach(post => {
    // 썸네일 이미지가 없으면 기본 텍스트 표시
    const thumbnailHtml = post.thumbnailUrl 
      ? `<img src="${post.thumbnailUrl}" alt="썸네일" style="width:100%; height:100%; object-fit:cover; border-radius: 8px 8px 0 0;">` 
      : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#333; color:#666; font-size: 0.9rem; border-radius: 8px 8px 0 0;">(이미지 없음)</div>`;

    const cardHtml = `
      <div class="tier-card" onclick="location.href='board.html?id=${post.id}'" style="cursor:pointer; background:#222; border-radius:8px; display:flex; flex-direction:column; height: 100%;">
        <div class="tier-card-img" style="height: 150px; width: 100%; background: #111;">
          ${thumbnailHtml}
        </div>
        <div class="tier-card-info" style="padding: 12px; display:flex; flex-direction:column; flex-grow:1; justify-content:space-between;">
          <h3 class="tier-card-title" style="margin: 0 0 8px 0; font-size:1.1rem; color:#fff;">${post.title || '무제 티어표'}</h3>
          <div>
            <div class="tier-card-meta" style="display:flex; justify-content:space-between; font-size:0.9rem; color:#aaa;">
              <span>${post.authorName || '익명'}</span>
              <span>❤️ ${post.likes || 0} &nbsp; 👁️ ${post.views || 0}</span>
            </div>
            <div class="tier-card-meta" style="margin-top: 5px; font-size: 0.8rem; color:#888;">
              <span>${timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHtml);
  });
}

// 메인 실행 함수
async function loadHomePosts() {
  try {
    // 게시판 컬렉션 이름
    const postsRef = collection(db, "tierLists"); 

    // 1. 인기글 가져오기 (좋아요 순으로 4개로 변경 - 그리드 모양에 예쁘게 맞추기 위함)
    const popularQuery = query(postsRef, orderBy("likes", "desc"), limit(4));
    const popularSnapshot = await getDocs(popularQuery);
    const popularPosts = popularSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCards(popularPosts, "popular-grid");

    // 2. 최신글 가져오기 (작성일 순으로 4개)
    const recentQuery = query(postsRef, orderBy("createdAt", "desc"), limit(4));
    const recentSnapshot = await getDocs(recentQuery);
    const recentPosts = recentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCards(recentPosts, "recent-grid");

  } catch (error) {
    console.error("데이터를 불러오는 중 에러 발생:", error);
    const popGrid = document.getElementById("popular-grid");
    const recGrid = document.getElementById("recent-grid");
    if(popGrid) popGrid.innerHTML = '<p>데이터를 불러오지 못했습니다.</p>';
    if(recGrid) recGrid.innerHTML = '<p>데이터를 불러오지 못했습니다.</p>';
  }
}

// 페이지가 로드되면 함수 실행
window.addEventListener('DOMContentLoaded', loadHomePosts);
