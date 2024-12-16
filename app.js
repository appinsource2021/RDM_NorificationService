const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const cors = require('cors');
const {spawn, exec} = require('child_process');
const io = new Server(server, {
    cors:{
        origin: [
            'http://11.21.0.10:8090',
            // 'http://192.168.2.100:3001',
            // 'http://82.165.183.133:3010'
        ]
    }
});

const clients = [];
const desktop_users = [];

const microDesktopIO = io.of('/micro-control-desktop');
const microAppIO = io.of('/micro-control-app');

// console.log('Server IO', io );

// Monitor namespace
microDesktopIO.on('connection', socket => {

    socket.on('register_desktop_user_v2', desktopUser => {


        try{
            const targetSocket = microDesktopIO.sockets.get(socket.id);
            targetSocket.desktopUser = {...desktopUser, socketId: socket.id};
            socket.emit('register_desktop_user', {
                status: true,
                user: targetSocket.desktopUser
            });


            const socketsValues = Array.from(microDesktopIO.sockets.values());
            const desktopUsers = socketsValues.filter(item => item.desktopUser !== undefined ).map( item => item.desktopUser );
            console.log('microDesktopIO_ForEach_socket', desktopUsers );

            // Response to Desktop Users
            microDesktopIO.emit('registered_desktop_users', desktopUsers);
            // Response to App Users
            microAppIO.emit('registered_desktop_users', desktopUsers );




            // microDesktopIO.sockets.forEach(socket => {
            //     console.log('microDesktopIO_ForEach_socket', socket);
            // });


            // Response to Desktop Users
            // microDesktopIO.emit('registered_desktop_users', microDesktopIO.sockets.forEach(data => {
            //
            // });

            // Response to App Users
            // microAppIO.emit('registered_desktop_users', desktop_users );

        } catch (e){
            socket.emit('register_desktop_user', {
                status: false,
                message: e.message
            });
        }


        // console.log('microDesktopIO', microDesktopIO.sockets);
        return ;

        try{
            const newData = { ...desktopUser };
            newData.socketId = socket.id;
            let status = "";
            const exitsUserIndex = desktop_users.findIndex( item => item.id === newData.id );

            console.log('exitsUserIndex', exitsUserIndex);
            if( exitsUserIndex > -1 ){
                status = "User Updated";
                if( typeof newData === "object" ){
                    // console.log('Current desktop users by Update', status, desktop_users );
                    desktop_users.splice(exitsUserIndex, 1, newData );
                }
            }
            else {
                status = "User New Created";
                // console.log('Current desktop users By Add', status, desktop_users, newData );
                if( typeof newData === "object" ){
                    // console.log('Current desktop users By Add', typeof newData, desktopUser );
                    desktop_users.push(newData);
                }
            }

            // desktop_users.push(newData);

            // console.log('Registered Desktop User', newData.id, desktop_users, exitsUserIndex, status );

            // Response registered user to Desktop back
            socket.emit('register_desktop_user', {
                status: true,
                user: newData
            });

            console.log('Registered Desktop Users', desktop_users );

            // 👉
            // Response to Desktop Users
            microDesktopIO.emit('registered_desktop_users', desktop_users );


            // Response to App Users
            microAppIO.emit('registered_desktop_users', desktop_users );

        } catch (e) {
            // console.log('register_desktop_user', e.message);
            socket.emit('register_desktop_user', {
                status: false,
                message: e.message
            });
        }
    });

    socket.on('bann_desktop_user', onlineUserSocketId => {
        microDesktopIO.to(onlineUserSocketId).emit('banned_desktop_user', {
            route: "/api/auth/logout"
        } );
    });
    // App request App direct request
    // socket.emit('registered_desktop_users', desktop_users );

    socket.on('send_message_user_to_user', data => {
        console.log('send_message_user_to_user', data);
        microDesktopIO.to(data['targetSocketId']).emit('receive_message_user_from_user', data );
    });





    // Ekran paylaşım isteği
    socket.on('requestScreenShare', ({receiverId, requesterId}) => {
        microDesktopIO.to(receiverId).emit('receiveScreenShareRequest', requesterId );
    });

    // WebRTC teklifini hedefe gönder
    socket.on('sendOffer', ({ requesterId, offerId, offer, screenSharedUser, publicIp }) => {
        // socket.id ekran görüntüsünü paylasanin id'si (from)
        // microDesktopIO.to(requesterId).emit('receiveOffer', { from: socket.id, offer });
        microDesktopIO.to(requesterId).emit('receiveOffer', { from: offerId, offer, screenSharedUser, publicIp });
    });

    // WebRTC cevabını geri gönder
    socket.on('sendAnswer', ({ socketId, answer, publicIp }) => {
        microDesktopIO.to(socketId).emit('receiveAnswer', { from: socket.id, answer, publicIp });
    });

    // ICE adaylarını aktar
    socket.on('sendIceCandidate', ({ requesterId, candidate }) => {
        microDesktopIO.to(requesterId).emit('receiveIceCandidate', { from: socket.id, candidate });
    });

    socket.on('peerDisconnect', ({ offerFromSocketId }) => {
        microDesktopIO.to(offerFromSocketId).emit('peerDisconnected');
    });

    // To All users
    socket.on('liveProjectEvaluate', data => {
        microDesktopIO.emit('liveProjectEvaluate', data);
    })




    socket.on('disconnect', data => {

        // console.log('Desktop Users Before disconnect', Array.from(microDesktopIO.sockets.keys()));
        // microDesktopIO.emit('registered_desktop_users', Array.from(microDesktopIO.sockets.values()) );

        const socketsValues = Array.from(microDesktopIO.sockets.values());
        const desktopUsers = socketsValues.filter(item => item.desktopUser !== undefined ).map( item => item.desktopUser );

        // Response to Desktop Users
        microDesktopIO.emit('registered_desktop_users', desktopUsers );

        // Response to App Users
        microAppIO.emit('registered_desktop_users', desktopUsers );

        // If any time App user inside Desktop User, than should quit from Access Control
        microAppIO.emit('desktop-user-disconnected', socket.id );


        // console.log('Desktop user disconnect', foundedDesktopUser, socket.id, desktop_users );
        // Remove User From Desktop users
        // const foundedDesktopUser = desktop_users.findIndex( item => item.socketId = socket.id );
        //
        // if( foundedDesktopUser > -1 ){
        //     console.log('foundedDesktopUser',foundedDesktopUser);
        //     delete desktop_users[foundedDesktopUser];
        //     // desktop_users.splice( foundedDesktopUser, 1);
        //     // Response to App Users
        //     microAppIO.emit('registered_desktop_users', desktop_users );
        //     microDesktopIO.emit('registered_desktop_users', desktop_users );
        //
        //     // If any time App user inside Desktop User, than should quit from Access Control
        //     microAppIO.emit('desktop-user-disconnected', socket.id );
        // }
    });

    // Send data to connected monitor
    // Safe Payment
    // socket.emit('monitor_joined', boards );
    // If Board Joined
    socket.on('sp', data => {
        // Send data to monitors
        console.log('show-button', data);
        socket.emit('sp', data );

        // Memorize
        // Find Socket user
        const socketUserIndex = desktop_users.findIndex( item => item.socketId === socket.id );
        if( socketUserIndex > -1 ){
            desktop_users[socketUserIndex].payment = data;
        }

    });

    // Safe workers
    socket.on('sw', data => {
        // Send data to monitors
        console.error('show-guest-employee Forwarded from App', data);
        socket.emit('sw', data );

        // Memorize
        // Find Socket user
        const socketUserIndex = desktop_users.findIndex( item => item.socketId === socket.id );
        if( socketUserIndex > -1 ){
            desktop_users[socketUserIndex].filter = data;
        }

    });

    // Show workers with Filter
    socket.on('mode', data => {
        // Send data to monitors
        console.log('Show Payment from App request', data, data['targetSocketId'] );
        // socket.emit('sw', data );

        microDesktopIO.to(data['targetSocketId']).emit('mode', data )
    });


});


microAppIO.on('connection', socket => {

        socket.on('request_connected_desktops', data => {
            // Response to App Users
            socket.emit('registered_desktop_users', desktop_users );
        });

        socket.on('request_connected_desktops', data => {
            // Response to App Users
            socket.emit('registered_desktop_users', desktop_users );
        });

        // Show workers with Filter
        socket.on('sw', data => {
            // Send data to monitors
            console.log('show-employee-filter from App request', data, data['targetSocketId'] );
            // socket.emit('sw', data );

            microDesktopIO.to(data['targetSocketId']).emit('sw', data['employeeFilter'] )
        });

        // Show workers with Filter
        socket.on('mode', data => {
            // Send data to monitors
            console.log('Show Payment from App request', data, data['targetSocketId'] );
            // socket.emit('sw', data );

            microDesktopIO.to(data['targetSocketId']).emit('mode', data )
        });

    });



// microControlIO.on("disconnect", (socket) => {
//     console.log('Desktop user disconnect', socket.id );
//     // Remove User From Desktop users
//     const foundedDesktopUser = desktop_users.findIndex( item => item.socketId = socket.id );
//     if( foundedDesktopUser > -1 ){
//
//         desktop_users.splice( foundedDesktopUser, 1);
//
//         // Response to App Users
//         socket.emit('registered_desktop_users', desktop_users );
//
//     }
//
// });

// Enable CORS for all routes
app.use(cors());

app.get('/micro-control', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});
