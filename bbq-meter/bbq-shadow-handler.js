/*
 * Copyright 2010-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

//node.js deps
const events = require('events');
const inherits = require('util').inherits;

//npm deps

//app deps
const thingShadow = require('..').thingShadow;
const cmdLineProcess = require('./lib/cmdline');
const isUndefined = require('../common/lib/is-undefined');

//begin module

//
// Simulate the interaction of a mobile device and a remote thing via the
// AWS IoT service.  The remote thing will be a dimmable color lamp, where
// the individual RGB channels can be set to an intensity between 0 and 255.  
// One process will simulate each side, with testMode being used to distinguish 
// between the mobile app (1) and the remote thing (2).  The remote thing
// will update its state periodically using an 'update thing shadow' operation,
// and the mobile device will listen to delta events to receive the updated
// state information.
//


   function processThingShadow(args) {


      if (!(this instanceof processThingShadow)) {
         return new processThingShadow(args);
      }

    //  console.log("args for use in processTest[" + JSON.stringify(args) + "]");
      //
      // Instantiate the thing shadow class.
      //
      const thingShadows = thingShadow({
         keyPath: args.privateKey,
         certPath: args.clientCert,
         caPath: args.caCert,
         clientId: args.clientId,
         region: args.region,
         baseReconnectTimeMs: args.baseReconnectTimeMs,
         keepalive: args.keepAlive,
         protocol: args.Protocol,
         port: args.Port,
         host: args.Host,
         debug: args.Debug
      });

      // console.log("thingShadows initially" + JSON.stringify(thingShadows));

      //
      // Operation timeout in milliseconds
      //
      const operationTimeout = 10000;


      // commment out override of the device name
      const thingName = args.thingName;
//      const thingName = 'First-BBQ-Contoller';

      const relevantDeltas = ['upper_alarm', 'lower_alarm', 'fan_target', 'bbq_mode'];

      var currentTimeout = null;


      events.EventEmitter.call(this);


      that = this; 
      //
      // For convenience, use a stack to keep track of the current client 
      // token; in this example app, this should never reach a depth of more 
      // than a single element, but if your application uses multiple thing
      // shadows simultaneously, you'll need some data structure to correlate 
      // client tokens with their respective thing shadows.
      //
      var stack = [];

      function genericOperation(operation, state) {
         var clientToken = thingShadows[operation](thingName, state);

         console.log('Performing genericOperation...');
         console.log('Performing on thing [' + thingName.toString() + ']');
         console.log('Performing Operation ' + operation);
         console.log('Using state ' + state );
         console.log('Value of clientToken is ' + clientToken.toString());

         if (clientToken === null) {
            //
            // The thing shadow operation can't be performed because another one
            // is pending; if no other operation is pending, reschedule it after an 
            // interval which is greater than the thing shadow operation timeout.
            //
            if (currentTimeout !== null) {
               console.log('operation in progress, scheduling retry...');
               currentTimeout = setTimeout(
                  function() {
                     genericOperation(operation, state);
                  },
                  operationTimeout * 2);
            }
         } else {
            //
            // Save the client token so that we know when the operation completes.
            //
            stack.push(clientToken);
         }
      }

      function buildReportedState(key, value){

         var stateObj = { state: {
                              reported: {}
         }};
         stateObj.state.reported[key] = value; 
         return stateObj;
      }

      function generateStubReportedState() {
         var controllerValues = {
            bbq: 0,
            upper_level: 0,
            lower_level: 0,
            fan: 0
         };

         controllerValues.bbq = Math.floor(Math.random() * 400);
         controllerValues.upper_level = Math.floor(Math.random() * 200);
         controllerValues.lower_level = Math.floor(Math.random() * 200);
         controllerValues.fan = Math.floor(Math.random() * 20) * 5; 


         return {
            state: {
               reported: controllerValues
            }
         };
      }

      this.updateState = function(jsonReportedValues) {

         jsonState = {
            state: {
               reported: jsonReportedValues
            }
         }

         console.log("Reporting State " + jsonState); 

         genericOperation('update', jsonState);
      }


      this.deviceConnect = function () {
         thingShadows.register(thingName, {
               ignoreDeltas: false,
               operationTimeout: operationTimeout
            },
            function(err, failedTopics) {

               if (isUndefined(err) && isUndefined(failedTopics)) {
                  console.log("thingShadows after device connect " + JSON.stringify(thingShadows));
                  console.log('Device thing registered for thingName ' + thingName + '.');
               }
            });
      }

      function handleStatus(thingName, stat, clientToken, stateObject) {
         var expectedClientToken = stack.pop();

         if (expectedClientToken === clientToken) {
            console.log('got \'' + stat + '\' status on: ' + thingName);
         } else {
            console.log('(status) client token mismtach on: ' + thingName);
         }

         console.log('thing stateObject is ' + JSON.stringify(stateObject));

         /*
         *  Todo, see if we can correlate rejection status to an update we issued and manage the error
         */

      }

      function handleDelta(thingName, stateObject) {

         
         console.log('delta on: ' + thingName + " " + JSON.stringify(stateObject));

         //automatically report the update happened for items we know about
         if (stateObject.state === undefined) {

            // nothing to do
         } else {
            for (var key in stateObject.state) {
               if (stateObject.state.hasOwnProperty(key)) {
                  console.log("key is ", key);

                  /* 
                  *  for key values lower_alarm, upper_alarm, fan_target, bbq_mode emit the delta
                  */
                  if (relevantDeltas.indexOf(key) === -1) {
                     // do nothing, we are not interested in this event
                  } else {
                     deltaObject = {};
                     deltaObject[key] = stateObject.state[key]; 
                     console.log('emitting delta, ' + thingName + ' ' + JSON.stringify(deltaObject));
                     that.emit('delta', thingName, deltaObject);
                  }
            }
         }
      }  

      }

      function handleTimeout(thingName, clientToken) {
         var expectedClientToken = stack.pop();

         if (expectedClientToken === clientToken) {
            console.log('timeout on: ' + thingName);
         } else {
            console.log('(timeout) client token mismtach on: ' + thingName);
         }

         if (args.testMode === 2) {
//            genericOperation('update', generateStubReportedState());
         }
      }

      thingShadows.on('connect', function() {
         console.log('connected to AWS IoT');
      });

      thingShadows.on('close', function() {
         console.log('close');
         thingShadows.unregister(thingName);
      });

      thingShadows.on('reconnect', function() {
         console.log('reconnect');
//         genericOperation('update', generateStubReportedState());
      });

      thingShadows.on('offline', function() {
         //
         // If any timeout is currently pending, cancel it.
         //
         if (currentTimeout !== null) {
            clearTimeout(currentTimeout);
            currentTimeout = null;
         }
         //
         // If any operation is currently underway, cancel it.
         //
         while (stack.length) {
            stack.pop();
         }
         console.log('offline');
      });

      thingShadows.on('error', function(error) {
         console.log('error', error);
      });

      thingShadows.on('message', function(topic, payload) {
         console.log('message', topic, payload.toString());
      });

      thingShadows.on('status', function(thingName, stat, clientToken, stateObject) {
         handleStatus(thingName, stat, clientToken, stateObject);
      });

      thingShadows.on('delta', function(thingName, stateObject) {
         handleDelta(thingName, stateObject);
      });

      thingShadows.on('timeout', function(thingName, clientToken) {
         handleTimeout(thingName, clientToken);
      });


   }

//
// Allow instances to listen in on events that we produce for them
//
inherits(processThingShadow, events.EventEmitter);

module.exports = processThingShadow;


