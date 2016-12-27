var express = require("express"),
    app = express(),
    http = require("http").Server(app),
    io = require("socket.io")(http),
    users = {};

app.use(express.static(__dirname + "/public/lib"));

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/public/view/index.html");
});

http.listen(3000, function () {
    console.log("listening on *:3000");
});

io.on("connection", function (socket) {
    socket.on("start", function () {
        if (!socket.username) {
            //allocate a random username
            var i = 0, userExists = true;
            while (userExists) {
                var newUsername = i.toString();
                if (users[newUsername] === undefined) {
                    users[newUsername] = socket;
                    socket.username = newUsername;
                    users[newUsername].skipped = [];
                    userExists = false;
                } else i++;
            }
        }
    });

    socket.on("match", function (callback) {
        var matched = false;
        //allocate a random partner
        for (var username in users) {
            if (username !== socket.username && users[socket.username].skipped.indexOf(username) === -1 && users[username].skipped.indexOf(socket.username) === -1 && users[username].partner === undefined) {
                users[username].partner = socket.username;
                users[socket.username].partner = username;
                users[username].emit("matched");
                matched = true;
                break;
            }
        }
        callback(matched);
    });

    socket.on("send message", function (message) {
        if (message.trim() !== "") {
            var partner = users[socket.username].partner;
            if (partner) {
                users[partner].emit("receive message", message);
            }
        }
    });

    socket.on("disconnect", function () {
        if (!socket.username) return;
        var partnerUsername = users[socket.username].partner;
        if (partnerUsername) {
            delete users[partnerUsername].partner;
            users[partnerUsername].emit("unmatched");
        }
        delete users[socket.username];
    });

    socket.on("skip", function (callback) {
        var partnerUsername = users[socket.username].partner;
        if (partnerUsername) {
            delete users[partnerUsername].partner;
            delete users[socket.username].partner;
            users[socket.username].skipped.push(partnerUsername);
            users[partnerUsername].emit("unmatched");
        }

        callback();
    });

    socket.on("send image", function (image) {
        var partnerUsername = users[socket.username].partner;
        if (partnerUsername) {
            users[partnerUsername].emit("receive image", image);
        }
    });
});