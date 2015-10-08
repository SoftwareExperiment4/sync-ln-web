
var router = function(io){
	io.on('connection', routeFunctions);
}
//socket.handshake.session
//socket.handshake.sessionID
var routeFunctions = function(socket){
	socket.emit('checkRoom');

	socket.on('checkRoom', function(roomURL){
		if(!roomURL) return;

		socket.join(roomURL);
	});

	socket.on('pageChange', function(page){
		var roomURL = this.rooms[1];
		if(!global.roomManager.checkAuth(roomURL, socket.handshake.sessionID)|| !page) return;
		
		socket.broadcast.to(roomURL).emit('pageChange', page);
		global.roomManager.setPage(roomURL, page);
	})

	socket.on('pdfAppend', function(fileName){
		var roomURL = this.rooms[1];
		console.log(socket.handshake.sessionID)
		if(!global.roomManager.checkAuth(roomURL, socket.handshake.sessionID)|| !fileName) return;
		
		socket.broadcast.to(roomURL).emit('pdfAppend', fileName); //http already updated roomManager info
	})

	socket.on('pdfChange', function(pdfPath){
		var roomURL = this.rooms[1];
		if(!global.roomManager.checkAuth(roomURL, socket.handshake.sessionID) || !pdfPath) return;
		
		socket.broadcast.to(roomURL).emit('pdfChange', pdfPath);
		global.roomManager.setPdf(roomURL, pdfPath);
	})

}

module.exports = router;
