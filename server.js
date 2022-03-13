const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUser } = require('./utils/users');


const app = express();
const server = http.createServer(app);
const io = socketio(server);

//set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'Chatroom Bot'; 

// Run socket when client connects
io.on('connection', socket => {
    console.log('New Client connect to WS...');

    //get user joining room
    socket.on('joinRoom', ({ username, room }) => {

        const user = userJoin( socket.id, username, room );
        socket.join(user.room);

        //Welcome current user
        socket.emit('message', formatMessage(botName, `Welcome to Rooms: [ ${user.room} ]`) );

        // Broadcast message to all other user that new user connect
        socket.broadcast.to(user.room).emit('message', formatMessage(botName, `${user.username} has joined the chat!`) );

        // send user and room infor
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUser(user.room)
        });
    });


    //Liten to chat messages
    socket.on('chatMessage', (msg) => {
        //get current user
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit('message', formatMessage(user.username??'USER', msg));
    });

    //Runs when client disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if ( user ) {
            io.to(user.room).emit('message', formatMessage(botName, `${user.username} had left the chat!`) );

            // send an update of user and room infor
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUser(user.room)
            });
        }
        
    });
});

const PORT = 3000 || process.env.PORT;

server.listen(PORT, () => console.log(`Server running on Port: ${PORT}`));
