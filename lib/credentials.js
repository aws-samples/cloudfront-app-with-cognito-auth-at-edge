const {CognitoIdentityCredentials} = require('aws-sdk');
const {baseUrl} = require('./util');

exports.Credentials = class {
    constructor(params, token = '') {
        this.params = params;
        this.$token = token;
        this.provider = baseUrl(this.params.provider);
        this.cognito = new CognitoIdentityCredentials({
            IdentityPoolId:this.params.identityPool,
            Logins: {
                [this.provider]: this.$token
            }
        });
    }

    get token() {
        return (this.cognito.params).Logins[this.provider]
    }

    set token(token) {
        (this.cognito.params).Logins[this.provider] = token;
        (this.cognito.params).WebIdentityToken = token;
    }

    isValid(creds) {
        const expires = this.getExpires(creds);
        if (!expires) return false;
        return expires > Date.now();
    }

    getExpires(credentials) {
        const creds = this.parseCredentials(credentials);
        if (!creds) return null;
        const exp = creds.Expiration;
        if (!exp) return null;
        const dt = new Date(exp);
        if (/invalid date/i.test(dt.toString())) {
            return null;
        }
        return dt.getTime();
    }

    get(onSuccess, onError) {
        const $this = this;
        this.cognito.get((err) => {
            if (err) {
                $this.onError(err,onError);
            }
            if ($this.cognito.needsRefresh()) {
                $this.refresh(onSuccess,onError);
            } else {
                if (typeof onSuccess === 'function') {
                    $this.onSuccess(onSuccess, onError);
                }
            }
        });
        return this;
    }

    refresh(onSuccess, onError) {
        const $this = this;
        this.cognito.refresh(err => {
            if (err) {
                $this.onError(err,onError);
            } else {
                if (typeof onSuccess === 'function') {
                    $this.onSuccess(onSuccess, onError);
                }
            }
        });
        return this;
    }

    setToken(token) {
        this.token = token;
        return this;
    }

    parseCredentials(creds) {
        if (typeof creds === 'string') {
            try {
                creds = JSON.parse(creds);
            } catch(e) {}
        }
        if (!creds || typeof creds !== 'object') return null;
        if (creds.Credentials) {
            this.identityId = creds.IdentityId;
            return creds.Credentials;
        } else if (creds.AccessKeyId) {
            return creds;
        }
        return null;
    }

    onSuccess(callback, onError) {
        const creds = this.parseCredentials(this.cognito.data);
        if (creds) {
            return callback.call(this, creds, this.identityId);
        } else {
            this.onError('Parsed Credentials Invalid', onError);
        }
    }

    onError(err, callback) {
        if (typeof callback === 'function') {
            callback.call(this,err)
        } else {
            throw new Error(err);
        }
    }
}