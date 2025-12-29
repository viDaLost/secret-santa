const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Хранилище данных (в памяти)
// Структура: { roomId: { players: [{id, name, socketId}], status: 'waiting' | 'done' } }
const rooms = {};

io.on('connection', (socket) => {
    
    // Создание комнаты
    socket.on('create_room', (playerName) => {
        const roomId = uuidv4().slice(0, 8); // Генерируем короткий ID
        rooms[roomId] = {
            players: [],
            status: 'waiting'
        };
        joinRoom(socket, roomId, playerName);
    });

    // Подключение к комнате
    socket.on('join_room', ({ roomId, playerName }) => {
        if (rooms[roomId] && rooms[roomId].status === 'waiting') {
            joinRoom(socket, roomId, playerName);
        } else {
            socket.emit('error_msg', 'Комната не найдена или игра уже началась');
        }
    });

    // Логика жеребьевки
    socket.on('start_draw', (roomId) => {
        const room = rooms[roomId];
        if (!room || room.players.length < 2) {
            socket.emit('error_msg', 'Нужно минимум 2 игрока!');
            return;
        }

        // Алгоритм "Круговой сдвиг" (гарантирует, что никто не вытянет себя)
        // 1. Перемешиваем массив игроков
        let shuffled = [...room.players];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // 2. Игрок i дарит игроку i+1, последний дарит первому
        const assignments = {};
        for (let i = 0; i < shuffled.length; i++) {
            const giver = shuffled[i];
            const receiver = shuffled[(i + 1) % shuffled.length];
            assignments[giver.socketId] = receiver.name;
        }

        room.status = 'done';
        
        // Рассылаем каждому его подопечного индивидуально
        room.players.forEach(player => {
            io.to(player.socketId).emit('draw_result', assignments[player.socketId]);
        });
    });

    socket.on('disconnect', () => {
        // Простая очистка при отключении (для MVP)
        // В реальном приложении нужна более сложная логика переподключения
        for (const roomId in rooms) {
            rooms[roomId].players = rooms[roomId].players.filter(p => p.socketId !== socket.id);
            io.to(roomId).emit('update_players', rooms[roomId].players);
            
            // Если комната пуста, удаляем её
            if(rooms[roomId].players.length === 0) {
                delete rooms[roomId];
            }
        }
    });
});

function joinRoom(socket, roomId, playerName) {
    const room = rooms[roomId];
    const player = { id: uuidv4(), name: playerName, socketId: socket.id };
    
    room.players.push(player);
    socket.join(roomId);
    
    // Отправляем игроку ID комнаты
    socket.emit('room_joined', roomId);
    
    // Обновляем список игроков для всех в комнате
    io.to(roomId).emit('update_players', room.players);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
