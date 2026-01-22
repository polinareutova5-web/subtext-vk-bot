const API_URL = "https://script.google.com/macros/s/AKfycbzf5Nxa5O4J1smRP8kM4edKK-SMEuXR6ECnCqN87ktDMndIZ6-7LDbt9MkGdtVIlPx8iA/exec";

let userId;
let selectedFile = null;

// Функция для очистки формы
function clearHomeworkForm() {
  document.getElementById('hwText').value = '';
  document.getElementById('hwFile').value = '';
  selectedFile = null;
  document.getElementById('hwStatus').textContent = '';
}

// Обработчик выбора файла
document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('hwFile');
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      selectedFile = e.target.files[0];
      if (selectedFile) {
        console.log('Выбран файл:', selectedFile.name, selectedFile.type);
        
        // Если файл изображение - предпросмотр
        if (selectedFile.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = function(e) {
            // Показываем миниатюру
            const statusEl = document.getElementById('hwStatus');
            statusEl.innerHTML = `
              <div style="margin: 10px 0;">
                <strong>Выбрано изображение:</strong><br>
                <img src="${e.target.result}" style="max-width: 200px; max-height: 150px; margin-top: 5px; border-radius: 5px;">
              </div>
            `;
          };
          reader.readAsDataURL(selectedFile);
        } else {
          document.getElementById('hwStatus').innerHTML = `
            <div style="margin: 10px 0;">
              <strong>Выбран файл:</strong> ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(2)} KB)
            </div>
          `;
        }
      }
    });
  }
});

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
        return `
        <div class="shop-item">
          ${item.image ? `
            <div style="height: 150px; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; overflow: hidden; border-radius: 8px;">
              <img src="${item.image}" 
                   alt="${item.name}" 
                   style="max-width: 100%; max-height: 100%; object-fit: contain;"
                   onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div style=\'color:#666;font-size:0.9rem\'>Нет изображения</div>'">
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

// Основная функция отправки ДЗ
async function submitHomework() {
  const text = document.getElementById('hwText').value.trim();
  const file = selectedFile;
  
  if (!text && !file) {
    alert('Пожалуйста, введите текст ответа или прикрепите файл.');
    return;
  }

  document.getElementById('hwStatus').innerHTML = '<div style="color: #666;">⏳ Отправка ДЗ...</div>';

  try {
    let submissionText = '';
    
    // Если есть файл - загружаем его
    if (file) {
      submissionText = await uploadFileToDrive(file, text);
    } else {
      // Если только текст
      submissionText = text;
    }
    
    // Отправляем на сервер
    const encodedText = encodeURIComponent(submissionText);
    const url = `${API_URL}?action=submit_homework&userId=${userId}&homeworkText=${encodedText}&lessonNum=0`;

    const res = await fetch(url);
    const data = await res.json();
    
    if (data.success) {
      document.getElementById('hwStatus').innerHTML = `
        <div style="color: #2e7d32; background: #e8f5e9; padding: 10px; border-radius: 6px;">
          ✅ <strong>ДЗ успешно отправлено!</strong><br>
          ${file ? `Файл: ${file.name}` : ''}
        </div>
      `;
      clearHomeworkForm();
    } else {
      document.getElementById('hwStatus').innerHTML = `
        <div style="color: #d32f2f; background: #ffebee; padding: 10px; border-radius: 6px;">
          ❌ <strong>Ошибка:</strong> ${data.error || 'Не удалось отправить'}
        </div>
      `;
    }
  } catch (err) {
    console.error('Ошибка отправки ДЗ:', err);
    document.getElementById('hwStatus').innerHTML = `
      <div style="color: #d32f2f; background: #ffebee; padding: 10px; border-radius: 6px;">
        ❌ <strong>Ошибка соединения.</strong><br>
        <small>Попробуйте отправить ссылку на файл в текстовом поле.</small>
      </div>
    `;
  }
}

// Функция для загрузки файла (упрощенная версия)
async function uploadFileToDrive(file, additionalText = '') {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const base64Data = e.target.result.split(',')[1];
      
      // Формируем текст для отправки
      let resultText = additionalText ? `${additionalText}\n\n` : '';
      resultText += `[ПРИКРЕПЛЕН ФАЙЛ]\n`;
      resultText += `Имя: ${file.name}\n`;
      resultText += `Тип: ${file.type}\n`;
      resultText += `Размер: ${(file.size / 1024).toFixed(2)} KB\n`;
      resultText += `Base64 (первые 500 символов): ${base64Data.substring(0, 500)}...`;
      
      resolve(resultText);
    };
    reader.readAsDataURL(file);
  });
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
