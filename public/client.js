const socket = io();

// Элементы DOM
const loginScreen = document.getElementById('login-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const resultScreen = document.getElementById('result-screen');

const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room-input');
const playersList = document.getElementById('players-list');
const displayRoomId = document.getElementById('display-room-id');
const targetNameDisplay = document.getElementById('target-name');

// Проверка URL на наличие ID комнаты (для пригласительных ссылок)
const urlParams = new URLSearchParams(window.location.search);
const roomFromUrl = urlParams.get('room');
if (roomFromUrl) {
    roomInput.value = roomFromUrl;
}

// 1. Создание комнаты
document.getElementById('btn-create').addEventListener('click', () => {
    const name = usernameInput.value;
    if (!name) return alert('Введите имя!');
    socket.emit('create_room', name);
});

// 2. Вход в комнату
document.getElementById('btn-join').addEventListener('click', () => {
    const name = usernameInput.value;
    const roomId = roomInput.value;
    if (!name || !roomId) return alert('Введите имя и код комнаты!');
    socket.emit('join_room', { roomId, playerName: name });
});

// 3. Запуск жеребьевки
document.getElementById('btn-start').addEventListener('click', () => {
    const roomId = displayRoomId.innerText;
    socket.emit('start_draw', roomId);
});

// 4. Копирование ссылки
document.getElementById('btn-copy').addEventListener('click', () => {
    const roomId = displayRoomId.innerText;
    const url = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
        alert('Ссылка скопирована!');
    });
});

// --- Обработка событий от сервера ---

socket.on('room_joined', (roomId) => {
    loginScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');
    displayRoomId.innerText = roomId;
    
    // Обновляем URL без перезагрузки страницы для удобства
    const newUrl = `${window.location.pathname}?room=${roomId}`;
    window.history.pushState({path: newUrl}, '', newUrl);
});

socket.on('update_players', (players) => {
    playersList.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        li.textContent = `🎅 ${p.name}`;
        playersList.appendChild(li);
    });
});

socket.on('draw_result', (targetName) => {
    lobbyScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    targetNameDisplay.textContent = targetName;
});

socket.on('error_msg', (msg) => {
    alert(msg);
});
