// stores currently dragged element
var draggedInteraction = null;

// is true when changes are not saved yet
var unsavedChanges = false;

// stores files that are to be imported
let importFiles = []

// on startup
$(document).ready(() => {
    updateUserName();
    fetchlearningPaths();
});

function isValidURL(url) {
    var res = url.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    if(res==null)
        alertToUser("Bild konnte nicht geladen werden!")
    return (res != null)
  };

function createCanvas(){
    if(session.learningPathOpened() && session.ScenariosExist() && session.getCurrentLearningPath().scenarios.length > 0){
        workspaceId = 'workspace' + session.getCurrentScenarioIndex();
        document.getElementById(workspaceId).innerHTML = "";
        new p5(newCanv, workspaceId)
    }
}

function loadWorkspaceBackgrounds(){
    if(session.ScenariosExist() && session.getCurrentLearningPath().scenarios.length > 0){
        for(let i = 0; i < session.getCurrentLearningPath().scenarios.length; i++){
            canvasManager.setImage(i, session.getCurrentLearningPath().scenarios[i].resource)
        }
    }
}

// handle click events
document.addEventListener('click', (event) => {
    let id = event.target.getAttribute('id');
    let classes = event.target.classList;
    let button = event.target;

    if (id == 'homeBtn') {
        if (session.learningPathOpened()) {
            saveCurrentLp();
            learningPathToServer(session.getCurrentLearningPath(), () => {
                session.closelearningPath();
                getHomePage();
            });
        } else {
            getHomePage();
        }
    }
    
    else if (id == 'settingsBtn') {
        getSettingsPage();
    }
    
    else if (id == 'downloadButton') {
        if (session.learningPathOpened()) {
            downloadlearningPaths([session.getCurrentLearningPath()], 'json');
        } else {
            lpids = []
            for (lp of session.getlearningPaths())
                lpids.push(lp.id);
            downloadlearningPaths(session.getlearningPaths(), 'json');
        }
    }
    
    else if (id == 'exportButton') {
        if (session.learningPathOpened()) {
            downloadlearningPaths([session.getCurrentLearningPath()], 'pdf');
        }
    } 
    
    else if (id == 'exportImage') {
        if (session.learningPathOpened()) {
            if(classes.contains('png'))
                downloadlearningPaths([session.getCurrentLearningPath()], 'png');
            else if(classes.contains('jpg'))
                downloadlearningPaths([session.getCurrentLearningPath()], 'jpg');
        } else {

            
        }
    } 
    
    else if (id == 'createLpBtn') {
        createLpOnServer(() => {
            fetchlearningPaths();
            getSettingsPage(mode = 'lpSettingsOnly');
        });
    }

    else if (id == 'showTreegraph') {
        openTreegraphOverlay(session.getCurrentLearningPath());
    }

    else if (id == 'showTreegraphDashboard'){
        forwardTreegraph();
    }
    
    else if (id == 'saveSettingsBtn') {
        if (session.learningPathOpened()) {
            saveCurrentLp();
            getEditPage();
        } else {
            getHomePage();
        }
    } 
    
    else if (id == 'addScenarioButton') {
        if (session.learningPathOpened()) {
            session.createScenario({ 'title': 'Neues Szenario' }, () => {
                learningPathToServer(session.getCurrentLearningPath(), () => {
                    getEditPage(session.getCurrentLearningPathId(), () => {

                        // scroll to the bottom
                        window.scrollTo(0, document.body.scrollHeight);
                    });
                });
            });
        } 
    } 

    else if (id == 'selectAllInter'){
        $(".interactivityInputCB").prop('checked', true)
        let allBoxes = $(".interactivityInputCB").map(function() {
            let category = this.getAttribute("class").replaceAll('interactivityInputCB ', '')
            let interactivity = this.id.replaceAll('CB', '')
            interactivity = interactivity.replace(/^\s+|\s+$/g, '');
            return {'category':category, 'interactivity':interactivity}
        }).get();
        let interactionTypes = {}
        for (const [key, value] of Object.entries(allBoxes)) {
            if(!Array.isArray(interactionTypes[value['category']]))
                interactionTypes[value['category']] = []
            interactionTypes[value['category']].push(value['interactivity'])
          }

        session.setProp('interactivityTypes', interactionTypes)
        unsavedChanges = true;
        saveCurrentLp();
    }

    else if (id == 'selectNoneInter'){
        $(".interactivityInputCB").prop('checked', false)
        session.setProp('interactivityTypes', {})
        unsavedChanges = true;
        saveCurrentLp();
    }

    else if(id == 'deleteInteractivity'){
        if(session.interactionOpened()){
            session.deleteInteraction(session.getCurrentInteractionIndex());
            session.closeInteraction();
            if(session.interactionsExist && session.getCurrentScenario().interactions.length > 0)
                session.openInteraction(session.getCurrentScenario().interactions.length - 1)
            refreshInteractivityList();
            unsavedChanges = true;
        }
    }

    // handle open scenario buttons
    else if ((classes.contains('openScenario') || classes.contains('openScenarioImg'))) {
        let scenarioIndex = id.replaceAll('openScenario', '')
        scenarioIndex = scenarioIndex.replaceAll('Img', '')
        let collapseID = '#collapse' + scenarioIndex;
        let imgID = '#openScenario' + scenarioIndex + 'Img';
        let classListCollapse = document.getElementById(collapseID.replaceAll('#', '')).className.split(/\s+/);
        if(!classListCollapse.includes('collapsing')){
            if ((!session.scenarioOpened() || scenarioIndex != session.getCurrentScenarioIndex())){
                let worspaceID = '#workspace' + scenarioIndex;
                $(worspaceID).append( $("#defaultCanvas0") );
                $('.openScenarioImg').attr("src","./img/arrows-fullscreen.svg");
                $(imgID).attr("src","./img/arrows-collapse.svg");
                $(collapseID).collapse('show');
                session.openScenario(scenarioIndex);

            }else if(session.scenarioOpened() && scenarioIndex == session.getCurrentScenarioIndex()){
                $(imgID).attr("src","./img/arrows-fullscreen.svg");
                $(collapseID).collapse('hide');
                session.closeScenario();
            }
        }   
        refreshInteractivityList();
    }

    // handle delete scenario buttons
    else if (classes.contains('deleteScenario')) {
        scenarioIndex = id.replaceAll('deleteScenario', '');
        session.deleteScenario(scenarioIndex);
        learningPathToServer(session.getCurrentLearningPath(), () => {
            getEditPage();
        });
    }

    // handle open learningPath buttons
    else if (classes.contains('openLp')) {
        editID = id.replaceAll('openLp', '');
        getEditPage(editID);
    }

    // handle delete learningPath buttons
    else if (classes.contains('deleteLp')) {
        let lpID = id.replaceAll('delete', '');
        let rowId = 'lpRow' + lpID

        let row = document.getElementById(rowId);
        row.remove();
        
        deletelearningPath(lpID, () => {
            if (session.getCurrentLearningPathId() == lpID)
                session.closelearningPath()
            session.removelearningPath(lpID)
        })
        
    } 
    
    else if (classes.contains('interactivityListItem')) {
        interID = id.replaceAll('iaListItem', '');
        session.openInteraction(interID);
        refreshInteractivityInputs();
    }

}, false);

document.addEventListener('input', (event) => {
    let id = event.target.getAttribute('id');
    let classes = event.target.classList;
    let input = event.target;

    if (id == 'lpNotes') {
        updateLpProperty('notes', input.value);
        $("#lpNotesModal").val(input.value);
    }
    
    else if (id == 'lpNotesModal') {
        updateLpProperty('notes', input.value);
        $("#lpNotes").val(input.value);
    }
    
    else if (id == 'lpEvaluationMode') {
        updateLpProperty('evaluationModeID', input.value);
    } 
    
    else if (id == 'lpTaxonomyLevel') {
        updateLpProperty('taxonomyLevelID', input.value);
    }
    
    else if (id == 'lpTitleInput') {
        updateLpProperty('title', input.value);
    } else if (id == 'userNameInput') {
        changeUserName(input.value, () => {
            updateUserName();
        });
    } 
    
    else if (classes.contains('lpTitleInput')) {
        scenarioIndex = id.replaceAll('lpTitleInput', '');
        updateLpProperty('scenarios', input.value, scenarioIndex, 'title');
    } 
    
    else if (classes.contains('lpDescription')) {
        scenarioIndex = id.replaceAll('lpDescription', '');
        updateLpProperty('scenarios', input.value, scenarioIndex, 'description');
    } 
    
    else if (classes.contains('lpLearningGoal')) {
        scenarioIndex = id.replaceAll('lpLearningGoal', '');
        updateLpProperty('scenarios', input.value, scenarioIndex, 'learningGoal');
    }
    
    else if (classes.contains('lpResource')) {
        scenarioIndex = id.replaceAll('lpResource', '');
        updateLpProperty('scenarios', input.value, scenarioIndex, 'resource');
        canvasManager.setCurrentImage(input.value);
    }
    
    else if (classes.contains('interactivityInputCB')) {
        let checked = input.checked
        let category = input.getAttribute("class").replaceAll('interactivityInputCB ', '');
        let interactivity = id.replaceAll('CB', '')
        interactivity = interactivity.replace(/^\s+|\s+$/g, '');
        let newList = session.getCurrentLearningPath()['interactivityTypes'][category] == null ? [] : session.getCurrentLearningPath()['interactivityTypes'][category];
        if (checked)
            newList.push(interactivity)
        else
            newList = rmByValue(newList, interactivity)
        session.setProp('interactivityTypes', newList, category)
        unsavedChanges = true;
        saveCurrentLp();
    } 
    
    else if (id == 'x_coord') {
        updateInteractionProperty('x_coord', input.value)
    } 
    
    else if (id == 'y_coord') {
        updateInteractionProperty('y_coord', input.value)
    } 

    else if (id == 'materialUrl') {
        updateInteractionProperty('materialUrl', input.value)
    } 
    
    else if (id == 'evaluationHeurestic') {
        updateInteractionProperty('evaluationHeurestic', input.value)
    } 
    
    else if (id == 'behaviorSettings') {
        updateInteractionProperty('behaviorSettings', input.value)
    } 
    
    else if (id == 'interactionTypeDrop') {
        if (session.learningPathOpened() && session.scenarioOpened() && session.interactionOpened()) {

            let elemId = $(input).find('option:selected').attr('id')
            if(elemId != "noInteractiontype"){
                let category = elemId.split('$$')[1];
                let interactionType = elemId.split('$$')[2];
                category = category.trim();
                interactionType = interactionType.trim();
                session.setInteractionProp('category', category);
                session.setInteractionProp('interactionType', interactionType);
                refreshInteractivityList();
            }
        }
    }

    else if ( id = 'importDrop'){
        for(let i = 0; i < document.querySelector('.fileDrop').files.length; i++){
            let fileReader = new FileReader();

            fileReader.addEventListener("load", () => {
                try{
                    importFiles.push(JSON.parse(fileReader.result));
                }catch( e ){
                    alertToUser('Lernpfad konnte nicht geladen werden!', 5, 'red')
                }
                if(importFiles.length == document.querySelector('.fileDrop').files.length){
                    importLP(importFiles);
                    importFiles = []
                }
            }, false);

            fileReader.readAsText(document.querySelector('.fileDrop').files[i]);
        }
    }

});

// fire on drag start 
document.addEventListener("dragstart", (event) => {
    draggedInteraction = event.target;
    if (draggedInteraction != null && draggedInteraction.classList.contains("interactivityBox") && session.scenarioOpened()) {
        draggedInteraction.style.opacity = .5;
    }
}, false);

// allow dropping of interactivities
document.addEventListener("dragover", (event) => {
    if (draggedInteraction != null && draggedInteraction.classList.contains("interactivityBox") && session.scenarioOpened())
        event.preventDefault();
}, false);

// handle dropable elements beeing dropped
document.addEventListener("drop", (event) => {
    
    let coordinates = { 'x': (event.offsetX - canvasManager.getUserOffset().x) / canvasManager.getScale() , 'y': (event.offsetY - canvasManager.getUserOffset().y) / canvasManager.getScale() };

    droppedTo = event.target;

    if (draggedInteraction != null && draggedInteraction.classList.contains("interactivityBox") && session.scenarioOpened()) {
        draggedInteraction.style.opacity = 1;
        event.preventDefault();
        if (droppedTo.classList.contains('p5Canvas')) {
            let category = draggedInteraction.getAttribute('id').split('$$')[0];
            let interactionType = draggedInteraction.getAttribute('id').split('$$')[1];
            category.trim()
            interactionType.trim()
            session.addInteraction(coordinates, category, interactionType);
            unsavedChanges = true;
            session.openInteraction(session.getCurrentScenario().interactions.length - 1)
            refreshInteractivityList();
        }
    }
    draggedInteraction = null;
}, false);

function refreshInteractivityList() {
    $('.interactivityList').html('');
    if (session.scenarioOpened() && session.propExists(['interactions'], session.getCurrentScenario())) {
        for (let i = 0; i < session.getCurrentScenario().interactions.length; i++) {
            inter = session.getCurrentScenario().interactions[i];
            $('.interactivityList').append('<div class="interactivityListElem"> <button class="btn btn-light interactivityListItem" id="iaListItem' + i + '">' + inter.category + ' - ' + inter.interactionType + '</button></div>');
        }
        refreshInteractivityInputs();
    }
}

function refreshInteractivityInputs() {
    let speed = 40
    if (session.interactionOpened()) {
        $(".x_coord").val(session.getCurrentInteraction().x_coord);
        $(".y_coord").val(session.getCurrentInteraction().y_coord);
        $(".materialUrl").val(session.getCurrentInteraction().materialUrl);
        $(".evaluationHeurestic").val(session.getCurrentInteraction().evaluationHeurestic);
        let behaDropID = session.getCurrentInteraction().behaviorSettings;
        $(`#behaviorSettings option[id='${behaDropID}']`).prop('selected', true);
        let dropID = '$$'+session.getCurrentInteraction().category+'$$'+session.getCurrentInteraction().interactionType;
        $(`#interactionTypeDrop option[id='${dropID}']`).prop('selected', true);
    }
}

function updateInteractionProperty(key, value) {
    unsavedChanges = true;
    session.setInteractionProp(key, value);
}

// update a learning path property
function updateLpProperty(key, value, index = null, indexKey = null) {
    unsavedChanges = true;
    session.setProp(key, value, index, indexKey)
}

// save the currently opened learning path to the server
function saveCurrentLp() {
    if (session.learningPathOpened()) {
        learningPathToServer(session.getCurrentLearningPath(), () => {
            unsavedChanges = false;
        });
    }
}

function importLP(learningPaths) {
    for(let i = 0; i < learningPaths.length; i++){
        for(let j = 0; j < learningPaths[i].length; j++){
            session.addlearningPath(learningPaths[i][j])
            learningPathToServer(session.getlearningPathById(learningPaths[i][j].id), ()=>{
            }, true);
        }
    }
    setTimeout(() => {
        getHomePage();
    }, 1000);
}

// alert a message to the user
function alertToUser(message, seconds = 5, color = 'black') {
    userMess = document.getElementById("userMessage")
    userMess.innerText = message;
    userMess.style.color = color;
    setTimeout(() => {
        userMess.innerText = "";
        userMess.style.color = 'black';
    }, seconds * 1000)
}

// autosave every ten seconds
setInterval(function() {
    if (unsavedChanges)
        saveCurrentLp()
}, 10000)

window.onbeforeunload = function() {
    if(unsavedChanges){
        return "Deine Änderungen werden eventuell nicht gespeichert!";
    }
    
};

window.onresize = (event)=>{
    canvasManager.resizeCanvas();
};

function forwardTreegraph(){
    document.getElementById("treegraphNav").style.display = "block";
    createTreegraph(session.getCurrentLearningPath());
}

function openTreegraphOverlay(){
    document.getElementById("treegraphNav").style.display = "block";
    createTreegraph(session.getCurrentLearningPath());
}

function closeTreegraphOverlay(){
    document.getElementById("treegraphNav").style.display = "none";
}

function createTreegraph(lpData){

    console.log(lpData);

    var nodeList = [];
    var scenarioList = [];

    for(var i=0; i < lpData.scenarios.length; i++){
        if ("interactions" in lpData.scenarios[i]){
            console.log("WORKINGGGG");
            var interactList=[];
            for(var j=0; j < lpData.scenarios[i].interactions.length; j++){
                const interactDict = {
                    "name": lpData.scenarios[i].interactions[j].interactionType
                }
                interactList.push(interactDict);
            }
            const scenarioDict = {
                "name": lpData.scenarios[i].title,
                "children": interactList
            }
            scenarioList.push(scenarioDict);
        } else {
            const scenarioDict = {
                "name": lpData.scenarios[i].title
            }
            scenarioList.push(scenarioDict);
        }
    }

    var root = {"name": lpData.title, "parent": "null", "children": scenarioList}

    nodeList.push(root);

    console.log(root);

    let parent = document.getElementById("treegraph");

    let div = document.createElement("div");

    parent.appendChild(div);

    var margin = {top: 20, right: 120, bottom: 20, left: 120},
        width = 960 - margin.right - margin.left,
        height = 500 - margin.top - margin.bottom;

    var i = 0,
        duration = 750,
        root;

    var tree = d3.layout.tree()
        .size([height, width]);

    var diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });

    var svg = d3.select(div).append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    root = nodeList[0];
    root.x0 = height / 2;
    root.y0 = 0;

    update(root);

    d3.select(self.frameElement).style("height", "500px");

    function update(source) {

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

        // Normalize for fixed-depth.
        nodes.forEach(function(d) { d.y = d.depth * 180; });

        // Update the nodes…
        var node = svg.selectAll("g.node")
            .data(nodes, function(d) { return d.id || (d.id = ++i); });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
            .on("click", click);

        nodeEnter.append("circle")
            .attr("r", 1e-6)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeEnter.append("text")
            .attr("x", function(d) { return d.children || d._children ? -13 : 13; })
            .attr("dy", ".35em")
            .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
            .text(function(d) { return d.name; })
            .style("fill-opacity", 1e-6);

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

        nodeUpdate.select("circle")
            .attr("r", 10)
            .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
            .remove();

        nodeExit.select("circle")
            .attr("r", 1e-6);

        nodeExit.select("text")
            .style("fill-opacity", 1e-6);

        // Update the links…
        var link = svg.selectAll("path.link")
            .data(links, function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {x: source.x0, y: source.y0};
                return diagonal({source: o, target: o});
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {x: source.x, y: source.y};
                return diagonal({source: o, target: o});
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

// Toggle children on click.
    function click(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        update(d);
    }
}

