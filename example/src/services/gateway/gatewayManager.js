import axios from "axios";
import aws4 from "aws4";
import Url from "url-parse";

export default class GatewayManager {
  constructor() {
    // Make this a singleton
    if(!GatewayManager.instance){
      this.init();
      this.apiGateway = (this.apiConfig && this.apiConfig.api) ? new Url(this.apiConfig.api) : '';
      this.region = (this.apiConfig && this.apiConfig.region) ? this.apiConfig.region : 'us-west-2';
      this.service = 'execute-api';
      GatewayManager.instance = this;
    }
    return GatewayManager.instance;
  }

  /**
   * 1. Lambda at Edge initially will send cookies to populate class props.
   * 2. Cookies are set to expire when the tokens do so if the cookie(s) no longer exists then we need to do a refresh
   */
  async init() {
      this.apiConfig = (GatewayManager._getCookie('WebIdentityParams')) ? JSON.parse(GatewayManager._getCookie('WebIdentityParams')) : ''; // API Gateway Location Info
      if(GatewayManager._getCookie('Credentials')) {
        this.awsCredentials = JSON.parse(GatewayManager._getCookie('Credentials')) || ''; // AWS Credentials
      } else { 
        await this.refresh().catch(err => {
          alert(err);
        }); // missing cookies; need to refresh
      }
  }
  
  async hasCredsExpired() {
    // Cookie is set to expire when the credentials do so if the cookie no longer exists then we need to do a refresh
    // Should be a short-lived cookie ~15 min
    if(!GatewayManager._getCookie('Credentials')){
      return await this.refresh().catch(err => {
        alert(err);
      });
    }
  }

  refresh() {
    // Call refresh endpoint to get updated credential cookies
    return new Promise((resolve, reject) => {  
      fetch(`${document.location.protocol}//${document.location.host}`, { 
        method: 'POST',
        redirect: "manual" 
      }).then(() => {
        this.awsCredentials = (GatewayManager._getCookie('Credentials')) ? JSON.parse(GatewayManager._getCookie('Credentials')) : ''; // AWS Credentials
        resolve(true);
      }).catch(err => {
        reject(err);
      });
    });
  }

  /**
   * 
   * @param {object} originalRequest original request object
   * @returns Signed (Signature Version 4) request
   */
  sign(originalRequest) {
    try {  
      this.hasCredsExpired(); // Check/update AWS credentials before we sign the request with them.
      const headers = (originalRequest.data === undefined) ? {} : {"Content-Type": "application/x-amz-json-1.0"};
      const requestTobeSigned = {
          host: this.apiGateway.host,
          path: `${this.apiGateway.pathname}${originalRequest.path || ""}`,
          method: originalRequest.method || "GET",
          headers: Object.assign(
              headers,
              originalRequest.headers
          ),
          region: this.region,
          service: this.service,
          body: JSON.stringify(originalRequest.data)
      };

      const signedRequest = aws4.sign(requestTobeSigned, {
        accessKeyId: this.awsCredentials.AccessKeyId,
        secretAccessKey: this.awsCredentials.SecretKey,
        sessionToken: this.awsCredentials.SessionToken
      });
      return signedRequest;
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  /**
   * 
   * @param {*} signedRequestParameter 
   * @returns 
   */
  fetchAPI(signedRequestParameter) {
    const signedRequest = Object.assign({}, signedRequestParameter);
    delete signedRequest.headers.Host;
    delete signedRequest.headers.host;
    delete signedRequest.headers["Content-Length"];
    signedRequest.url = `https://${signedRequest.host}${signedRequest.path}`;
    signedRequest.data = signedRequest.body;
    return axios(signedRequest);
  }

  async invokeApiGateway(request) {
    return await this.fetchAPI(this.sign(request));
  }

  static _getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    return undefined;
  }

}