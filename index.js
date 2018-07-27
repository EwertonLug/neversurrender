
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static(__dirname));//Use esse diretorio
//io.attach(4567);
http.listen(process.env.PORT || 3000, function(){
	console.log('Ouvindo a porta": 3000');
});
var game = require("./neversurrender");

io.on('connection', function(socket){
	//console.log('client connected');
    game.initGame(io, socket);
});
	
console.log("---------Server is running-----------");
	