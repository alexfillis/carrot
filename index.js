const express = require('express');
const config = require('./config');
const Imap = require('imap'),
    inspect = require('util').inspect;
var fs = require('fs'), fileStream;
const simpleParser = require('mailparser').simpleParser;

const app = express();

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(3000, () => console.log('Example app listening on port 3000!'));

const imap = new Imap({
    user: config.imap.user.name,
    password: config.imap.user.password,
    host: config.imap.host.name,
    port: config.imap.host.port,
    tls: config.imap.host.secure
});

const messageHandler = (msg, seqno) => {
    console.log('Message #%d', seqno);
    const prefix = '(#' + seqno + ') ';
    msg.on('body', function(stream, info) {
        console.log(prefix + 'Body');
        simpleParser(stream)
            .then(mail => {
                console.log(mail.html);
                fs.writeFile('msg-' + seqno + '-body.html', mail.html, function(err) {
                    if(err) {
                        return console.log(err);
                    }

                    console.log("The file was saved!");
                });
            })
            .catch(err => {
                console.error(err)
            })
    });
    msg.once('attributes', function(attrs) {
        console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
    });
    msg.once('end', function() {
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
    imap.search([ 'UNSEEN', ['SINCE', 'May 20, 2010'] ], function(err, results) {
        if (err) throw err;
        var f = imap.fetch(results, { bodies: '' });
        f.on('message', messageHandler);
        f.once('error', errorHandler);
        f.once('end', endHandler);
    });
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