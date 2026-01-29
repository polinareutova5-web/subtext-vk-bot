const API_URL = "https://script.google.com/macros/s/AKfycbyLoGwGBdWMlKHNplkwFC9mTFjTaWf6WcCismxRnkLZ0OkZ_Weoj-O54Jtbchbj7cO2DQ/exec";

let userId;
let username = "";

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(el => el.classList.add('hidden'));
  const el = document.getElementById(sectionId);
  if (el) el.classList.remove('hidden');
}

function confirmBuy(index, name, price) {
  if (confirm(`Хотите купить?\n\n${name}\nЦена: ${price} монет`)) {
    buyItem(index);
  }
}

async function loadData() {
  const params = new URLSearchParams(window.location.search);
  userId = params.get('id');

  if (!userId) {
    document.getElementById('loading').textContent = '❌ Не указан ID';
    return;
  }

  try {
    const checkRes = await fetch(`${API_URL}?action=check_user&userId=${encodeURIComponent(userId)}`);
    const checkData = await checkRes.json();

    if (!checkData.exists) {
      document.getElementById('loading').textContent = '❌ Вы не зарегистрированы';
      return;
    }

    await loadCabinet();

  } catch (e) {
    console.error(e);
    document.getElementById('loading').textContent = '❌ Ошибка соединения';
  }
}

async function loadCabinet() {
  const res = await fetch(`${API_URL}?userId=${encodeURIComponent(userId)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error);

  const u = data.user;
  username = u.username || "";

  document.getElementById('username').textContent = u.username || '—';
  document.getElementById('level').textContent = u.level || '—';
  document.getElementById('progress').textContent = u.progress || 0;
  document.getElementById('coins').textContent = u.coins || 0;
  document.getElementById('lesson-link').textContent = u.link || "Не указана";
  document.getElementById('lesson-schedule').textContent = u.schedule || "Не указано";

  document.getElementById('avatar-img').src =
    u.avatarUrl || "https://via.placeholder.com/120/2e7d32/FFFFFF?text=👤";

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('main').classList.remove('hidden');
  showSection('profile');

  await loadSlots();
}

async function loadSlots() {
  const res = await fetch(`${API_URL}?action=get_slots&userId=${encodeURIComponent(userId)}`);
  const data = await res.json();
  if (!data.success) throw new Error();

  const box = document.getElementById("slots");
  box.innerHTML = `<h3 style="grid-column:1/-1;text-align:center">СЛОТЫ</h3>`;

  const hasMySlot = !!data.mySlot;

  data.slots.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "slot-btn";
    btn.textContent = `${s.date} · ${s.time}`;

    if (hasMySlot) {
      btn.disabled = true;
      btn.style.opacity = "0.5";
    } else {
      btn.onclick = () => {
        if (confirm(`Записаться на ${s.date} · ${s.time}?`)) {
          bookSlot(s.id);
        }
      };
    }

    box.appendChild(btn);
  });

  const mySlotDiv = document.getElementById("mySlot");
  if (data.mySlot) {
    mySlotDiv.innerHTML = `
      <p style="color:#b71c1c">
        ❤️ Ваш слот: <strong>${data.mySlot.date} · ${data.mySlot.time}</strong><br>
        <button onclick="cancelSlot('${data.mySlot.id}')">Отменить</button>
      </p>`;
  } else {
    mySlotDiv.innerHTML = "<p>Вы ещё не записаны на слот</p>";
  }
}

async function bookSlot(slotId) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "book_slot", slotId, userId, username })
  });
  const data = await res.json();
  alert(data.success ? "✅ Вы записались!" : "❌ " + data.error);
  loadSlots();
}

async function cancelSlot(slotId) {
  if (!confirm("Отменить слот?")) return;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "cancel_slot", slotId, userId })
  });
  const data = await res.json();
  alert(data.success ? "✅ Слот отменён" : "❌ " + data.error);
  loadSlots();
}

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
      const base64 = await new Promise(resolve => {
        const r = new FileReader();
        r.onload = () => resolve(r.result.split(",")[1]);
        r.readAsDataURL(file);
      });

      const payload = {
        action: "submit_homework",
        userId,
        username,
        lessonNum: 0,
        text,
        fileName: file.name,
        fileBase64: base64
      };

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      document.getElementById('hwStatus').textContent =
        data.success ? "✅ ДЗ отправлено!" : "❌ " + data.error;

    } else {
      const res = await fetch(
        `${API_URL}?action=submit_homework&userId=${userId}&homeworkText=${encodeURIComponent(text)}&lessonNum=0`
      );
      const data = await res.json();
      document.getElementById('hwStatus').textContent =
        data.success ? "✅ ДЗ отправлено!" : "❌ " + data.error;
    }
  } catch {
    document.getElementById('hwStatus').textContent = "❌ Ошибка отправки";
  }
}

async function buyItem(index) {
  const res = await fetch(`${API_URL}?action=buy_item&userId=${userId}&lessonNum=${index}`);
  const data = await res.json();
  alert(data.success ? "✅ Куплено!" : "❌ " + data.error);
  if (data.success) location.reload();
}

window.addEventListener("load", loadData);
