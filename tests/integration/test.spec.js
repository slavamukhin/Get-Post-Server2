const r = require('request');
const server = require('../../server');
const fs = require('fs');
const fsE = require('fs-extra');
const config = require('../../config');
const host = 'http://localhost:3001';
const request = r.defaults({
    encoding: null
});
const {Readable} = require('stream');

describe('test server', () => {
   before(done => {
       server.listen(3001, done);
   });
    after(done => {
        server.close(done);
    });
    beforeEach(done => {
        fsE.emptyDirSync(config.filePath);
        done();
    });
    it('should return index.html', done => {
        request(host, (error, response, body) => {
            if (error) return done(error);
            const indexHtml = fs.readFileSync(config.publicPath + '/index.html', {encoding: 'utf-8'});
            should.equal(indexHtml, body, 'rewrote should');
            done();
        });
    });
    describe('tests GET', () => {
        context('When exists GET/file', () => {
            beforeEach(done=>{
                fsE.copySync(config.fixturePath + '/small.jpg', config.filePath + '/small.jpg');
                done();
            });
            it('return statusCode 200 & the file', done => {
                const file = fs.readFileSync(config.filePath + '/small.jpg');
                request.get(host + '/small.jpg', (error, response, body) => {
                    if (error) return done(error);
                    response.statusCode.should.be.equal(200);
                    body.equals(file).should.be.true();
                    done();
                });
            });
        });
        context('File not found GET/file', () => {
            it('should return 404', (done) => {
                request(host + '/small.jpg', (error, response, body) => {
                   if (error) return done(error);
                   response.statusCode.should.be.equal(404);
                   done();
                });
            })
        });

        it('Wrong pass nested/pass or nested/../pass', done=> {
            request.get(host + '/wrong/../pass', (error, response, body)=>{
                if (error) return done(error);
                response.statusCode.should.be.equal(400);
                done();
            });
        });
    });
    context('tests POST', () => {
        context('When exists POST/file', () => {
            beforeEach(done => {
                fsE.copySync(config.fixturePath + '/small.jpg', config.filePath + '/small.jpg');
                done();
            });
            context('When small file size', () => {
                it('return 409 file exists POST/file', done => {
                    const mtime = fsE.statSync(config.filePath + '/small.jpg').mtime;
                    const req = request.post(host + '/small.jpg', (error, respons, body) => {
                        if (error) return done(error);
                       const newMtime = fsE.statSync(config.filePath + '/small.jpg').mtime;
                       mtime.should.be.eql(newMtime);
                       respons.statusCode.should.be.equal(409);
                       done();
                    });
                    fsE.createReadStream(config.fixturePath + '/small.jpg').pipe(req);
                });
            });
            context('When zero file size', () => {
                it('return 409 file exists POST/file', done => {
                    const req = request.post(host + '/small.jpg', (error, response, body) => {
                        if (error) return done(error);

                        response.statusCode.should.be.equal(409);
                        done();
                    });
                    // emulate zero file
                    const stream = new Readable();
                    stream.pipe(req);
                    stream.push(null);
                });
            });
        });
        context('When file to big POST/file', () => {
           it('should return 413 & no file appears', done => {
               const req = request.post(host + '/big.png', (error, response, body) => {
                   if (error) return done(error);
                   response.statusCode.should.be.equal(413);
                   fsE.existsSync(config.filePath + '/big.png').should.be.false();
                   done();
               });
               fsE.createReadStream(config.fixturePath + '/big.png').pipe(req);
           });
        });
        context('When upload a new file POST/file', () => {
           it('should return 200 & upload a new file', done => {
              const req = request.post(host + '/small.jpg', (error, response, body) => {
                  if (error) return done(error);
                  fsE.readFileSync(config.filePath + '/small.jpg').equals(
                      fsE.readFileSync(config.fixturePath + '/small.jpg')).should.be.true();
                  response.statusCode.should.be.equal(200);
                  done();
              });
              fsE.createReadStream(config.fixturePath + '/small.jpg').pipe(req);
           });
        });
        context('When upload a new file zero size POST/file', () => {
            it('should return 200 & upload a new file', done => {
                const req = request.post(host + '/small.jpg', (error, response, body) => {
                    if (error) return done(error);
                    response.statusCode.should.be.equal(200);
                    fsE.statSync(config.filePath + '/small.jpg').size.should.be.equal(0);
                    done();
                });

                //emulate zero file
                const stream = new Readable();
                stream.pipe(req);
                stream.push(null);
            });
        });
    });
    context('tests DELETE', () => {
        context('When exists DELETE/file', () => {
            beforeEach(done => {
               fsE.copySync(config.fixturePath + '/small.jpg', config.filePath + '/small.jpg');
               done();
            });
            it('return statusCode 200 & response "OK"', done => {
                request.delete(host + '/small.jpg', (error, response, body) => {
                    if (error) return done(error);
                    response.statusCode.should.be.equal(200);
                    response.body.toString().should.be.equal('OK');
                    done();
                });
            });
        });
        context('File not found DELETE/file', () => {
            it('should return 404', done => {
                request.delete(host + '/small.jpg', (error, response, body) => {
                    if (error) return done(error);
                    response.statusCode.should.be.equal(404);
                    done();
                })
            });
        });
    });
});
