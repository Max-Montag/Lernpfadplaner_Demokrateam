class Session {
    constructor() {
        this.learningPaths = [];
        this.currentLearningPathId = null;
    }

    createScenario(params, cb = noop) {
        if (this.currentLearningPathId != null) {
            this.learningPaths[this.getLpIndexById(this.currentLearningPathId)].createScenario({ 'title': params.title }, () => {
                return cb()
            });
        }
    }

    setProp(key, value, index = null, indexKey = null) {
        if (index === null)
            this.learningPaths[this.getLpIndexById(this.currentLearningPathId)][key] = value;
        else if (index !== null && indexKey === null)
            this.learningPaths[this.getLpIndexById(this.currentLearningPathId)][key][index] = value;
        else
            this.learningPaths[this.getLpIndexById(this.currentLearningPathId)][key][index][indexKey] = value;

    }

    getProp(key, index = null, indexKey = null) {
        if (index === null)
            return this.learningPaths[this.getLpIndexById(this.currentLearningPathId)][key];
        else if (index !== null && indexKey === null)
            return this.learningPaths[this.getLpIndexById(this.currentLearningPathId)][key][index];
        else
            return this.learningPaths[this.getLpIndexById(this.currentLearningPathId)][key][index][indexKey];
    }

    // create scanario at any position
    createScenario(props, cb = noop) {
        this.learningPaths[this.getLpIndexById(this.currentLearningPathId)].scenarios = insertAt(this.learningPaths[this.getLpIndexById(this.currentLearningPathId)].scenarios, props);
        return cb()
    }

    moveScenario(indexOld, indexNew) {
        this.learningPaths[this.getLpIndexById(this.currentLearningPathId)].scenarios = mvByIndex(this.learningPaths[this.getLpIndexById(this.currentLearningPathId)].scenarios, indexOld, indexNew)
    }

    deleteScenario(index) {
        this.learningPaths[this.getLpIndexById(this.currentLearningPathId)].scenarios = rmByIndex(this.learningPaths[this.getLpIndexById(this.currentLearningPathId)].scenarios, index)
    }

    // get Id of current (opened) learningPath
    getCurrentLearningPathId() { return this.currentLearningPathId; }

    // get all learningPaths

    getLearningPaths() { return this.learningPaths; }

    // get a read only object representation by id 
    getLearningPathById(id) {
        return this.learningPaths[this.getLpIndexById(id)]
    }

    // get a read only object representation of current lp 
    getCurrentLearningPath() {
        return this.getLearningPathById(this.currentLearningPathId);
    }

    getLpIndexById(id) {
        for (let i = 0; i < this.learningPaths.length; i++)
            if (this.learningPaths[i].id == id)
                return i
        return null
    }

    updateLearningPaths(learningPaths) {
        this.learningPaths = []

        // TODO 
        if (learningPaths)
            for (let i = 0; i < learningPaths.length; i++)
                this.addLearningPath(learningPaths[i].content);
    }

    // add learning path to list and return id
    addLearningPath(params) {
        let lp = params;
        this.learningPaths = insertAt(this.learningPaths, lp);
    }

    // remove Learning Path from list
    removeLearningPath(id) {

        // if deleted path is opened -> close
        if (this.currentLearningPathId == id)
            this.closeLearningPath();

        this.learningPaths = rmById(this.learningPaths, id);
    }

    // open a learning path by id
    openLearningPath(id) {
        this.currentLearningPathId = id;
    }

    // close the current learning path
    closeLearningPath() {
        this.currentLearningPathId = null;
    }

    learningPathOpened() {
        return this.currentLearningPathId != null;
    }

}

const session = new Session();