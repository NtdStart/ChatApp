var express = require('express'),
    router = express.Router(),
    cons = require('consolidate'),
    express = require('express'),
    body_parser = require('body-parser'),
    app = express().use(body_parser.json());

// assign the swig engine to .html files
app.engine('html', cons.swig);
// set .html as the default extension
app.set('view engine', 'html');
app.set('views', './views/admin');

router.get('/', function(req, res) {
    res.render('index', {
        title: 'Consolidate.js'
    });
});

router.post('/', function(req, res) {
    res.send('POST handler for /pages route.');
});
module.exports = router;