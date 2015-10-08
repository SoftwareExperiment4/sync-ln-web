$(document).ready(function(){
	var pdfFile = null;
	
	var getPdf = function(fileName)
	{
		PDFJS.getDocument('/cloud/' + roomURL + "/" + fileName).then(function(file)
		{
			pdfFile = file;
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

		pdfFile.getPage(pageNumber).then(function(page){
			var scale = 4;
			var viewport = page.getViewport(scale);

			var canvas = document.getElementById('pdfViewer');

			canvas.height = viewport.height;
			canvas.width = viewport.width;
			var context = canvas.getContext('2d');

			var renderContext = {
				canvasContext: context,
				viewport: viewport
			}

			page.render(renderContext);
		})
	}
	var getNextPage = function(){
		getPage(++currentPage);
		socket.emit('pageChange', currentPage);
	}
	var previousPage = function(){
		getPage(--currentPage);
		socket.emit('pageChange', currentPage);
	}
	var init = function(){
		if(fileExists){
			getPdf(pdfPath);
			$(".fileInfo").unbind('click').click(fileInfoClick);
		}

		var elem = document.getElementById('upload');
		elem.ondragover = function () { $(this).addClass('hover'); return false; };
		elem.ondragend = function () { $(this).removeClass('hover'); return false; };
		elem.ondrop = function (event) {
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

	var transferFile = function(file){
		var formData = new FormData();
		var progress = $("#fileProgress>div");
		formData.append('file', file);

		// now post a new XHR request
		var xhr = new XMLHttpRequest();

		xhr.open('POST', '/upload/' + roomURL, true);
		
		xhr.onload = function () {
			if (xhr.status === 200) {
				var response = JSON.parse(xhr.response);
				if(response == "level"){
					alert("Authentication failed");
					$("#fileProgress").parent().remove();
				}else if(response == "success"){
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
			} else {
				console.log('Something went terribly wrong...');
			}
		};
		xhr.upload.onprogress = function (event) {
			if (event.lengthComputable) {
				var complete = (event.loaded / event.total * 100 | 0);

				console.log(complete);
				progress.width(complete + "%");
				//progress.value = progress.innerHTML = complete;
			}
		};


		xhr.send(formData);
	}

	var fileInfoClick = function(e){
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
	

	$("#prev").click(function(){
		previousPage();
	})

	$("#next").click(function(){
		getNextPage();
	})
		
	

	//for socket control
	{
		var socket = io.connect('http://115.145.179.34:3000/');
		socket.on('checkRoom', function () {
			socket.emit('checkRoom', roomURL);
		});
		socket.on('pageChange', function (page){
			currentPage = page;
			getPage(currentPage);
			console.log('sibong');
		})
		socket.on('pdfAppend', function(fileName){
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
		socket.on('pdfChange', function(filename){
			pdfPath = filename;
			currentPage = 1;
			
			getPdf(pdfPath);
			$(".fileInfo").removeClass("active")
			$(".fileInfo[data-filename='"+pdfPath+"'").addClass("active");
		})

	}





	init();
})

