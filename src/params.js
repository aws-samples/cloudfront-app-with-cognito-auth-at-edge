const fs = require('fs');
const path = require('path');
const dir = process.cwd();

exports.parseArgs = function(params = []) {
    let currentFlag = null;
    const res = {args:[]}
    if (!params || !params.length) return res;
    params.forEach(param => {
        if (/^\-+/.test(param)) {
            if (currentFlag) {
                res[currentFlag] = true;
            }
            currentFlag = param.replace(/^\-+/,'');
        } else {
            if (currentFlag) {
                res[currentFlag] = param;
                currentFlag = null;
            } else {
                res.args.push(param);
            }
        }
    });
    if (currentFlag) res[currentFlag] = true;
    return res;
}

exports.parseArgNames = function(params, argNames) {
    if (!params || typeof params !== 'object' || Array.isArray(params)) return {};
    const res = {};
    for (let key in params) {
        if (params.hasOwnProperty(key)) {
            const param = params[key];
            if (key.includes('-')) key = key.replace(/\-(\w)/g, (match, capture) => capture.toUpperCase());
            if (/^[A-Z]/.test(key)) key = key.substring(0,1).toLowerCase() + key.substring(1);
            const newKey = argNames.find(a => a == key);
            if (newKey) res[newKey] = param;
        }
    }
    res.args = params.args;
    return res;
}

exports.getFlags = function(params,argNames) {
    const args = exports.parseArgs(params);
    return exports.parseArgNames(args,argNames);
}

exports.getFileParams = function() {
    const fileParams = ['lambda.auth.json', 'lambda.auth.js'].find(a => fs.existsSync(path.join(dir,a)));
    let params = {};
    if (fileParams) {
        params = require(path.join(dir, fileParams));
    }
    return params;
}