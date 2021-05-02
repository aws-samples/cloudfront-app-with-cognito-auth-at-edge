const path = require('path');
const fs = require('fs-extra');
const {handler} = require('./handler');
const {getFileParams} = require('./params');
const util = require('util');
const {
    encode,
    decode,
    getCookie,
    parseCookie,
    createKeyPair,
    decodeToken,
    formatCookie
} = require('../lib/util')
exports.AuthLambda = class AuthLambda {
    constructor(params = {}) {
        const root = params.targetRoot || process.cwd();
        this.target = path.join(root, params.targetPath || 'build/auth_lambda');
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
                const msg = $this.target.includes('test_lambda') ? 
                'Test Successful' : 
                `Edge Lambda Build Successful with Asset Path "${$this.target}"`;
                console.log(msg);
                if (typeof callback === 'function') {
                    callback.call($this, $this.target, `index.${this.handler}`);
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
            fs.remove($this.targetPath, err => {
                if (err) throw new Error(err);
                console.log('Edge Lambda Build Successful');
            });
        }).catch(e => {throw new Error(e)});
        return this;
    }

    async copy() {
        const dest = path.join(this.target,'lib');
        await fs.ensureDir(dest);
        return await fs.copy(this.source, dest, {
            overwrite: true,
            dereference: true,
        });
    }

    async handle() {
        const dest = path.join(this.target,'index.js');
        return await fs.outputFile(dest,this.function,'utf8');
    }

    get function() {
        const params = {...this.params};
        if (params.invoke) params.invoke = params.invoke.toString();
        return `const {AuthLambdaEdge} = require('./lib')\nconst AWS = require('aws-sdk');\nlet params = ${util.inspect(params)}\n\nexports.${this.handler} = ${handler(this.params).toString()}     
        `
    }

    static encode(str, to = 'base64') {
        return encode(str,to);
    }

    static decode(str, from = 'base64') {
        return decode(str, from);
    }

    static getCookie(key,cookie) {
        return getCookie(key,cookie);
    }

    static parseCookie(str) {
        return parseCookie(str);
    }

    static formatCookie(name,val,options = {}) {
        return formatCookie(name,val,options);
    }
    static createKeyPair() {
        return createKeyPair();
    }

    static JwtDecode(token) {
        return decodeToken(token);
    }
}

