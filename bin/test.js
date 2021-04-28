#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const {AuthLambda} = require('../src');

function handleError(err) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
}

module.exports = function test(params = {}) {
    const base = path.join(__dirname,'..');
    const testPath = path.join(base,'test');
    const targetRoot = base;
    const targetPath = 'test/test_lambda';
    fs.emptyDir(testPath, (err) => {
        if (err) handleError(err);
        AuthLambda.promise({...params,targetRoot,targetPath}).then(() => {
            assert(params && typeof params === 'object', 'Invalid params passed');
            assert(fs.existsSync(path.join(targetPath, 'lib'), 'Source directory does not exist'));
            assert(fs.existsSync(path.join(targetPath, 'index.js'), 'Handler does not exist'));

        // TODO - add more tests

        }).catch(handleError);
    });
}
