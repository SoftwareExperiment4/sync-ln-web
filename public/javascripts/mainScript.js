$(document).ready(function(){
	var pdfFile = null;
	var drawing = false;
	var scale = 3;
	var scaleFactor = 3;
	var socket = null;
	var drawingLogs = [];
	var progress = $("#progress").hide();
	var getPdf = function(fileName)
	{
		PDFJS.getDocument('/cloud/' + roomURL + "/" + fileName).then(function(file)
		{
			pdfFile = file;
			$("#totalPages").text("/ "+file.numPages);
			getPage(currentPage);
		});
	}
	var getPage = function(pageNumber)
	{
		if(pageNumber < 1) 
		{
			pageNumber = pdfFile.numPages;
			currentPage = pageNumber;
		}
		else if(pageNumber > pdfFile.numPages)
		{
			pageNumber = 1;
			currentPage = pageNumber;
		}

		pdfFile.getPage(pageNumber).then(function(page)
		{
			var viewport = page.getViewport(scale);

			var canvas = document.getElementById('pdfViewer');
			var drawingCanvas = document.getElementById('drawingViewer');

			canvas.height = viewport.height;
			canvas.width = viewport.width;
			drawingCanvas.height = canvas.height / scaleFactor;
			drawingCanvas.width = canvas.width / scaleFactor;

			pdfFile.width = viewport.width / scale;
			pdfFile.height = viewport.height / scale;

			//$("#pdfWrapper").width(canvas.width / scale).height(canvas.height / scale).removeClass("shadowBox");
			$("#pdfWrapper").animate({
				width: canvas.width / scaleFactor,
				height: canvas.height / scaleFactor
			}).removeClass("shadowBox");

			$("#goto").val(currentPage)

			var context = canvas.getContext('2d');

			var renderContext = {
				canvasContext: context,
				viewport: viewport
			}

			page.render(renderContext);
			if(drawingLogs[currentPage])
				drawingCanvas.getContext('2d').drawImage(drawingLogs[currentPage], 0, 0, drawingCanvas.width, drawingCanvas.height);
		})
	}

	var storeDrawingCanvas = function(page)
	{
		var drawingCanvas = document.getElementById('drawingViewer');
                var image = new Image();
                image.src = drawingCanvas.toDataURL();
		drawingLogs[page] = image;
	}
	var getNextPage = function()
	{
		storeDrawingCanvas(currentPage);
		getPage(++currentPage);
		socket.emit('pageChange', currentPage);
	}
	var previousPage = function()
	{
		storeDrawingCanvas(currentPage);
		getPage(--currentPage);
		socket.emit('pageChange', currentPage);
	}

	var scaleTo = function(newScaleFactor)
	{
		var drawingCanvas = document.getElementById('drawingViewer');
		var image = new Image();
		image.src = drawingCanvas.toDataURL();
		scaleFactor = newScaleFactor;
		getPage(currentPage);
		image.onload = function(){
			drawingCanvas.getContext('2d').drawImage(image, 0, 0, drawingCanvas.width, drawingCanvas.height);
		}
	}

	var init = function(){
		if(fileExists)
		{
			getPdf(pdfPath);
			$(".fileInfo").unbind('click').click(fileInfoClick);
		}
		else
		{
			var tmp = $("#pdfWrapper");
			tmp.animate
			({
				height: tmp.width() * 9 / 16
			})
		}

		var elem = document.getElementById('upload');
		elem.ondragover = function () { $(this).addClass('hover'); return false; };
		elem.ondragend = function () { $(this).removeClass('hover'); return false; };
		elem.ondrop = function (event) 
		{
			event.preventDefault && event.preventDefault();
			$(this).removeClass('hover');

			// now do something with:
			var file = event.dataTransfer.files[0];

			if(file)
			{
				if(!(/pdf$/.test(file.type)))
				{
					alert("Only pdf file allowed!!")
				}
				else if($.inArray(file.name, fileHistory) != -1)
				{
					alert("This file already exists!!")
				}
				else
				{
					var str = '<div class="fileInfo" data-filename="'+ file.name +'">'
					str += 		'<span class="glyphicon glyphicon-file" aria-hidden="true"></span>' + file.name + " &nbsp" + parseInt(file.size/1024) + "KB";
					str +=		'<div id="fileProgress" class="progress">'
					str +=			'<div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;">'
					str +=			'</div>'
					str +=		'</div>'
					str += 	'</div>'
					$(elem).append(str);
					$(".fileInfo").unbind('click').click(fileInfoClick);
					transferFile(file);	
				}
			}

			return false;
		};
	}

	var transferFile = function(file)
	{
		var formData = new FormData();
		var progress = $("#fileProgress>div");
		formData.append('file', file);

		// now post a new XHR request
		var xhr = new XMLHttpRequest();

		xhr.open('POST', '/upload/' + roomURL, true);
		
		xhr.onload = function () {
			if (xhr.status === 200)
			{
				var response = JSON.parse(xhr.response);
				if(response == "level")
				{
					alert("Authentication failed");
					$("#fileProgress").parent().remove();
				}
				else if(response == "success")
				{
					$(".fileInfo").removeClass("active")
					
					pdfPath = file.name;
					currentPage = 1;
					getPdf(pdfPath);
					socket.emit('pdfAppend', file.name);
					fileHistory.push(file.name);
					
					$("#fileProgress").parent().addClass("active");
					$("#fileProgress").remove();
				}

				console.log('all done: ' + xhr.status);
			} 
			else
			{
				console.log('Something went terribly wrong...');
			}
		};
		xhr.upload.onprogress = function (event) 
		{
			if (event.lengthComputable)
			{
				var complete = (event.loaded / event.total * 100 | 0);

				console.log(complete);
				progress.width(complete + "%");
				//progress.value = progress.innerHTML = complete;
			}
		};


		xhr.send(formData);
	}

	var fileInfoClick = function(e)
	{
		var filename = $(this).data('filename');
		
		if(filename && pdfPath != filename){
			socket.emit('pdfChange', filename);
			pdfPath = filename;
			currentPage = 1;

			$(".fileInfo").removeClass("active")
			getPdf(pdfPath);
			$(this).addClass("active");
		}
	}
	

	$("#prev").click(function()
	{
		previousPage();
	})

	$("#next").click(function()
	{
		getNextPage();
	})
	
	$("#plus").click(function()
	{
		scaleTo(scaleFactor - 0.5);
	})

	$("#minus").click(function()
	{
		scaleTo(scaleFactor + 0.5);
	})

	$("#goto").change(function()
	{

		var val = $(this).val() -0;
		if(val <= pdfFile.numPages && val > 0)
		{
			storeDrawingCanvas(currentPage);
			currentPage = val;
			getPage(currentPage);

			socket.emit('pageChange', currentPage);
		}

	})

	var drawingCtx = document.getElementById("drawingViewer").getContext("2d");
	var bfX, bfY, color = "black", linesize = 5;
	var tmpcolor;

	$("#drawingViewer").mousedown(function(){
		drawing = true;
	})
	
	$(".colorPalette").click(function(e){
		color = $(this).attr('data-color');
		$(".color-selected").removeClass("color-selected");
        $(this).addClass('color-selected');
        e.stopPropagation();
	})

	$(".toolPicker").click(function(e){
		linesize = $(this).attr('data-size');
		$(".tool-selected").removeClass("tool-selected");
        $(this).addClass('tool-selected');
        e.stopPropagation();
	})
	
	$("#drawingViewer").mousemove(function(e)
	{
		if(drawing)
		{
			drawingCtx.beginPath();
			drawingCtx.lineWidth = linesize;
			drawingCtx.strokeStyle = color;
			drawingCtx.lineCap = "round";
			drawingCtx.moveTo(bfX, bfY);
			drawingCtx.lineTo(e.offsetX, e.offsetY);
			drawingCtx.stroke();

			if(level == 5)
			{
				var scaleRatio = scaleFactor / scale;
				var drawingObj = {};
				drawingObj.lineWidth = linesize;
				drawingObj.strokeStyle = color;
				drawingObj.lineCap = "round";
				drawingObj.bfX = bfX ? bfX * scaleRatio : bfX;
				drawingObj.bfY = bfY ? bfY * scaleRatio : bfY;
				drawingObj.newX = e.offsetX * scaleRatio;
				drawingObj.newY = e.offsetY * scaleRatio;

				socket.emit('drawingInfo', drawingObj);
			}

			bfX = e.offsetX;
			bfY = e.offsetY;
		}
		
	})

	$("#drawingViewer").mouseup(function()
	{
		drawing = false;
		bfX = undefined;
		bfY = undefined;
	})

	//for socket control
	{
		socket = io.connect('http://115.145.179.34:3000/');
		socket.on('checkRoom', function () 
		{
			socket.emit('checkRoom', roomURL);
		});
		socket.on('pageChange', function (page)
		{
			storeDrawingCanvas(currentPage);
			currentPage = page;
			getPage(currentPage);
		})

		socket.on('pdfAppend', function(fileName)
		{
			pdfPath = fileName;
			currentPage = 1;
			getPdf(pdfPath);
			fileHistory.push(fileName);

			var str = '<div class="fileInfo active" data-filename="'+ fileName +'">'
			str += 		'<span class="glyphicon glyphicon-file" aria-hidden="true"></span>' + fileName ;
			str += 	'</div>'
			$("#upload").append(str);
			$(".fileInfo").unbind('click').click(fileInfoClick).removeClass("active");
			$(".fileInfo[data-filename='"+pdfPath+"'").addClass("active");
		});
		socket.on('pdfChange', function(filename)
		{
			pdfPath = filename;
			currentPage = 1;
			
			getPdf(pdfPath);
			$(".fileInfo").removeClass("active")
			$(".fileInfo[data-filename='"+pdfPath+"'").addClass("active");
		});

		if(level != 5)
		{
			socket.on('drawingInfo', function(drawingObj){
				var scaleRatio = scale / scaleFactor;
				drawingCtx.beginPath();
				drawingCtx.lineWidth = drawingObj.lineWidth;
				drawingCtx.strokeStyle = drawingObj.strokeStyle;
				drawingCtx.lineCap = drawingObj.lineCap;
				drawingCtx.moveTo(drawingObj.bfX * scaleRatio, drawingObj.bfY * scaleRatio);
				drawingCtx.lineTo(drawingObj.newX * scaleRatio, drawingObj.newY * scaleRatio);
				drawingCtx.stroke();
			})
		}
	}

	var generatePage = function(doc, canvas, context, currentPage, totalPage, callback)
	{
		pdfFile.getPage(currentPage).then(function(page)
		{
			var viewport = page.getViewport(2);

			canvas.height = viewport.height;
			canvas.width = viewport.width;

			var renderContext = {
				canvasContext: context,
				viewport: viewport
			}
			var percent = parseInt(currentPage / totalPage * 100) + "%";
			progress.find("div").width(percent).text(percent).attr('aria-valuenow', parseInt(currentPage / totalPage * 100));

			page.render(renderContext).then(function(){

				var width = canvas.width / 2;
				var height = canvas.height / 2;
				
				doc.addImage(canvas.toDataURL("image/jpeg"), 'JPEG', 0, 0, width, height);
				if(drawingLogs[currentPage] && drawingLogs[currentPage].src)
					doc.addImage(drawingLogs[currentPage], 'JPEG', 0, 0, width, height);

				if(currentPage < totalPage){
					doc.addPage();
					generatePage(doc, canvas, context, ++currentPage, totalPage, callback);
				}
				else
					callback();

			});
			
		})
	}
	var generatePdf = function()
	{

		progress.show();
		var doc = null;
		if(pdfFile.width > pdfFile.height)
			doc = new jsPDF('l', 'px', [pdfFile.width, pdfFile.height]);
		else
			doc = new jsPDF('p', 'px', [pdfFile.width, pdfFile.height]);
		var canvas = document.getElementById('tmpCanvas');
		var context = canvas.getContext('2d');

		storeDrawingCanvas(currentPage);

		// get pages
		generatePage(doc, canvas, context, 1, pdfFile.numPages, function(){
			console.log("finished");
			doc.save('sync-ln-web.pdf');

			delete doc;
			doc = null;
			progress.hide();
		});
		
		
	}

	$("#download").click(function(){
		generatePdf();
	})


	init();
})

