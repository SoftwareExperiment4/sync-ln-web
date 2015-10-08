var fs = require('fs');


var roomManager = function(){
	if(!(this instanceof roomManager)) return new roomManager();

	this.roomList = [];
	this.rooms = {};	
}

roomManager.prototype.createRoom = function(roomName, roomURL, createrSid){
	var room = {};
	room.roomName = roomName;
	room.roomURL = roomURL;
	room.fileExists = false;
	room.pdfPath = "";
	room.page = 1;
	room.files = [];
	room.expireTime = 60 * 60 * 1000; // 1 hour
	room.index = this.roomList.length;
	room.createrSid = createrSid;

	this.rooms[roomURL] = room;
	this.roomList.push({roomName: roomName, roomURL: roomURL});
}

roomManager.prototype.getRoom = function(roomURL){
	return this.rooms[roomURL];
}

roomManager.prototype.checkAuth = function(roomURL, sid){
	
	return this.rooms[roomURL] && (this.rooms[roomURL].createrSid == sid);
}

roomManager.prototype.setPdf = function(roomURL, pdfPath){
	var room = this.rooms[roomURL];
	room.fileExists = true;
	room.pdfPath = pdfPath;
	room.files.push(pdfPath);
}

roomManager.prototype.getRoomList = function(){
	return this.roomList;
}

roomManager.prototype.setPage = function(roomURL, page){
	this.rooms[roomURL].page = page;
}

var checkRoomState = function(){
	for(var u in this.rooms){
		this.rooms[u].expireTime -= 60 * 1000; // 1 minute
		if(this.rooms[u].expireTime <= 0){
			deleteRoom(u);
		}
	}
}

var deleteRoom = function(roomURL){
	if (fs.existsSync(__dirname + "/../cloud/" + roomURL)){
		var path = __dirname + "/../cloud/" + roomURL;


		fs.readdirSync(path).forEach(function(file,index)
		{
			var curPath = path + "/" + file;
			fs.unlinkSync(curPath);
		});

		fs.rmdirSync(path);
	}

	this.roomList.splice(this.rooms[roomURL].index, 1);
	delete this.rooms[roomURL];
}

setInterval(checkRoomState, 60 * 1000);

module.exports = roomManager;