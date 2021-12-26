const express = require('express');
const session = require('express-session');
const { render } = require('express/lib/response');
const PsqlStore = require('./src/psqlStore.js')(session);
const unique = require('./src/uniqueIdentifiers.js');
const dbMan = require('./src/dbManager.js');

require('dotenv').config();

const app = express();

function noop() { return }

app.use(session({
    store: new PsqlStore(),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 365 * 24 * 60 * 60 * 1000
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use(cookieParser());
app.set('view engine', 'ejs');

// host public static folder for files
app.use(express.static('public'));
app.use('img', express.static(__dirname + 'public/img'));
app.use('html', express.static(__dirname + 'public/html'));
app.use('css', express.static(__dirname + 'public/css'));
app.use('js', express.static(__dirname + 'public/js'));

// user loading site initialy
app.get('/', (req, res) => {

    if (req.session.isAuth == true) {

        // user is known
        dbMan.selectMatch('public.user', 'uid, nickname', 'latestSession', req.sessionID, renderIndex)
    } else {

        // user is unknowm
        req.session.isAuth = true;
        renderIndex([{ 'uid': 0, 'nickname': 'Anonymer Benutzer' }]);
    }

    function renderIndex(data) {
        console.log("user " + data[0]['uid'] + " connected!");
        dbMan.selectMatch('public.learningpath', 'lpid, title', 'owner', data[0]['uid'], (_data) => {
            res.render('index', {
                data: {
                    learningPaths: _data,
                    uId: data[0]['uid'],
                    nickname: data[0]['nickname']
                }
            });
        });
    }
})

app.get('/get_started', (req, res) => {
    res.render('landing');
})

// user wants to edit a learningPath
app.get('/editor', (req, res) => {
    let lpid = req.query.lpid;

    if (req.session.isAuth == true) {

        // resolve uid
        getCurrentUser(req.sessionID, (uid) => {

            // find owner of lp
            dbMan.selectMatch('public.learningpath', 'owner, content', 'lpid', lpid, (data) => {

                // check if user is owner of lp that is to be deleted
                if (uid == data[0]['owner']) {
                    res.render('partials/editor', {
                        data: {
                            'learningpath': data[0]['content']
                        }
                    });
                } else {
                    res.render('landing');
                }
            });
        });
    }
})

// user wants to create a learningPath
app.get('/create', (req, res) => {
    if (req.session.isAuth == true) {

        // get name for new learningPath
        getCurrentUser(req.sessionID, (currentUserID) => {
            dbMan.selectMatch('public.learningpath', 'lpid, title', 'owner', currentUserID, (data) => {
                let lpids = [];
                let names = [];
                for (let i = 0; i < data.length; i++) {
                    lpids.push(data[i]['lpid']);
                    names.push(data[i]['title']);
                }
                let id = unique.uniqueId(lpids);
                let name = unique.uniqueName('Lernpfad', names);
                dbMan.insert('public.learningpath', { 'lpid': id, 'title': name, 'content': JSON.stringify({ props: { 'id': id, 'title': name } }), 'owner': currentUserID }, () => {
                    res.status(200).send({
                        'learningpathID': id,
                        'learningpathTitle': name
                    });
                })
            });
        });
    } else {

        // authenticate user before lp can be created
        res.render('landing');
    }
})

// user wants to edit the settings
app.get('/settings', (req, res) => {
    let sid = req.sessionID;
    let lpid = req.query.lpid;
    let mode = req.query.mode;

    if (req.session.isAuth == true) {

        if (mode == 'userSettingsOnly') {
            dbMan.selectMatch('public.user', 'uid, nickname', 'latestSession', sid, (data) => {
                res.render('partials/settings', {
                    data: {
                        'lpSet': false,
                        'userSet': true,
                        'nickname': data[0]['nickname']
                    }
                });
            });
        } else if (mode == 'lpSettingsOnly') {
            lpSet(false);
        } else if (mode == 'allSettings') {
            lpSet(true);
        }
    }

    function lpSet(getUserSettings) {
        // resolve uid
        dbMan.selectMatch('public.user', 'uid, nickname', 'latestSession', sid, (data) => {

            // find owner of lp
            dbMan.selectMatch('public.learningpath', 'owner, title', 'lpid', lpid, (_data) => {

                // check if user is owner of lp that is to be deleted
                if (data[0]['uid'] == _data[0]['owner']) {
                    res.render('partials/settings', {
                        data: {
                            'lpSet': true,
                            'userSet': getUserSettings,
                            'nickname': data[0]['nickname']
                        }
                    });
                } else {
                    res.render('landing');
                }
            });
        });
    }
})

// user wants to navigate back to landing page
app.get('/home', (req, res) => {
    getCurrentUser(req.sessionID, (uid) => {
        dbMan.selectMatch('public.learningpath', 'lpid, title', 'owner', uid, (data) => {
            res.render('partials/dashboard', {
                data: {
                    learningPaths: data
                }
            });
        })
    });
})

// user wants a list of his learningPaths
app.get('/learningPaths', (req, res) => {
    getCurrentUser(req.sessionID, (uid) => {
        dbMan.selectMatch('learningpath', 'lpid, title', 'owner', uid, (data) => {
            res.send(JSON.stringify(data));
        })
    });
})

// user wants to push his updates to the server
app.post('/updateLp', (req, res) => {
    let lpid = req.body.lpid;

    if (req.session.isAuth == true) {

        // resolve uid
        getCurrentUser(req.sessionID, (uid) => {

            // find owner of lp
            dbMan.selectMatch('public.learningpath', 'owner', 'lpid', lpid, (owner) => {

                // check if user is owner of lp that is to be deleted
                if (uid == owner[0]['owner']) {
                    dbMan._update('learningpath', 'lpid', lpid, {
                        'title': req.body.title,
                        'content': req.body.learningPath
                    }, () => {

                        // respond OK to client
                        res.send('200')
                    })
                }
            });
        });
    }
});

app.post('/updateUserName', (req, res) => {
    let sid = req.sessionID;

    if (req.session.isAuth == true) {
        getCurrentUser(sid, (uid) => {
            dbMan._update('public.user', 'uid', uid, {
                'nickname': req.body.nickname
            }, () => {

                // respond OK to client
                res.send('200')
            })
        });
    }
});

// user wants to know his username
app.get('/whoami', (req, res) => {
    let sid = req.sessionID;

    if (req.session.isAuth == true) {

        // resolve uid
        dbMan.selectMatch('public.user', 'nickname', 'latestSession', sid, (data) => {
            res.status(200).send({
                'nickname': data[0]['nickname'],
                'uid': data[0]['uid']
            });
        });
    }
});


app.post('/updateSettings', (req, res) => {

    res.send('200')
})

// TODO increase performance by only updating props instaed of full lp
app.post('updateLpProp', (req, res) => {

    res.send('200')
})

// user wants to delete a learningPath
app.post('/deletelp', (req, res) => {
    let lpid = req.body.lpid;

    if (req.session.isAuth == true) {

        // resolve uid
        getCurrentUser(req.sessionID, (uid) => {

            // find owner of lp
            dbMan.selectMatch('public.learningpath', 'owner', 'lpid', lpid, (owner) => {

                // check if user is owner of lp that is to be deleted
                if (uid == owner[0]['owner']) {
                    dbMan._delete('learningpath', 'lpid', lpid, () => {

                        // respond OK to client
                        res.send('200')
                    })
                }
            });
        });
    }
})

// start server
app.listen(process.env.HTTP_PORT, function(err) {
    if (err)
        console.log("Error in server setup");
    console.log("Server listening on Port", process.env.HTTP_PORT);
})

// return the current user
function getCurrentUser(sessionID, cb = noop) {
    dbMan.selectMatch('public.user', 'uid', 'latestSession', sessionID, (data) => {
        return cb(data[0]['uid'])
    });
}