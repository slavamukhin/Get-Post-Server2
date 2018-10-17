'use strict';

let url = require('url');
let fs = require('fs');
let http = require('http');
let mime = require('mime');
let config = require('./config');
let path = require('path');

let server = http.createServer((req, res) => {
    let pathname = decodeURI(url.parse(req.url).pathname);
    let filename = pathname.slice(1);

    if (filename.includes('/') || filename.includes('..')) {
        res.statusCode = 400;
        res.end('Wrong path');
    }
    switch(req.method) {
        case 'GET':
            if (pathname === '/') {
                sendFile(config.publicPath + '/index.html', res);
            } else {
                sendFile(path.join(config.filePath, filename), res);
            }
            break;
        case 'POST':
            getFile(path.join(config.filePath, filename), req, res);
            break;
        case 'DELETE':
            deleteFile(path.join(config.filePath, filename), res);
            break;
        default:
            res.statusCode = 502;
            res.end("Not implemented");
    }
});

function sendFile(filename, res) {
    const stream = new fs.createReadStream(filename);
    const mimeType = mime.getType(filename);
    stream
        .on('error', error => {
            if (error.code === 'ENOENT') {
                res.statusCode = 404;
                res.end('File not found');
            } else {
                res.statusCode = 500;
                res.end('Server Error');
            }
        })
        .on('open', () => {
            res.setHeader('Content-Type', mimeType);
        });
    stream.pipe(res);
    res.on('close', () => {
        stream.destroy();
    })
}

function getFile(filename, req, res) {
    const stream = new fs.createWriteStream(filename, {flags: 'wx'});
    let size = 0;
    if (req.headers && req.headers['content-length']) {

        if (req.headers['content-length'] > config.limitFileSize) {
            res.statusCode = 413;
            res.end('file more 1 Mb');
            res.on('close', () => {
                    console.log('close');
                    stream.destroy();
                    fs.unlink(filename, error => {});
                });
        }
    } else {
        req
            .on('data', chunk => {
                size += chunk.length;
                if (size > config.limitFileSize) {
                    res.statusCode = 413;
                    res.setHeader('Connection', 'close');
                    res.end('file more 1 Mb');
                    stream.destroy();
                    fs.unlink(filename, error => {});
                }
            })
    }
    req.pipe(stream);
    stream
        .on('error', error => {
            if (error.code === 'EEXIST') {
                res.statusCode = 409;
                res.end('File exist')
            }
        })
        .on('close', () => {
            res.statusCode = 200;
            res.end('OK');
        });
}

function deleteFile(filename, res) {
    fs.unlink(filename, error => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.statusCode = 404;
                res.end('File not found');
            }
        }
        res.statusCode = 200;
        res.end('OK')
    })
}

module.exports = server;