/*
 * Copyright 2017 Craig Traxler. or its affiliates. All Rights Reserved.
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

//npm deps

//app deps
const thingShadowHandler = require('..').bbqShadowHandler;
const bbqControllerComm = require('..').bbqControllerCommHandler; 
const cmdLineProcess = require('./lib/cmdline');
const isUndefined = require('../common/lib/is-undefined');


//begin module

/*
*	Provide a gateway between the AWS iot cloud shadow for the bbq controller and the 
*	Arduino Communictations adapter
*/

function main(args) {

	var xlateTable = {
		upper_alarm: 'ua',
		lower_alarm: 'la',
		fan_target: 'ft',
		bbq_mode: 'bbqm'
	}

	function translateKey (sourceKey) {
		return xlateTable[sourceKey];
	}


	function handleStateChangeRequest (thingName, deltaObject) {
		console.log('Delta Values for ' + thingName + ' ' + JSON.stringify(deltaObject));

		var jsonStateCR = {};
		var controllerKey = null;

		for (var key in deltaObject) {
			console.log('Parsing key ' + key);
		  	if (deltaObject.hasOwnProperty(key)) {
			  	// translate the state labels
			  	controllerKey = translateKey(key);
			  	console.log('controllerKey ' + controllerKey);
			  	// if there is a translation add it to be sent to the controller
  				if (!isUndefined(controllerKey)) {
  					jsonStateCR[controllerKey] = deltaObject[key];
  				}
			}
		}

		// if the CR is not empty, so we found something to send in the source
		if (!(Object.keys(jsonStateCR).length === 0)) {
			//send the CR to the controller	
			console.log('Sending to controller ' + JSON.stringify(jsonStateCR));
			myBbqControllerComm.send(jsonStateCR);
		} 
	}

	function publishControllerReportedState(jsonControllerState) {
		var jsonIOTState = { 
				bbq: jsonControllerState.bbq,
			    upper_level: jsonControllerState.ul,
			    lower_level: jsonControllerState.ll,
			    fan: jsonControllerState.fl,
			    upper_alarm: jsonControllerState.ua,
			    lower_alarm: jsonControllerState.la,
			    fan_target: jsonControllerState.ft,
			    bbq_mode: jsonControllerState.bbqm}

		myThingShadowHandler.updateState(jsonIOTState)
	}

	// Create the objects that will manage the IOT cloud connection and the connection to the Arduino
	const myThingShadowHandler = thingShadowHandler(args); 
	const myBbqControllerComm = bbqControllerComm();

	function handleExit(){
		console.log('');
		console.log('Disconnecting any connections and existing...');
		myBbqControllerComm.disconnect();
		console.log('Exiting now...');
		process.exit();
	}

	// Catch CTL+C 
	process.on('SIGINT', handleExit);

	// process delta's coming from from the IOT cloud. 
	myThingShadowHandler.on('delta', function (thingName, deltaObject) {
		handleStateChangeRequest(thingName, deltaObject); 
	})


	// publish state updates from the controller to the IOT cloud
	myBbqControllerComm.on('stateUpdate', function(jsonState) {
		publishControllerReportedState(jsonState); 	
	})

	myThingShadowHandler.deviceConnect();

}


module.exports = cmdLineProcess;

if (require.main === module) {
   cmdLineProcess('connect to the AWS IoT service and demonstrate thing shadow APIs, test modes 1-2',
      process.argv.slice(2), main);
}
