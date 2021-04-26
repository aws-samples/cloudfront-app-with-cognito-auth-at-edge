#!/usr/bin/env node
const {AuthLambda} = require('../src');
const test = require('./test');
const {getFlags} = require('../src/params');
const [a,b, ...args] = process.argv;
const clArgs = getFlags(args, ['region', 'url', 'provider', 'api', 'identityPool', 'callback', 'handler', 'targetPath']);
const newArgs = [...clArgs.args || []];
delete clArgs.args;
switch(newArgs[0]) {
    case 'test': test(clArgs);
    break;
    case 'rebuild': AuthLambda.dryRun(clArgs);
    case 'dry':
    case 'dry-run':
    case 'dryRun':
    break;
    default:AuthLambda.make(clArgs);
    break;
}