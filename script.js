let itemIdCounter = 0;
let currentUser = { uid: "user123", displayName: "익명" }; 
let loadedListUid = "user123"; 

const rainbowStops = [0, 30, 60, 120, 220, 270]; // 빨,주,노,초,파,보

window.updateRowColors = function() {
  const rows = document.querySelectorAll('.tier-row');
  const total = rows.length;
  if (total === 0) return;

  rows.forEach((row, index) => {
    const label = row.querySelector('.tier-label');
    let hue;
    if (total <= 6) {
      hue = rainbowStops[index] !== undefined ? rainbowStops[index] : 270;
    } else {
      const ratio = index / (total - 1);
      const p = ratio * (rainbowStops.length - 1);
      const lowIdx = Math.floor(p);
      const highIdx = Math.ceil(p);
      hue = rainbowStops[lowIdx] + (rainbowStops[highIdx] - rainbowStops[lowIdx]) * (p - lowIdx);
    }
    label.style.backgroundColor = `hsl(${hue}, 85%, 60%)`;
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
  const items = row.querySelector('.tier-items');
  while (items.firstChild) document.getElementById('item-bank').appendChild(items.firstChild);
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

window.addNewItem = function() {
  const url = document.getElementById('img-url').value;
  const title = document.getElementById('img-title').value;
  if(!url) return alert("URL을 입력하세요");
  const item = document.createElement('div');
  item.className = 'item'; item.id = 'item-' + (itemIdCounter++); item.draggable = true; item.ondragstart = window.drag;
  item.innerHTML = `<img src="${url}">${title ? `<div class="item-title">${title}</div>` : ''}`;
  document.getElementById('item-bank').appendChild(item);
  document.getElementById('img-url').value = ''; document.getElementById('img-title').value = '';
};

window.importToBank = function() {
  if(!confirm("모든 아이템을 대기열로 옮겨 새로 배치하시겠습니까?")) return;
  document.querySelectorAll('.tier-items .item').forEach(item => document.getElementById('item-bank').appendChild(item));
  loadedListUid = currentUser.uid;
  document.getElementById('btn-import-bank').style.display = 'none';
  document.querySelector('.btn-save').style.display = 'inline-block';
};

window.onload = function() {
  const board = document.getElementById('board');
  ['S','A','B','C','D','E'].forEach(l => {
    board.innerHTML += `<div class="tier-row"><div class="tier-label" contenteditable="true">${l}</div><div class="tier-items" ondrop="window.drop(event)" ondragover="window.allowDrop(event)"></div><button class="delete-tier-btn" onclick="window.deleteTier(this)">X</button></div>`;
  });
  window.updateRowColors();
};
