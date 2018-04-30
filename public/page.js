var express = require('express'),
    router = express.Router(),
    express = require('express'),
    body_parser = require('body-parser'),
    app = express().use(body_parser.json());




router.get('/', function(req, res) {
    res.send('GET handler for /pages route.');
});

router.post('/', function(req, res) {
    res.send('POST handler for /pages route.');
});
module.exports = router;