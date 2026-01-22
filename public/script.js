const API_URL = "https://script.google.com/macros/s/AKfycbzf5Nxa5O4J1smRP8kM4edKK-SMEuXR6ECnCqN87ktDMndIZ6-7LDbt9MkGdtVIlPx8iA/exec";

let userId;

// Функция для преобразования ссылки Яндекс Диска в прямую
function convertYandexLink(link) {
  if (!link) return '';
  
  // Если это уже прямая ссылка на изображение, оставляем как есть
  if (link.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return link;
  
  // Если это ссылка Яндекс Диска
  if (link.includes('yadi.sk') || link.includes('disk.yandex.ru')) {
    // Преобразуем в прямую ссылку для скачивания
    // Формат: https://getfile.dokpub.com/yandex/get/[ключ]
    const match = link.match(/\/d\/([^\/\?]+)/);
    if (match) {
      return `https://getfile.dokpub.com/yandex/get/${match[1]}`;
    }
    
    // Альтернативный формат для новых ссылок
    const match2 = link.match(/\/[^\/]+\/([^\/\?]+)/);
    if (match2) {
      return `https://getfile.dokpub.com/yandex/get/${match2[1]}`;
    }
  }
  
  return link;
}

function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(el => {
    el.classList.add('hidden');
  });
  document.getElementById(sectionId).classList.remove('hidden');
}

function confirmBuy(index, name, price) {
  const confirmed = confirm(`Хотите купить?\n\n${name}\nЦена: ${price} монет`);
  if (confirmed) {
    buyItem(index);
  }
}

async function loadData() {
  const urlParams = new URLSearchParams(window.location.search);
  userId = urlParams.get('id');
  
  if (!userId) {
    document.getElementById('loading').textContent = '❌ Не указан ID ученика';
    return;
  }

  try {
    const res = await fetch(`${API_URL}?userId=${userId}`);
    const data = await res.json();

    if (!data.success) {
      document.getElementById('loading').textContent = `❌ Ошибка: ${data.error}`;
      return;
    }

    const u = data.user;
    document.getElementById('username').textContent = u.username || '—';
    document.getElementById('level').textContent = u.level || '—';
    document.getElementById('progress').textContent = u.progress || 0;
    document.getElementById('coins').textContent = u.coins || 0;

    // Уроки
    const lessonsList = document.getElementById('lessons-list');
    if (data.lessons.length > 0) {
      lessonsList.innerHTML = data.lessons.map(l => 
        `<div class="lesson-card">
           <strong>Урок ${l.num}</strong><br>
           <a href="${l.link}" target="_blank">Материалы</a>
           ${l.hwLink ? `<br><a href="${l.hwLink}" target="_blank">ДЗ</a>` : ''}
         </div>`
      ).join('');
    } else {
      lessonsList.innerHTML = '<p>Нет доступных уроков.</p>';
    }

    // Магазин
    const shopItems = document.getElementById('shop-items');
    document.getElementById('shop-coins').textContent = u.coins;

    if (data.shop.length > 0) {
      shopItems.innerHTML = data.shop.map((item, idx) => {
        const imageUrl = convertYandexLink(item.image);
        return `
        <div class="shop-item">
          ${imageUrl ? `
            <div style="height: 150px; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; overflow: hidden; border-radius: 8px;">
              <img src="${imageUrl}" 
                   alt="${item.name}" 
                   style="max-width: 100%; max-height: 100%; object-fit: contain;"
                   onerror="this.src='https://via.placeholder.com/150x150?text=Нет+изображения'">
            </div>
          ` : ''}
          <h3>${item.name}</h3>
          <div class="price">${item.price} монет</div>
          <button class="buy-btn" onclick="confirmBuy(${idx}, \`${item.name.replace(/'/g, "\\'")}\`, ${item.price})">Купить</button>
        </div>`;
      }).join('');
    } else {
      shopItems.innerHTML = '<p>Магазин пуст.</p>';
    }

    document.getElementById('loading').classList.add('hidden');
    document.getElementById('main').classList.remove('hidden');
    showSection('profile');

  } catch (err) {
    console.error('Ошибка загрузки:', err);
    document.getElementById('loading').textContent = '❌ Не удалось загрузить данные.';
  }
}

// === ОТПРАВКА ДЗ ЧЕРЕЗ GET ===
async function submitHomework() {
  const text = document.getElementById('hwText').value.trim();
  if (!text) {
    alert('Введите текст или ссылку на файл.');
    return;
  }

  const encodedText = encodeURIComponent(text);
  const url = `${API_URL}?action=submit_homework&userId=${userId}&homeworkText=${encodedText}&lessonNum=0`;

  document.getElementById('hwStatus').textContent = 'Отправка...';

  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.success) {
      document.getElementById('hwStatus').textContent = '✅ ДЗ отправлено!';
      document.getElementById('hwText').value = '';
    } else {
      document.getElementById('hwStatus').textContent = `❌ Ошибка: ${data.error}`;
    }
  } catch (err) {
    console.error('Ошибка ДЗ:', err);
    document.getElementById('hwStatus').textContent = '❌ Не удалось отправить.';
  }
}

// === ПОКУПКА ЧЕРЕЗ GET ===
async function buyItem(index) {
  const url = `${API_URL}?action=buy_item&userId=${userId}&lessonNum=${index}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.success) {
      alert('✅ Куплено!');
      location.reload();
    } else {
      alert(`❌ ${data.error || 'Не удалось совершить покупку'}`);
    }
  } catch (err) {
    console.error('Ошибка покупки:', err);
    alert('❌ Ошибка соединения.');
  }
}

loadData();
