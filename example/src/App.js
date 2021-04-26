import React from 'react';
import './App.css';
import GatewayManager from './services/gateway/gatewayManager';
//import { helloWorld } from './services/api/sampleService';
export const gatewayManager = new GatewayManager();

function App() {

  function getCookie(cname) {
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


  return (
    <div className="App">
      <section className="App-container">
        <div className="code-block">
          <h2 className="Amazon-Orange">Description</h2>
          <blockquote>
            In this sample code we explore Lambda@Edge, using a third party identity provider 
            like Google Identity, to serve up our static content from our AWS Cloud Front distribution 
            once a user has authenticated.  From there we use Amazon Cognito to exchange the users 
            web identity for temporarily AWS credentials in order to call Amazon API Gateway to serve 
            up restful api data to our application.  
          </blockquote>
        </div>
        
        <div className="code-block">
        <h2 className="Amazon-Orange">Cookie details</h2>
      
        Web Identity Token:
          <pre>
            <code>
              {getCookie('WebIdentityToken')}
            </code>
            
          </pre>

          Temporary AWS Credentials:
          <pre>
            <code>
              {getCookie('Credentials')}
            </code>
            
          </pre> 

          Site Parameters:
          <pre>
            <code>
              {getCookie('WebIdentityParams')}
            </code>
            
          </pre> 
        </div>
      </section>
    </div>
  );
}

export default App ;
