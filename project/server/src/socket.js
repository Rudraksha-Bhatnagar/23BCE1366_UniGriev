const { Server } = require('socket.io');

let _io = null;

module.exports = {
    init: (server) => {
        _io = new Server(server, {
            cors: {
                origin: 'http://localhost:5173',
                credentials: true,
            },
        });

        _io.on('connection', (socket) => {
            socket.on('joinRoom', (userId) => {
                if (userId) {
                    socket.join(userId.toString());
                }
            });

            socket.on('disconnect', () => {});
        });

        return _io;
    },

    getIO: () => _io,
};
