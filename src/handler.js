const {AuthLambdaFunction} = require('../lib');
const AWS = require('aws-sdk');

exports.handler = function(params = {}) {
    return function(event,context,callback) {
      if (typeof params.invoke === 'function') {
          const addlParams = params.invoke(event,context,callback,params, AWS, AuthLambdaFunction);
          if (addlParams) {
            if (typeof addlParams.then === 'function') {
              addlParams.then(addl => {
                if (typeof addl === 'object') params = {
                  ...params,
                  ...addl
                }
              });
              return AuthLambdaFunction.init(event, callback, params);
            }
            if (typeof addlParams === 'object') params = {
              ...params,
              ...addlParams
            }
          }
      }
      return AuthLambdaFunction.init(event, callback, params);
    }
  }