/**
 * Author:    Ocube
 * Created:   03.04.2021
 * 
 * Récupération des corrections et export vers CSV / JSON
 **/
 
// ETAPE 0
var url = window.location.href;
var urlSplit = window.location.pathname.split('/');
mode = urlSplit[urlSplit.length-1];
boardLevel = urlSplit[urlSplit.length-2];
examName = urlSplit[urlSplit.length-3];

listOfTest = Array();
listOfTestCSV = Object();
csvHeader = "Section;Exercices;Questions;Reponses\n";

// ETAPE 1

fetch(url)
.then(function(response) {
	return response.text();
}).then(function(htmlString) {
	var html = new DOMParser().parseFromString(htmlString, 'text/html');
	
	var data = html.querySelector('stats-'+ mode +'-global').getAttribute(':board');
    var jsonData = JSON.parse(data)
	var board = jsonData.id;
	
	// ETAPE 2
	var testListUrl = "https://esilv-leonard-de-vinci.globalexam.training/api/stats/exam-mode/board/" + board + "/board-level/" + boardLevel;
	fetch(testListUrl)
	.then(function(response) {
		return response.json();
	}).then(function(data) {
		data.data.attributes.data.detail.forEach( function(thisTest) { 
			var correctionId = thisTest.board_exam_mock_id;
			
			// Create JSON for each test
			var test = Object();
			listOfTest.push(test);
			
			var csvFileName = thisTest.board_exam_mock_name;
			listOfTestCSV[csvFileName] = csvHeader;
			
			test.Nom = thisTest.board_exam_mock_name;
			
			test.Sections = Array();
			
			// ETAPE 3
			var sessionUrl = "https://esilv-leonard-de-vinci.globalexam.training/api/stats/exam-mode/board-exam-mock/" + correctionId + "/board-session"
			fetch(sessionUrl)
			.then(function(response) {
				return response.json();
			}).then(function(data) {
				var sessionId = data.data[0].id;
				
					// ETAPE 4
					var correctionUrl = "https://esilv-leonard-de-vinci.globalexam.training/statistics/exam/" + examName + "/" + boardLevel + "/exam-mode/correction/" + correctionId + "/session/" + sessionId;
					fetch(correctionUrl)
					.then(function(response) {
						return response.text();
					}).then(function(htmlString) {
						var html = new DOMParser().parseFromString(htmlString, 'text/html');
						
						var data = html.querySelector('stats-correction-exam-mode-show').getAttribute(':board-session');
						var jsonData = JSON.parse(data)
						
						jsonData.relationships.session_section
						.forEach( function(thisSection) { 
							
							var section = Object();
							test.Sections.push(section);
							
							section.Nom = thisSection.id.charAt(0).toUpperCase() + thisSection.id.slice(1); 
							section.Exercices = Array();
							
							thisSection.attributes.exercises
							.forEach( function(exo) {
								var boardExerciseId = exo.board_exercise_id;

								var exercice = Object();
								section.Exercices.push(exercice);
								
								exercice.Nom = exo.exam_exercise_name;
								exercice.Questions = Array();
								
								// ETAPE 5
								var correctionExoUrl = "https://esilv-leonard-de-vinci.globalexam.training/api/stats/exam-mode/board-session/" + sessionId + "/board-exercise/" + boardExerciseId + "/board-training";
								fetch(correctionExoUrl)
								.then(function(response) {
									return response.json();
								}).then(function(data) {
									var trainingId = data.data.relationships.board_training[0].id;
									
									
									// ETAPE 6
									var correctionQuestionsUrl = "https://esilv-leonard-de-vinci.globalexam.training/statistics/exam/" + examName + "/" + boardLevel + "/exam-mode/correction/" + correctionId + "/session/" + sessionId + "/exercise/" + boardExerciseId + "/training/" + trainingId;
									fetch(correctionQuestionsUrl)
									.then(function(response) {
										return response.text();
									}).then(function(htmlString) {
										var html = new DOMParser().parseFromString(htmlString, 'text/html');
										
										var data = html.querySelector('stats-correction-exam-mode-board-training').getAttribute(':board-training');
										var jsonData = JSON.parse(data)
										
										jsonData.relationships.exam_training.relationships.exam_part
										.forEach(x => x.relationships.exam_question
										.forEach(function(y){
											
											var question = Object();
											exercice.Questions.push(question);
											
											question.Numero = y.attributes.order;
											question.Reponse = "";
											
											y.relationships.exam_answer
											.forEach(function(z){
												if(z.attributes.is_right_answer) {
													question.Reponse += z.attributes.numbering;
													listOfTestCSV[csvFileName] += section.Nom + ";" + exercice.Nom + ";" + question.Numero + ";" + question.Reponse + "\n";
												}
											})
										}));
										
									});

									
									
								});

									
							});
						});
						
					});
				
			});
			
		});
	});

	
});


setTimeout(function(){ 

	listOfTest.forEach( x => {
		console.log(JSON.stringify(x, undefined, '\t'));
	})


	var myDialog = document.createElement("dialog");
	document.body.appendChild(myDialog)
	var text = document.createTextNode("Fichiers de correction disponible :");
	myDialog.appendChild(text);

	var ul = document.createElement("ul");
	myDialog.appendChild(ul);


	for (var fileName in listOfTestCSV) {
		var blob = new Blob([listOfTestCSV[fileName]], { type: 'text/csv;charset=utf-8;' });
		
		var link = document.createElement("a");
		link.innerHTML = fileName;
		link.setAttribute("href", URL.createObjectURL(blob));
		link.setAttribute("download", fileName + ".csv");
		
		var li = document.createElement("li");
		li.appendChild(link);
		ul.appendChild(li);
		
		
	}

	myDialog.showModal(); 
	
}, 15000);
