// stores currently dragged element
var draggedInteraction = null;

// is true when changes are not saved yet
var unsavedChanges = false;

// on startup
$(document).ready(() => {
    updateUserName();
    fetchlearningPaths();
});

function isValidURL(str) {
    var res = str.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    if(res==null)
        alert("Unvalid URL");
    return (res != null)
  };

  function addImage(str) {
      let id=document.getElementById(str);
      let source=document.getElementById(str).value;
      if(isValidURL(source)){
        document.getElementById('imageID').src=source;
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
            learningPathToServer(session.getCurrentlearningPath(), () => {
                session.closelearningPath();
                getHomePage();
            });
        } else {
            getHomePage();
        }
    } else if (id == 'settingsBtn') {
        getSettingsPage();
    } else if (id == 'downloadButton') {
        if (session.learningPathOpened()) {
            downloadlearningPaths([session.getCurrentlearningPath()], 'json');
        } else {
            lpids = []
            for (lp of session.getlearningPaths())
                lpids.push(lp.id);
            downloadlearningPaths(session.getlearningPaths(), 'json');
        }
    } else if (id == 'exportButton') {
        if (session.learningPathOpened()) {
            downloadlearningPaths([session.getCurrentlearningPath()], 'pdf');
        } else {
            lpids = []
            for (lp of session.getlearningPaths())
                lpids.push(lp.id);
            downloadlearningPaths(session.getlearningPaths(), 'pdf');
        }
    } else if (id == 'createLpBtn') {
        createLpOnServer(() => {
            fetchlearningPaths();
            getSettingsPage(mode = 'lpSettingsOnly');
        });
    } else if (id == 'saveSettingsBtn') {
        if (session.learningPathOpened()) {
            saveCurrentLp();
            getEditPage();
        } else {
            getHomePage();
        }
    } else if (id == 'addScenarioButton') {
        if (session.learningPathOpened()) {
            session.createScenario({ 'title': 'Neues Szenario' }, () => {
                learningPathToServer(session.getCurrentlearningPath(), () => {
                    getEditPage(session.getCurrentlearningPathId(), () => {

                        // scroll to the bottom
                        window.scrollTo(0, document.body.scrollHeight);
                    });
                });
            });
        }
    }

    // handle open scenario buttons
    else if (classes.contains('openScenario')) {
        scenarioIndex = id.replaceAll('openScenario', '');
        if (button.getAttribute("aria-expanded") === 'false')
            session.openScenario(scenarioIndex);
        else
            session.closeScenario();
        refreshInteractivityList();
    }

    // handle delete scenario buttons
    else if (classes.contains('deleteScenario')) {
        scenarioIndex = id.replaceAll('deleteScenario', '');
        session.deleteScenario(scenarioIndex);
        learningPathToServer(session.getCurrentlearningPath(), () => {
            getEditPage();
        });
    }

    // handle open learningPath buttons
    else if (classes.contains('openLp')) {
        editID = id.replaceAll('openLp', '');
        getEditPage(editID);
        session.openlearningPath(editID);
    }

    // handle delete learningPath buttons
    else if (classes.contains('deleteLp')) {
        let lpID = id.replaceAll('delete', '');
        let editID = 'openLpDiv' + lpID
        let deleteID = 'deleteLpDiv' + lpID

        let deleteButton = document.getElementById(deleteID);
        deleteButton.remove();

        let editButton = document.getElementById(editID);
        editButton.remove();

        deletelearningPath(lpID, () => {
            if (session.getCurrentlearningPathId() == lpID)
                session.closelearningPath()
            session.removelearningPath(lpID)
        })
    } else if (classes.contains('interactivityListItem')) {
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
    } else if (id == 'lpEvaluationMode') {
        updateLpProperty('evaluationModeID', input.value);
    } else if (id == 'lpTitleInput') {
        updateLpProperty('title', input.value);
    } else if (id == 'userNameInput') {
        changeUserName(input.value, () => {
            updateUserName();
        });
    } else if (classes.contains('lpTitleInput')) {
        scenarioIndex = id.replaceAll('lpTitleInput', '');
        updateLpProperty('scenarios', input.value, scenarioIndex, 'title');
    } else if (classes.contains('lpDescription')) {
        scenarioIndex = id.replaceAll('lpDescription', '');
        updateLpProperty('scenarios', input.value, scenarioIndex, 'description');
    } else if (classes.contains('lpLearningGoal')) {
        scenarioIndex = id.replaceAll('lpLearningGoal', '');
        updateLpProperty('scenarios', input.value, scenarioIndex, 'learningGoal');
    } else if (classes.contains('lpResource')) {
        scenarioIndex = id.replaceAll('lpResource', '');
        updateLpProperty('scenarios', input.value, scenarioIndex, 'resource');
    } else if (classes.contains('interactivityInputCB')) {
        let checked = input.checked
        let category = input.getAttribute("class").replaceAll('interactivityInputCB ', '');
        let interactivity = id.replaceAll('CB', '')
        interactivity = interactivity.replace(/^\s+|\s+$/g, '');
        let newList = session.getProp('interactivityTypes', category) == null ? [] : session.getProp('interactivityTypes', category);
        if (checked)
            newList.push(interactivity)
        else
            newList = rmByValue(newList, interactivity)
        session.setProp('interactivityTypes', newList, category)
        unsavedChanges = true;
        saveCurrentLp();
    } else if (id == 'x_coord') {
        updateInteractionProperty('x_coord', input.value)
    } else if (id == 'y_coord') {
        updateInteractionProperty('y_coord', input.value)
    } else if (id == 'evaluationHeurestic') {
        updateInteractionProperty('evaluationHeurestic', input.value)
    } else if (id == 'behaviorSettings') {
        updateInteractionProperty('behaviorSettings', input.value)
    } else if (id == 'interactionTypeDrop') {
        if (session.learningPathOpened() && session.scenarioOpened() && session.interactionOpened()) {
            let elemId = $(input).find('option:selected').attr('id')
            let category = elemId.split('$$')[1];
            let interactionType = elemId.split('$$')[2];
            category = category = category.trim();
            interactionType = interactionType = interactionType.trim();
            session.setInteractionProp('category', category);
            session.setInteractionProp('interactionType', interactionType);
            refreshInteractivityList();
        }
    }
});

// fire on drag start 
document.addEventListener("dragstart", (event) => {
    draggedInteraction = event.target;
    if (draggedInteraction != null && draggedInteraction.classList.contains("interactivityBox")) {
        draggedInteraction.style.opacity = .5;
    }
}, false);

// allow dropping of interactivities
document.addEventListener("dragover", (event) => {
    if (draggedInteraction != null && draggedInteraction.classList.contains("interactivityBox"))
        event.preventDefault();
}, false);

// handle dropable elements beeing dropped
document.addEventListener("drop", (event) => {
    let coordinates = { 'x': event.offsetX, 'y': event.offsetY };

    droppedTo = event.target;

    if (draggedInteraction != null && draggedInteraction.classList.contains("interactivityBox")) {
        draggedInteraction.style.opacity = 1;
        event.preventDefault();
        if (droppedTo.classList.contains('workspace')) {
            let category = draggedInteraction.getAttribute('id').split('$$')[0];
            let interactionType = draggedInteraction.getAttribute('id').split('$$')[1];
            category.trim()
            interactionType.trim()
            session.addInteraction(coordinates, category, interactionType);
            draggedInteraction = null;
            unsavedChanges = true;
            session.openInteraction(session.getCurrentScenario().interactions.length - 1)
            refreshInteractivityList();
        }
    }
}, false);

function refreshInteractivityList() {
    if (session.scenarioOpened() && session.propExists(['interactions'], session.getCurrentScenario())) {
        $('.interactivityList').html('');
        for (let i = 0; i < session.getCurrentScenario().interactions.length; i++) {
            inter = session.getCurrentScenario().interactions[i];
            $('.interactivityList').append('<div class="interactivityListElem"> <button class="button btn interactivityListItem" id="iaListItem' + i + '">' + inter.category + ' - ' + inter.interactionType + '</button></div>');
        }
        refreshInteractivityInputs();
    }

}

function refreshInteractivityInputs() {
    if (session.learningPathOpened() && session.scenarioOpened() && session.interactionOpened()) {
        $(".x_coord").val(session.getCurrentInteraction().x_coord);
        $(".y_coord").val(session.getCurrentInteraction().y_coord);
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
        learningPathToServer(session.getCurrentlearningPath(), () => {
            alertToUser('Änderungen gespeichert!', 3);
            unsavedChanges = false;
        });
    }
}

// alert a message to the user
function alertToUser(message, seconds = 5, color = 'black') {

    // TODO

    console.log(message);
}

// autosave every ten seconds
setInterval(function() {
    if (unsavedChanges)
        saveCurrentLp()
}, 10000)