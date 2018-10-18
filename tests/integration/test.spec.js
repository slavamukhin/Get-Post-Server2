const r = require('request');
const server = require('../../server');
const fs = require('fs');
const fsE = require('fs-extra');
const config = require('../../config');
const host = 'http://localhost:3001';
const request = r.defaults({
    encoding: null
});
 const rp = require('request-promise').defaults({
     encoding: null,
     resolveWithFullResponse: true
 });
const {Readable} = require('stream');

describe('test server', () => {
   before(async () => {
       await server.listen(3001);
   });
    after(async () => {
        await server.close();
    });
    beforeEach(async () => {
        await fsE.emptyDirSync(config.filePath);
    });
    it('should return index.html', async () => {
        const indexHtml = fs.readFileSync(config.publicPath + '/index.html');
        const response = await rp(host);
        response.body.equals(indexHtml).should.be.true();
    });
    describe('tests GET', () => {
        context('When exists GET/file', () => {
            beforeEach(async () => {
                await fsE.copySync(config.fixturePath + '/small.jpg', config.filePath + '/small.jpg');
            });
            it('return statusCode 200 & the file', async () => {
                const file = fs.readFileSync(config.filePath + '/small.jpg');
                const response = await rp(host + '/small.jpg');
                response.statusCode.should.be.equal(200);
                response.body.equals(file).should.be.true();

            });
        });
        context('File not found GET/file', () => {
            it('should return 404', async () => {
                await rp(host + '/small.jpg').catch(err => {
                    err.statusCode.should.be.equal(404);
                });
            });
        });

        it('Wrong path nested/path or nested/../path', async () => {
            await rp(host + '/wrong/../path').catch(err => {
                err.statusCode.should.be.equal(400);
            })
        });
    });
    context('tests POST', () => {
        context('When exists POST/file', () => {
            beforeEach(async () => {
                await fsE.copySync(config.fixturePath + '/small.jpg', config.filePath + '/small.jpg');
            });
            const options = {
                method: 'POST',
                uri: host + '/small.jpg',
            };
            context('When small file size', () => {
                it('return 409 file exists POST/file', async () => {
                    const mtime = fsE.statSync(config.filePath + '/small.jpg').mtime;

                    await rp(options).catch(err => {
                        const newMtime = fsE.statSync(config.filePath + '/small.jpg').mtime;
                        mtime.should.be.eql(newMtime);
                        err.statusCode.should.be.equal(409);
                    });
                });
            });
            context('When zero file size', () => {
                it('return 409 file exists POST/file', async () => {
                    await rp(options).catch(err => {
                        err.statusCode.should.be.equal(409)
                    });
                });
            });
        });
        context('When file to big POST/file', () => {
            const options = {
                method: 'POST',
                url: host + '/big.png',
            };
           it('should return 413 & no file appears', async () => {
               await rp(options).catch(err => {
                   fsE.existsSync(config.filePath + '/big.png').should.be.false();
                   err.statusCode.should.be.equal(413);
               });
           });
        });
        context('When upload', () => {
            const options = {
                method: 'POST',
                url: host + '/small.jpg',
            };
            context('When upload a new file POST/file', () => {
                it('should return 200 & upload a new file', async () => {
                    const file = fsE.readFileSync(config.fixturePath + '/small.jpg');
                    let response = await rp(options);
                    response.statusCode.should.be.equal(200);
                    console.log('response.body', response.body);
                    console.log('file', file);
                    // response.body.equals(file).should.be.true();
                });
            });
            context('When upload a new file zero size POST/file', () => {
                it('should return 200 & upload a new file', async () => {
                    const response = await rp(options);
                    response.statusCode.should.be.equal(200);
                    fsE.statSync(config.filePath + '/small.jpg').size.should.be.equal(0);
                });
            });
        });

    });
    context('tests DELETE', () => {
        const options = {
            method: 'DELETE',
            url: host + '/small.jpg',
        };
        context('When exists DELETE/file', () => {
            beforeEach(async () => {
               await fsE.copySync(config.fixturePath + '/small.jpg', config.filePath + '/small.jpg');
            });
            it('return statusCode 200 & response "OK"', async () => {
                const response = await rp(options);
                response.statusCode.should.be.equal(200);
                response.body.toString().should.be.equal('OK');
            });
        });
        context('File not found DELETE/file', () => {
            it('should return 404', async () => {
                await rp(options).catch(err => {
                   err.statusCode.should.be.equal(404);
                });
            });
        });
    });
});
