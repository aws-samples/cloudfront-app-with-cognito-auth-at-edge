const path = require('path');
const fs = require('fs-extra');
const {handler} = require('./handler');
const {getFileParams} = require('./params');
const util = require('util');

exports.AuthLambda = class AuthLambda {
    constructor(params = {}) {
        this.dest = path.join(process.cwd(), params.targetPath || 'build/auth_lambda');
        this.source = path.join(__dirname, '../lib');
        this.handler = params.handler || 'handler';
        const defaultParams = getFileParams();
        this.params = {...defaultParams, ...params};
    }

    static make(params, callback, onError) {
        const $this = new AuthLambda(params);
        $this.make(callback, onError);
        return $this;
    }

    static promise(params) {
        const $this = new AuthLambda(params);
        return $this.promise();
    }

    static dryRun(params) {
        const $this = new AuthLambda(params);
        return $this.dryRun();
    }

    make(callback, onError) {
        const $this = this;
        onError = typeof onError === 'function' ? onError : 
        (e) => {
            throw new Error(e);
        }
        this.copy().then(() => {
            $this.handle().then(() => {
                const msg = $this.dest.includes('test_lambda') ? 
                'Test Successful' : 
                `Edge Lambda Build Successful with Asset Path "${$this.dest}"`;
                console.log(msg);
                if (typeof callback === 'function') {
                    callback.call($this, $this.dest, `index.${this.handler}`);
                }
            }).catch(onError)
        }).catch(onError);
        return this;
    }

    promise() {
        const $this = this;
        return new Promise((resolve,reject) => {
           $this.make(resolve,reject);
        });
    }

    dryRun() {
        const $this = this;
        this.promise().then(() => {
            fs.remove($this.destPath, err => {
                if (err) throw new Error(err);
                console.log('Edge Lambda Build Successful');
            });
        }).catch(e => {throw new Error(e)});
        return this;
    }

    async copy() {
        const dest = path.join(this.dest,'lib');
        await fs.ensureDir(dest);
        return await fs.copy(this.source, dest, {
            overwrite: true,
            dereference: true,
        });
    }

    async handle() {
        const dest = path.join(this.dest,'index.js');
        return await fs.outputFile(dest,this.function,'utf8');
    }

    get function() {
        return `const {AuthLambdaFunction} = require('./lib')\nconst AWS = require('aws-sdk');\nlet params = ${util.inspect(this.params)}\n\nexports.${this.handler} = ${handler(this.params).toString()}     
        `
    }

}