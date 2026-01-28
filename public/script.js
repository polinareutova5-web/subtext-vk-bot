const API_URL = "https://script.google.com/macros/s/AKfycbz9nJ9u4GgcWIAqBedgJ4A_ojIJoiKcQCtjpzLVimEwIeIOfMZiKn60TrUQFRJotGSn6Q/exec";

let userId;
let username = "";

// ================= UI =================
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById(sectionId);
  if(el) el.classList.remove('hidden');
}

function confirmBuy(index, name, price) {
  if (confirm(`Хотите купить?\n\n${name}\nЦена: ${price} монет`)) {
    buyItem(index);
  }
}

// ================= LOAD DATA =================
async function loadData() {
  const params = new URLSearchParams(window.location.search);
  userId = params.get('id');

  if (!userId) {
    document.getElementById('loading').textContent = '❌ Не указан ID';
    return;
  }

  try {
    // проверка регистрации
    const checkRes = await fetch(`${API_URL}?action=check_user&userId=${encodeURIComponent(userId)}`);
    const checkData = await checkRes.json();

    if (!checkData.success) {
      document.getElementById('loading').textContent = '❌ Вы не зарегистрированы';
      return;
    }

    // загружаем кабинет
    await loadCabinet();

  } catch (e) {
    console.error(e);
    document.getElementById('loading').textContent = '❌ Ошибка соединения';
  }
}

// ================= CABINET =================
async function loadCabinet() {
  try {
    const res = await fetch(`${API_URL}?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error();

    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const u = data.user;
    username = u.username || "";

    // Профиль
    document.getElementById('username').textContent = u.username || '—';
    document.getElementById('level').textContent = u.level || '—';
    document.getElementById('progress').textContent = u.progress || 0;
    document.getElementById('coins').textContent = u.coins || 0;
    document.getElementById('lesson-link').textContent = u.link || "Не указана";
    document.getElementById('lesson-schedule').textContent = u.schedule || "Не указано";

    const avatarImg = document.getElementById('avatar-img');
    avatarImg.src = u.avatarUrl || "https://via.placeholder.com/120/2e7d32/FFFFFF?text=👤";

    // Уроки
    const lessonsList = document.getElementById('lessons-list');
    lessonsList.innerHTML = data.lessons.length
      ? data.lessons.map(l => `
        <div class="lesson-card">
          <strong>Урок ${l.num}</strong><br>
          <a href="${l.link}" target="_blank">Материалы</a>
          ${l.hwLink && l.hwLink !== '-' ? `<br><a href="${l.hwLink}" target="_blank">ДЗ</a>` : ''}
        </div>
      `).join('')
      : '<p>Нет доступных уроков.</p>';

    // Магазин
    const shopItems = document.getElementById('shop-items');
    document.getElementById('shop-coins').textContent = u.coins;
    shopItems.innerHTML = data.shop.length
      ? data.shop.map((item, idx) => `
        <div class="shop-item">
          ${item.image ? `<div style="height:120px;display:flex;align-items:center;justify-content:center;margin-bottom:.5rem"><img src="${item.image}" style="max-width:100%;max-height:100%;object-fit:contain"></div>` : ''}
          <h3>${item.name}</h3>
          <div class="price">${item.price} монет</div>
          <button class="buy-btn" onclick="confirmBuy(${idx}, \`${item.name}\`, ${item.price})">Купить</button>
        </div>
      `).join('')
      : '<p>Магазин пуст.</p>';

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
    showSection('profile');

    // Загружаем слоты
    await loadSlots();

  } catch (e) {
    console.error(e);
    document.getElementById('loading').textContent = '❌ Ошибка загрузки кабинета';
  }
}

// ================= SLOTS =================
async function loadSlots() {
  try {
    const res = await fetch(`${API_URL}?action=get_slots&userId=${encodeURIComponent(userId)}`);
    const data = await res.json();

    if(!data.success) throw new Error("Не удалось загрузить слоты");

    const box = document.getElementById("slots");
    box.innerHTML = "";

    // свободные слоты
    data.slots.forEach(s => {
      const btn = document.createElement("button");
      btn.className = "slot-btn";
      btn.textContent = `${s.date} · ${s.time}`;
      btn.onclick = () => {
        if(confirm(`Хотите записаться на ${s.date} · ${s.time}?`)) {
          bookSlot(s.id);
        }
      };
      box.appendChild(btn);
    });

    // твой слот
    const mySlotDiv = document.getElementById("mySlot");
    if(data.mySlot) {
      mySlotDiv.innerHTML = `<p>Ваш слот: <strong>${data.mySlot.date} · ${data.mySlot.time}</strong> <button onclick="cancelSlot('${data.mySlot.id}')">Отменить</button></p>`;
    } else {
      mySlotDiv.innerHTML = "<p>Вы ещё не записаны на слот</p>";
    }

  } catch (e) {
    console.error(e);
    alert("Ошибка соединения с сервером при загрузке слотов");
  }
}

async function bookSlot(slotId) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "book_slot",
        slotId,
        userId,
        username
      })
    });

    const data = await res.json();
    if(data.success) {
      alert("✅ Вы записались на слот!");
      loadSlots();
    } else {
      alert("❌ " + (data.error || "Слот уже занят"));
      loadSlots();
    }
  } catch (e) {
    console.error(e);
    alert("❌ Ошибка соединения с сервером при записи на слот");
  }
}

async function cancelSlot(slotId) {
  try {
    if(!confirm("Вы уверены, что хотите отменить слот?")) return;

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "cancel_slot",
        slotId,
        userId
      })
    });

    const data = await res.json();
    if(data.success) {
      alert("✅ Слот отменён");
      loadSlots();
    } else {
      alert("❌ " + (data.error || "Нельзя отменить слот"));
      loadSlots();
    }
  } catch (e) {
    console.error(e);
    alert("❌ Ошибка соединения с сервером при отмене слота");
  }
}

// ================= HOMEWORK =================
async function submitHomework() {
  const text = document.getElementById('hwText').value.trim();
  const fileInput = document.getElementById('hwImage');
  const file = fileInput.files[0];

  if (!file && !text) {
    alert("Введите текст или прикрепите фото");
    return;
  }

  try {
    if (file) {
      if (!file.type.match(/image\/(jpeg|png|gif)/)) {
        alert("Поддерживаются JPG, PNG, GIF");
        return;
      }

      const base64 = await new Promise(resolve => {
        const r = new FileReader();
        r.onload = () => resolve(r.result.split(",")[1]);
        r.readAsDataURL(file);
      });

      const payload = { action:"submit_homework", userId, username, lessonNum:0, text, fileName:file.name, fileBase64:base64 };
      const res = await fetch(API_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)});
      const data = await res.json();
      document.getElementById('hwStatus').textContent = data.success ? "✅ ДЗ отправлено!" : "❌ "+data.error;
      if(data.success){ document.getElementById('hwText').value=""; fileInput.value=""; }

    } else {
      const res = await fetch(`${API_URL}?action=submit_homework&userId=${encodeURIComponent(userId)}&homeworkText=${encodeURIComponent(text)}&lessonNum=0`);
      const data = await res.json();
      document.getElementById('hwStatus').textContent = data.success ? "✅ ДЗ отправлено!" : "❌ "+data.error;
      if(data.success) document.getElementById('hwText').value="";
    }
  } catch {
    document.getElementById('hwStatus').textContent = "❌ Ошибка отправки";
  }
}

// ================= SHOP =================
async function buyItem(index) {
  try {
    const res = await fetch(`${API_URL}?action=buy_item&userId=${userId}&lessonNum=${index}`);
    const data = await res.json();
    if(data.success){ alert("✅ Куплено!"); location.reload(); }
    else alert("❌ " + data.error);
  } catch { alert("❌ Ошибка соединения"); }
}

// ================= INIT =================
window.addEventListener("load", loadData);
