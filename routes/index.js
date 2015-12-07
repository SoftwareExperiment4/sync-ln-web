var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');
var roomManager = require('../module/roomManager')();
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

global.roomManager = roomManager;


/* GET home page. */
router.get('/', function(req, res, next) 
{
	var roomList = roomManager.getRoomList();
  	res.render('index', {roomList: roomList});
});

router.get('/create', function(req, res, next)
{
	var roomName = req.query.roomName;

	if(roomName)
	{
		var roomURL = crypto.createHash('sha1').update(roomName + Date.now()).digest('hex');
		roomManager.createRoom(roomName, roomURL, req.sessionID);

		if (!fs.existsSync(__dirname + "/../cloud/" + roomURL)){
			fs.mkdirSync(__dirname + "/../cloud/" + roomURL);
		}

		req.session.level = 5; /* level of room creater */
		req.session.roomURL = roomURL;
		req.session.save();
		
		res.redirect('/room/'+roomURL);
	}
	else
		return next(new Error("romeName Error"))
});

router.get('/room/:roomURL', function(req, res, next)
{
	var roomURL = req.params.roomURL;
	var sess = req.session;

	if(roomURL)
	{
		if(!sess.roomURL || roomURL != sess.roomURL){
			sess.level = 1;
		}
		var room = roomManager.getRoom(roomURL);
		if(room)
		{
			room.level = sess.level;
			res.render('mainViewer', room);
		}
		else
		{
			return next(new Error("This URL is not exists....."));
		}
	}
	else
	{
		return next(new Error("romeName Error"))
	}
	
})

router.get('/cloud/:roomURL/:fileName', function(req, res, next)
{

	var fileName = req.params.fileName;
	var roomURL = req.params.roomURL;
	if(fileName && roomURL)
	{		
		var filePath = __dirname + "/../cloud/" + roomURL + "/" + fileName		
		fs.exists(filePath, function(exists) 
		{ 

			if (exists) 
			{ 

				res.sendFile(path.join(__dirname, "../cloud/"+ roomURL, fileName));
			}
			else
			{
				return next(new Error("There is no such file"));
			}
		});
	}else
		return next(new Error("Wrong URL"));
});

var sessionCheck = function(req, res, next){
	var sess = req.session;
	var roomURL = req.params.roomURL;
	if(sess && (sess.level < 5 || sess.roomURL != roomURL) && !roomManager.checkAuth(roomURL, req.sessionID))
	{
		console.log(req.files);
		res.json("level");
		res.end();
	}else{
		next();
	}
}

router.post('/upload/:roomURL', sessionCheck, multipartMiddleware, function(req, res, next)
{
	var roomURL = req.params.roomURL;
	var file = req.files.file;
	if(file)
	{
		var tmpPath = file.path;

		fs.readFile(tmpPath, function(error, data)
		{
			if(error){
				return next(error);
			}else{
				var filePath = __dirname + "/../cloud/" + roomURL + "/" + file.name;

				fs.writeFile(filePath, data, function(error)
				{
					if(error)
					{
						console.log(error);
						return next(error);
					}
					else
					{
						roomManager.setPdf(roomURL, file.name);
						roomManager.setPage(roomURL, 1);
						res.json("success");
					}
				})	
			}
			
		})
	}
	else
	{
		return next(new Error("Wrong File"));
	}
})



module.exports = router;
