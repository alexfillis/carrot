const express = require('express');
const config = require('./config');
var Imap = require('imap'),
    inspect = require('util').inspect;

const app = express();

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(3000, () => console.log('Example app listening on port 3000!'));

var imap = new Imap({
    user: config.imap.user.name,
    password: config.imap.user.password,
    host: config.imap.host.name,
    port: config.imap.host.port,
    tls: config.imap.host.secure
});

const messageHandler = (msg, seqno) => {
    console.log('Message #%d', seqno);
    var prefix = '(#' + seqno + ') ';
    msg.on('body', function (stream, info) {
        if (info.which === 'TEXT')
            console.log(prefix + 'Body [%s] found, %d total bytes', inspect(info.which), info.size);
        var buffer = '', count = 0;
        stream.on('data', function (chunk) {
            count += chunk.length;
            buffer += chunk.toString('utf8');
            if (info.which === 'TEXT')
                console.log(prefix + 'Body [%s] (%d/%d)', inspect(info.which), count, info.size);
        });
        stream.once('end', function () {
            if (info.which !== 'TEXT')
                console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
            else
                console.log(prefix + 'Body [%s] Finished', inspect(info.which));
        });
    });
    msg.once('attributes', function (attrs) {
        console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
    });
    msg.once('end', function () {
        console.log(prefix + 'Finished');
    });
};

const errorHandler = err => {
    console.log('Fetch error: ' + err);
};

const endHandler = () => {
    console.log('Done fetching all messages!');
    imap.end();
};

const openHandler = (err, box) => {
    if (err) throw err;
    var f = imap.seq.fetch(box.messages.total + ':*', {bodies: ['HEADER.FIELDS (FROM)', 'TEXT']});
    f.on('message', messageHandler);
    f.once('error', errorHandler);
    f.once('end', endHandler);
};

const readyHandler = () => {
    imap.openBox('INBOX', true, openHandler);
};

imap.once('ready', readyHandler);

imap.once('error', function(err) {
    console.log(err);
});

imap.once('end', function() {
    console.log('Connection ended');
});

imap.connect();