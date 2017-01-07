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

/* 	
*	Where the magic happens
*/

function handleStateChangeRequest (thingName, deltaObject) {
	console.log('Delta Values for ' + thingName + ' ' + JSON.stringify(deltaObject));
}

function publishControllerReportedState(jsonControllerState) {

	var jsonIOTState = { 
			bbq: jsonControllerState.bbq,
		    upper_level: jsonControllerState.ul,
		    lower_level: jsonControllerState.ll,
		    fan: jsonControllerState.fl,
		    upper_alarm: 320,
		    lower_alarm: 150,
		    fan_target: 40,
		    bbq_mode: "auto"}


	myThingShadowHandler.updateState(jsonIOTState)

}

function handleExit(){
	console.log('');
	console.log('Disconnecting any connections and existing...');
	myBbqContollerComm.disconnect();
	console.log('Exiting now...');
	process.exit();
}

// Catch CTL+C 
process.on('SIGINT', handleExit());

console.log(JSON.stringify(args)+ '\n'); 

const myThingShadowHandler = thingShadowHandler(args); 
const myBbqControllerComm = bbqControllerComm();

console.log(JSON.stringify(Object.getOwnPropertyNames(thingShadowHandler)));

console.log(JSON.stringify(thingShadowHandler));

myThingShadowHandler.on('delta', function (thingName, deltaObject) {
	handleStateChangeRequest(thingName, deltaObject); 
})

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
