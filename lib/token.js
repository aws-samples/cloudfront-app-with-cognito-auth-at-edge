const {prefixUrl, display, getNonce, decodeToken} = require('./util');
exports.Token = class {   
   constructor(params) {
      this.reset();
      this.url = prefixUrl(params.url);
      this.provider = prefixUrl(params.provider);
      this.redirectPath = params.redirectPath || '';
   }

   get isValid() {
      return this.validate();
   }

   get isExpired() {
      if (!this.expires) return true;
      return this.expires <= Date.now();
   }

   validate(token) {
      let decoded;
      if (token) decoded = this.set(token);
      if (!decoded) return false;
      this.errors = [];
      if (this.isExpired) this.setError('TOKEN EXPIRED', {token});
      const nonce = getNonce(this.url);
      const mismatchedNonce = !nonce || nonce != this.payload.nonce;
      if (mismatchedNonce) this.setError('NONCE MISMATCH',{
         given: this.payload.nonce,
         actual: nonce
      });
      const mismatchedAud = !this.url || this.url != this.payload.aud;
      if (mismatchedAud) this.setError('AUD MISMATCH', {
         given: this.payload.aud,
         actual: this.url
      });
      const mismatchedIss = !this.provider || this.provider != this.payload.iss;
      if (mismatchedIss) this.setError('ISS MISMATCH', {
         given: this.payload.iss,
         actual: this.provider
      });
      const isValid = this.errors.length ? false : true;
      return isValid;
   }

   getRedirectParams() {
      const nonce = getNonce(this.url);
      const home = encodeURIComponent(prefixUrl(this.url));
      return {
          redirect_uri: home + this.redirectPath,
          client_id: home,
          nonce,
          scope: 'openid',
          response_type: 'id_token',
          response_mode: 'query'
      }
   }

   formatRedirectParams() {
      const params = this.getRedirectParams();
      return Object.entries(params)
        .map(([key, val]) => `${key}=${val}`)
        .join("&");
   }

    setError(str, compObj) {
       this.errors.push(str);
       display(str, compObj);
       return this;
    }

    reset() {
      this.user = '';
      this.signature = '';
      this.expires = NaN;
      this.header = {};
      this.payload = {};
      this.errors = [];
      this.raw = '';
      return this;
    }

    set(token) {
      this.raw = token;
      this.errors = [];
      let details;
      try {
         details = decodeToken(this.raw);
      } catch (e) { 
         console.log('JWS Decode Fail', e);
         return false; 
      }      
      if (details && typeof details === 'object') {
         this.header = details.header;
         this.signature = details.signature;
         if (details.payload && typeof details.payload === 'object') {
            this.payload = details.payload;
            this.user = this.payload.sub;
            const exp = Number(this.payload.exp);
            if (!isNaN(exp)) {
               this.expires = exp < 946728000000 ? exp*1000 : exp;
            }
         }
      }
      return this;
    }
}