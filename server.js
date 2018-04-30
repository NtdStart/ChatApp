/*
 * Starter Project for Messenger Platform Quick Start Tutorial
 *
 * Remix this as the starting point for following the Messenger Platform
 * quick start tutorial.
 *
 * https://developers.facebook.com/docs/messenger-platform/getting-started/quick-start/
 *
 */

'use strict';

// Imports dependencies and set up http server
const
    request = require('request'),
    cons = require('consolidate'),
    express = require('express'),
    body_parser = require('body-parser'),
    app = express().use(body_parser.json()),
    PAGE_ACCESS_TOKEN = 'EAAc4hc2H1NcBACH5ffJLJ0lxPBMx3TlSkKLDLoquMOVZCCOgC25cOkDhIC0vNvp5ZCiDACXfssXovqKO7EHp4VufZCZCKH8CQAAcGNosFGCwdvo0UVBB73wqhaVy6qUQ8bFXYRon59mjvGHZBX0kQJJvHLYl75f87zYAPIT55c7ge651wUQsJ';

var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;


http.listen(port, function () {
    console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static('public'));


io.on('connection', function (socket) {

    /**
     * On registered user from client.
     */
    socket.on('registerUser', function (userId, connectionId) {
        pushService.registerUser(userId, connectionId);
    });


    /**
     * On registered socket from client.
     */
    socket.on('registerSocket', function (userId, connectionId) {
        pushService.registerSocket(userId, connectionId, socket);
    });


    /**
     * On join group from client.
     */
    socket.on('joinGroup', function (group) {
        pushService.joinGroup(group, socket);
    });

    /**
     * On disconnected socket.
     */
    socket.on('disconnect', function () {
        pushService.removeConnection(socket);
    });

});


var myLogger = function (req, res, next) {
    console.log('LOGGED ')
    next()
};
var requestTime = function (req, res, next) {
    req.requestTime = Date.now()
    next()
};

app.use(myLogger);
app.use(requestTime);


var page = require('./public/page');

app.use('/page', page);

// assign the swig engine to .html files
app.engine('html', cons.swig);

// set .html as the default extension
app.set('view engine', 'html');
app.set('views', './views');

app.get('/', function (req, res) {
    res.render('index', {
        title: 'Consolidate.js'
    });
});


// creates express http server
app.get('/', function (req, res) {
    var responseText = 'Hello World!<br>'
    responseText += '<small>Requested at: ' + req.requestTime + '</small>'
    res.send(responseText)
})

// Accepts POST requests at /webhook endpoint
app.post('/webhook', (req, res) => {
    // Parse the request body from the POST
    let body = req.body;
    // Check the webhook event is from a Page subscription
    if (body.object === 'page') {
        // Iterate over each entry - there may be multiple if batched
        body.entry.forEach(function (entry) {
            // Get the webhook event. entry.messaging is an array, but
            // will only ever contain one event, so we get index 0
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);
            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);
            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                let text = webhook_event.message.text;
                console.log('Text: ' + text);
                handleMessage(sender_psid, webhook_event.message);
                var group = '50k';
                pushService.broadcastGroup(group, text);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });
        // Return a '200 OK' response to all events
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }
});

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {

    /** UPDATE YOUR VERIFY TOKEN **/
    const VERIFY_TOKEN = "123456";

    // Parse params from the webhook verification request
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Check if a token and mode were sent
    if (mode && token) {

        // Check the mode and token sent are correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Respond with 200 OK and challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});


function handleMessage(sender_psid, received_message) {
    let response;
    // Check if the message contains text
    if (received_message.text) {
        // Create the payload for a basic text message
        response = {
            "text": `Bạn vừa hỏi : "${received_message.text}". Chờ chúng tôi xử lý !`
        }
    }
    // Sends the response message
    callSendAPI(sender_psid, response);
}


function handlePostback(sender_psid, received_postback) {
    let response;
    // Get the payload for the postback
    let payload = received_postback.payload;
    // Set the response based on the postback payload
    if (payload === 'yes') {
        response = {"text": "Thanks!"}
    } else if (payload === 'no') {
        response = {"text": "Oops, try sending another image."}
    }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
}


function callSendAPI(sender_psid, response) {
    // Construct the message body
    let request_body = {
        "messaging_type": "RESPONSE",
        "recipient": {
            "id": sender_psid
        },
        "message": response
    }
    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": {"access_token": PAGE_ACCESS_TOKEN},
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('Message sent to facebook API success!')
        } else {
            console.error("Unable to send message:" + err);
        }
    });
}


var pushService = (function () {
    var connections = {};
    return {
        /**
         * Register user in connections. This method must be executed as first in whole registration process.
         * @param userId id of user.
         * @param connectionId id of connection.
         */
        registerUser: function (userId, connectionId) {
            if (connections[userId] === undefined) {
                connections[userId] = {};
            }
            connections[userId][connectionId] = null;
            console.log('Registered connection ' + connectionId.substring(0, 4) + '*** for user ' + userId);
        },
        /**
         * Register socket to communication. Must be executed after registerUser.
         * Modify socket object and set field userId and connectionId.
         * @param userId id of user.
         * @param connectionId id of connection.
         * @param socket socket.
         * @returns {boolean} if socket was registered or not, if false then you have to do everything again.
         */
        registerSocket: function (userId, connectionId, socket) {
            if (connections[userId] != null && connections[userId][connectionId] == null) {
                socket.userId = userId;
                socket.connectionId = connectionId;
                connections[userId][connectionId] = socket;
                console.log('Registered socket for connection ' + connectionId.substring(0, 4) + '*** and  user ' + userId);
                return true;
            } else {
                return false;
            }
        },


        joinGroup: function (group, socket) {
            socket.join(group);
            console.log('Socket join group success : ' + group);
            return true;
        },

        /**
         * Remove connection.
         * @param socket socket to remove.
         */
        removeConnection: function (socket) {
            var userId = socket.userId;
            var connectionId = socket.connectionId;
            if (userId && connectionId && connections[userId] && connections[userId][connectionId]) {
                console.log('Removed socket for user ' + userId + ' and connection: ' + connectionId.substring(0, 4) + '***');
                delete connections[socket.connectionId];
            }
        },
        /**
         * Send notification to user.
         * @param userId id of user.
         * @param message message.
         */
        pushMessage: function (userId, message) {
            var userConnections = connections[userId];
            if (userConnections) {
                for (var connectionId in  userConnections) {
                    if (userConnections.hasOwnProperty(connectionId)) {
                        var socket = userConnections[connectionId];
                        if (socket != null) {
                            socket.emit('notification', message);
                            console.log('Message notification : ' + message);
                        }
                    }
                }
            }
        },

        /**
         * Send notification to group.
         * @param group id.
         * @param message message.
         */
        broadcastGroup: function (group, message) {
            io.in(group).emit('broadcast_notification', message);
            console.log('Broadcast notification : ' + message);
        },

    }
}());


/**
 * Configuration from package.json
 */

var pjson = require('./package.json');

/**
 * Ping endpoint.
 */
app.get('/api/status/ping', function (req, res) {
    res.send('pong')
});

/**
 * Info endpoint.
 */
app.get('/api/status/info', function (req, res) {
    res.setHeader('Content-Type', 'application/json');
    var info = {
        'name': pjson.name,
        'version': pjson.version
    };
    res.send(info)
});
