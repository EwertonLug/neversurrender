var io;
var gameSocket;
var shortId = require('shortid');
var clients = [];

//var rooms = [];
/*
 * Esta função é chamada por index.js para inicializar uma nova instância do jogo.
 *
 * @param sio A biblioteca Socket.IO
 * @param socket O objeto socket para o cliente conectado.
 */

exports.initGame = function(sio, socket){

    io = sio;
    gameSocket = socket;
	
    gameSocket.emit('connected', { message: "You are connected!" });
	var currentUser;

	
	 /**
	 * O botão 'START' foi clicado e o evento 'hostCreateNewGame' ocorreu.
	 * Aqui o cliente cria e entra na sala criada
	 */
	gameSocket.on('hostCreateNewGame', function (data) {
		
	   // Cria uma sala Socket.IO exclusiva
	    var thisGameId = ( Math.random() * 100000 ) | 0;
		// Retorna o ID do quarto (gameId) e o ID do soquete (mySocketId) para o cliente que chamou
	    this.emit('newGameCreated', gameInfo = {gameId: thisGameId, mySocketId: this.id});
		// Junte-se à sala e espere os jogadores
	    this.join(thisGameId.toString());

		console.log("Cliente "+data.playerName+" criou e entrou na sala "+thisGameId);
		
	});
  
	/**
	* Um jogador clicou no botão "START GAME".
	* Tente conectá-los ao quarto que corresponde
	* o gameId inserido pelo jogador.
	* @param data Contém dados inseridos através da entrada do jogador - playerName e gameId.
	* Caso der erro retorna um "failJoinGame"
	*/
	gameSocket.on("playerJoinGame",function (data) {
	    // A reference to the player's Socket.IO socket object
	    var sock = this;
	   // Procure o ID da sala no objeto gerenciador Socket.IO.
	    var room = gameSocket.adapter.rooms[data.gameId];
	    
	    
	    // Se a sala existir...
	    if( room != undefined){
	    	findRooms();
	    	//Pege o numero de clientes na sala
	    	var numberClients = numberClientsRoom(data.gameId);
	  
	    	//Se numero de clientes igual a 2 manda um emit
		    if(numberClients == 4){
		    	this.emit('failJoinGame',{message: "Full room! Enter another room"} );
		    	console.log("O game:"+data.gameId+" ja esta cheio!");
		    	return;
		    }
	       // Anexe o ID do soquete ao objeto de dados.
	        data.mySocketId = sock.id;
			
	        // Juste-se à sala
	        sock.join(data.gameId);

	       // Envia uma notificação de que foi conectado a sala
		   this.emit('playerJoinedRoom', data);
		   console.log('Player ' + data.playerName + ' attempting to join game: ' + data.gameId );

	    } else {
	        // Retorna uma mensagem de erro para o player caso a sala não exista.
	        this.emit('failJoinGame',{message: "This room does not exist."} );
	        console.log("O game:"+data.gameId+" não existe!");
	    }
	});
	gameSocket.on("exitGameRoom",function (data) {
		
		console.log("O cliente "+currentUser.id+" deixou a sala :"+ data.gameId);
		gameSocket.leave(data.gameId);
		// Enviando notificação de confirmação ao cliente  quando sair da sala
	    this.emit('sucessGameRoomExit',{message: "Voce saiu da sala"} );
	});
	function numberClientsRoom(idRoom){
	    var clientsInRoom = io.nsps['/'].adapter.rooms[idRoom];
	    console.log("Clientes na sala:"+idRoom+" "+clientsInRoom.length);
	    return clientsInRoom.length;
	}
	function findRooms() {
	    var availableRooms = [];
	    var rooms = io.sockets.adapter.rooms;
	    if (rooms) {
	        for (var room in rooms) {
	            if (!rooms[room].hasOwnProperty(room)) {
	                availableRooms.push(room);
	               
	            }
	        }
	        	console.log(availableRooms);
	    }
    return availableRooms;
	}
	gameSocket.on('beep', function(){
		gameSocket.emit('boop');
	});

	gameSocket.on('LOGIN', function(player){
		console.log("Player "+player.name +" conected "+player.gameId);
		currentUser = {
			id:shortId.generate(),
			name:player.name,
			position: player.position,
			rotation: player.rotation,
			animation: player.animation,
			gameId: player.gameId,
			metodo:null

		}
		//Adiciona player na lista geral de clientes
		clients.push(currentUser);

		console.log("Current User: "+currentUser.id+" || Total Players:" +numberClientsRoom(player.gameId)+" GameID: "+player.gameId);

		this.emit("LOGIN_SUCESS", currentUser);
		for (var i = 0; i < clients.length ; i ++) {
			//Testa  para ver se não  é o  proprio cliente e se esta no mesmo game
			if(clients[i].id != currentUser.id && clients[i].gameId == currentUser.gameId ){
			//Instanceia no cliente atual os demais clientes
				this.emit('SPAW_PLAYER',{
					name:clients[i].name,
					id:clients[i].id,
					position:clients[i].position
				});
				console.log("User name "+clients[i].name+" is connected...");
			}
		}
		//Instanceia o cliente atual nos demais clientes usando broadcast
		gameSocket.broadcast.in(player.gameId).emit("SPAW_PLAYER",currentUser);

	});
	//Disconectando Cliente que chamou esse socket
	gameSocket.on('disconnect', function(){
		this.broadcast.emit('USER_DISCONNECTED',currentUser);
		for (var i = 0; i < clients.length ; i ++) {
			if(clients[i].id==currentUser.id){
				console.log("User: "+clients[i].name+" has disconect");
				clients.splice(i, 1);
				
			}
		}
	});
	//Função para atualizar a posição do cliente que chamou esse socket  para os demais clientes do game
	gameSocket.on('MOVE', function(data){
		currentUser.position = data.position;
		
		this.in(data.gameId).emit('UPDATE_MOVE',currentUser);//Enviaa pra todos a posição atual
	});
		//Função para atualizar a rotaçãao do cliente que chamou esse socket  para os demais clientes do game
	gameSocket.on('ROTATE', function(data){
		currentUser.rotation = data.rotation;
		this.in(data.gameId).emit('UPDATE_ROTATE',currentUser);//Enviaa pra todos a rotação atual
	});
	gameSocket.on('ANIMATION', function(data){
		currentUser.animation = data.animation;
		this.in(data.gameId).emit('UPDATE_ANIMATION',currentUser);//Enviaa pra todos a animação atual
	});
	gameSocket.on('RPC', function(data){
		currentUser.metodo = data.metodo;
		console.log("o cliente: "+currentUser.name+" executou o método "+data.metodo+" NA SALA : "+currentUser.gameId);
		this.in(currentUser.gameId).emit('EXECUTE_METHOD',currentUser);//Enviaa pra todos executar o método atual
	});
}