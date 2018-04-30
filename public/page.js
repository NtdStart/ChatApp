var express = require('express');

var router = express.Router();

router.get('/', function(req, res) {
    res.send('GET handler for /pages route.' );
});

router.post('/', function(req, res) {
    res.send('POST handler for /pages route.');
});
module.exports = router;