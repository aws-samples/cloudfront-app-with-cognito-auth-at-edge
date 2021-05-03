const crypto = require('crypto');
exports.prefixUrl = function(url) {
    return 'https://' + String(url).replace(/https?\:\/\//, '');
}
    
exports.baseUrl = function(url) {
    return String(url).replace(/https?\:\/\//, '');
}

exports.setHeader = function(key, value)  {
  return [{key,value}];
}

exports.getHeader = function(key, request= {}) {
  const headers = request.headers;
  if (headers) {
    const header = headers[key];
    if (key && key.length) return header[0].value;
  }
  return '';
}

exports.getNonce = function(clientId) {
  return crypto.createHash('sha256').update(clientId).digest('hex');
}

exports.encode = function(str, to = 'base64') {
  const st = Buffer.from(str, 'utf8');
  return st.toString(to);
}

exports.decode = function(str, from = 'base64') {
  const st = Buffer.from(str, from);
  return st.toString('utf-8');
}

exports.display = function(name = 'DATA', obj = '') {
  if (obj && typeof obj === 'object') obj = JSON.stringify(obj, null, '\t');
  console.log(name.toUpperCase(), obj);
}

function handleCookie(pair) {
  if (pair) {
    const arr = pair.split('=');
    if (arr.length < 2) return null;
    const val = arr[1].trim();
    const res = decodeURIComponent(val);
    try {
      return JSON.parse(res);
    } catch(e) {
      return res;
    }
  }
  return null;
}

exports.getCookie = function(key, cookie) {
  if (typeof cookie !== 'string') return null;
  const pair = cookie.split(/; */).find(a => a.includes(`${key}=`));
  return handleCookie(pair);
}

exports.parseCookie = function(str) {
  if (typeof str !== 'string') return {};
  const pairs = str.split(/; */);
  const obj = {};
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    const key = pair.split('=')[0].trim();
    obj[key] = handleCookie(pair);
  }
  return obj;
}

exports.getQueryParam = function(key, query) {
  if (typeof query === 'string') {
    query = (query || '').split('&');
  }
  let res;
  const param = query.find(a => {
    const vals = a.split('=');
    const valkey = vals.shift();
    if (valkey === key) {
      res = vals.join('=');
    }
    return false;
  });
  return res;
}

exports.parseQueryParams = function(query) {
  if (typeof query === 'string') {
      query = (query || '').split('&');
  }
  return query.reduce((acc,par) => {
    const vals = par.split('=');
    const valkey = vals.shift();
    acc[valkey] = vals.join('=');
    return acc;
  },{})
}

exports.createKeyPair = function createKeyPair(options = {}) {
  const opt = {
    type:'rsa',
    format: 'pem',
    length: 2048,
    publicKeyType: 'spki',
    privateKeyType: 'pkcs8',
    ...options
  }

  if ((opt.publicKeyType === 'pkcs1' || opt.privateKeyType === 'pkcs1') && opt.type !== 'rsa') {
    throw new Error('Key Type of "pkcs1" is only allowed with rsa keys');
  }
  if (opt.privateKeyType === 'sec1' && opt.type !== 'ec') {
    throw new Error('Private Key Type of "sec1" is only allowed with ec keys');
  }
  const publicKeyEncoding = {
    type: opt.publicKeyType,
    format: opt.format
  }
  const privateKeyEncoding = {
    type: opt.privateKeyType,
    format: opt.format
  }
  if (opt.cipher) privateKeyEncoding.cipher = opt.cipher;
  if (opt.passphrase) privateKeyEncoding.passphrase = opt.passphrase;

  return crypto.generateKeyPairSync(opt.type, {
      modulusLength: opt.length,
      publicKeyEncoding,
      privateKeyEncoding
  });
}

exports.decodeToken = function(token) {
  const str = token && typeof token === 'object' ? JSON.stringify(token) : token.toString();
  const encodedHeader = str.split('.', 1)[0];
  const header = Buffer.from(encodedHeader, 'base64').toString('binary');
  if (!header) return null;
  const regex = /^[a-z0-9\-\_]+?\.[a-z0-9\-\_]+?\.[a-z0-9\-\_]+?$/i;
  if (!regex.test(str)) return null;
  const arr = str.split('.');
  const payload = JSON.parse(exports.decode(arr[1]));
  return { header, payload, signature:arr[2]}
}

function formatDate(exp, name = '') {
  if (exp && !(exp instanceof Date)) {
    if (typeof exp === 'number' && exp < 946728000000) exp *= 1000;
    exp = new Date(exp);
    if (/invalid date/i.test(exp.toString())) {
      exp = Number(exp);
      if (isNaN(exp)) {
        exp = null;
        console.error(`Date of cookie ${name} is invalid`);
      } else {
        if (exp < 946728000000) exp *= 1000;
        exp = new Date(exp);
        if (/invalid date/i.test(exp.toString())) {
          console.error(`Date of cookie ${name} is invalid`);
        }
      }
    }
  }
  return exp;
}

exports.formatCookie = function(name, val, options = {}) {
  if (val && typeof val === 'object') val = JSON.stringify(val);
  if (options.expires && typeof options.expires !== 'object') {
      options.expires = Number(options.expires);
      if (isNaN(options.expires)) delete options.expires;
      options.expires = new Date(options.expires);
  }
  const opt = {
    path:'/',
    secure:true,
    httpOnly:false,
    ...options
  }
  const regex = /[\;\,\s]/;
  const msg = 'cannot contain semicolons, colons, or spaces'
  const value = encodeURIComponent(val);

  if (regex.test(name) || regex.test(value)) {
    throw new Error('Cookie strings ' + msg);
  }
  name += '=' + value;

  if (opt.domain) {
    if (!regex.test(opt.domain)) {
      name += '; Domain=' + opt.domain;
    } else { console.error(`Domain "${opt.domain}" ${msg}`) }
  }

  if (opt.path) {
    if (!regex.test(opt.path)) {
        name += '; Path=' + opt.path;
    } else {console.error(`Path ${opt.path} ${msg}`)}
  }

  let exp = formatDate(opt.expires || opt.maxAge, name);
  if (exp) {
    const time = exp.getTime();
    if (time <= Date.now()) {
      console.error(`Cookie ${name} is expired`);
    }
    if (opt.maxAge) {
        name += '; Max-Age=' + Math.floor(time/1000);
    } else {
        name += '; Expires=' + exp.toUTCString();
    }
  }
  if (opt.sameSite) {
    const ss = opt.sameSite;
    name += '; SameSite=';
    const sameSite = /(strict|lax|none)/i.test(ss) ?
      (ss.substring(0,1).toUpperCase() + ss.substring(1).toLowerCase()) : 
      opt.sameSite ? 'Strict' : 'Lax';
    name += sameSite;
  }
  if (opt.httpOnly) name += '; HttpOnly';
  if (opt.secure) name += '; Secure';

  return name;
}
exports.decodeToken = function(token) {
  const str = token && typeof token === 'object' ? JSON.stringify(token) : token.toString();
  const encodedHeader = str.split('.', 1)[0];
  const header = Buffer.from(encodedHeader, 'base64').toString('binary');
  if (!header) return null;
  const regex = /^[a-z0-9\-\_]+?\.[a-z0-9\-\_]+?\.[a-z0-9\-\_]+?$/i;
  if (!regex.test(str)) return null;
  const arr = str.split('.');
  const payload = JSON.parse(exports.decode(arr[1]));
  return { header, payload, signature:arr[2]}
}

function formatDate(exp, name = '') {
  if (exp && !(exp instanceof Date)) {
    if (typeof exp === 'number' && exp < 946728000000) exp *= 1000;
    exp = new Date(exp);
    if (/invalid date/i.test(exp.toString())) {
      exp = Number(exp);
      if (isNaN(exp)) {
        exp = null;
        console.error(`Date of cookie ${name} is invalid`);
      } else {
        if (exp < 946728000000) exp *= 1000;
        exp = new Date(exp);
        if (/invalid date/i.test(exp.toString())) {
          console.error(`Date of cookie ${name} is invalid`);
        }
      }
    }
  }
  return exp;
}

exports.formatCookie = function(name, val, options = {}) {
  if (val && typeof val === 'object') val = JSON.stringify(val);
  if (options.expires && typeof options.expires !== 'object') {
      options.expires = Number(options.expires);
      if (isNaN(options.expires)) delete options.expires;
      options.expires = new Date(options.expires);
  }
  const opt = {
    path:'/',
    secure:true,
    httpOnly:false,
    ...options
  }
  const regex = /[\;\,\s]/;
  const msg = 'cannot contain semicolons, colons, or spaces'
  const value = encodeURIComponent(val);

  if (regex.test(name) || regex.test(value)) {
    throw new Error('Cookie strings ' + msg);
  }
  name += '=' + value;

  if (opt.domain) {
    if (!regex.test(opt.domain)) {
      name += '; Domain=' + opt.domain;
    } else { console.error(`Domain "${opt.domain}" ${msg}`) }
  }

  if (opt.path) {
    if (!regex.test(opt.path)) {
        name += '; Path=' + opt.path;
    } else {console.error(`Path ${opt.path} ${msg}`)}
  }

  let exp = formatDate(opt.expires || opt.maxAge, name);
  if (exp) {
    const time = exp.getTime();
    if (time <= Date.now()) {
      console.error(`Cookie ${name} is expired`);
    }
    if (opt.maxAge) {
        name += '; Max-Age=' + Math.floor(time/1000);
    } else {
        name += '; Expires=' + exp.toUTCString();
    }
  }
  if (opt.sameSite) {
    const ss = opt.sameSite;
    name += '; SameSite=';
    const sameSite = /(strict|lax|none)/i.test(ss) ?
      (ss.substring(0,1).toUpperCase() + ss.substring(1).toLowerCase()) : 
      opt.sameSite ? 'Strict' : 'Lax';
    name += sameSite;
  }
  if (opt.httpOnly) name += '; HttpOnly';
  if (opt.secure) name += '; Secure';

  return name;
}