const {config} = require('aws-sdk');
const {Token} = require('./token');
const {Credentials} = require('./credentials');
const {
    prefixUrl,
    getCookie,
    getQueryParam,
    formatCookie,
    display,
    parseCookie,
    decodeToken
} = require ('./util');

exports.AuthLambdaEdge = class AuthLambdaEdge {
    constructor(event, callback, params) {
        params.region = params.identityPool.split(':')[0];
        config.sts = prefixUrl(`sts.${params.region}.amazonaws.com`);
        config.region = params.region;
        this.callback = callback;
        this.params = params;
        if (!this.params.provider) throw new Error('No Provider found.');
        if (!this.params.identityPool) throw new Error('No IdentityPool Id found.');
        if (!this.params.url) throw new Error('No Url found.');
        this.request = event.Records[0].cf.request;
        this.path = this.request.uri || '';
        this.token = new Token(params);
        this.credentials = new Credentials(params);
        display('REQUEST', this.request);
    }

    static init(event, callback, params) {
        const $this = new AuthLambdaEdge(event,callback,params);
        return $this.init();
    }

    init() {
        const creds = this.checkForCredentials();
        if (creds) {
            display('CREDENTIALS', creds);
            return this.send();
        }
        const token = this.checkForToken();
        if (token) {
            display('TOKEN', decodeToken(token));
            this.credentials.setToken(token);
            const $this = this;
            this.credentials.get(creds => {
                const headers = $this.getCookies(token, creds, $this.token.user);
                return $this.setCookies(headers);
            });
        } else {
            return this.redirect();
        }
    }

    send(status, body, headers) {
        if (!status) return this.callback(null,this.request);
        const res = {status};
        if (body) res.body = body;
        if (headers) res.headers = headers;
        return this.callback(null,res);
    }

    get cookieString() {
        const headers = this.request.headers;
        if (headers && headers.cookie) {
            const cookie = headers.cookie;
            if (cookie.length) return cookie[0].value;
        }
            return '';
    }

    get cookie() {
        const str = this.cookieString;
        if (str) return parseCookie(str);
        return {};
    }

    get dataCookie() {
        const data = this.params.data;
        if (!data) return null;
        for (const i in data) {
            if (data.hasOwnProperty(i) && data[i].startsWith('$')) {
                const v = data[i].substring(1);
                if (this.params[v]) {
                    data[i] = this.params[v];
                } else if (process.env[v]) {
                    data[i] = process.env[v];
                }
            }
        }
        return data;
    }
    checkForToken() {
        const t1 = getCookie('WebIdentityToken', this.cookieString);
        if (this.token.validate(t1)) return t1;
        const t2 = getQueryParam('id_token', this.request.querystring);
        if (this.token.validate(t2)) return t2;
        return false;
    }

    checkForCredentials() {
        const c1 = getCookie('Credentials', this.cookieString);
        if (this.credentials.isValid(c1)) return c1;
        return false;
    }

    redirect() {
        let url = prefixUrl(this.params.provider) + '/SSO/redirect?';
        url += this.token.formatRedirectParams();
        return this.send(307, '', {
            location: [{
                key:'Location',
                value: url
            }]
        })
    }

    setCookies(headers) {
        return this.send(307, '', headers);
    }

    getCookies(token, creds, user, additionalCookies = []) {
        const headers = { 
            location: [{
                key:'Location',
                value: prefixUrl(this.params.url) + this.path
            }]
        };

        headers["set-cookie"] = [{
            key:'Set-Cookie',
            value: formatCookie('Credentials', creds, {expires: new Date(this.credentials.getExpires(creds))})
        },
        {
            key: 'Set-Cookie',
            value: formatCookie('WebIdentityToken', token, {expires: new Date(this.token.expires), httpOnly:true})
        },
        ...additionalCookies
        ];
        if (user) headers["set-cookie"].push({
            key: 'Set-Cookie',
            value: formatCookie('x-forwarded-user', user, {httpOnly:true})
        });
        const data = this.dataCookie;
        if (data || user) {
            if (!data) data = {}
            if (user) data.user = user;
            headers["set-cookie"].push({
                key: 'Set-Cookie',
                value: formatCookie('WebIdentityParams', data)
            });
        }
        return headers
    }
}