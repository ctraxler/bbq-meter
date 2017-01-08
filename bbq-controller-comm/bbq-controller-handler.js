// Node depends
const events = require('events');
const inherits = require('util').inherits;

// App depends
var BleUart = require('./ble-uart');

function processControllerMessages(){ 

      if (!(this instanceof processControllerMessages)) {
         return new processControllerMessages();
      }

  // use a predefined UART service (nordic, redbear, laird, bluegiga)
  var bleSerial = new BleUart('nordic');

  var stringData = '';
  var jsonString = '';
  var openBraceCount = 0; 

  events.EventEmitter.call(this);

  that = this; 

  // optionally define a custom service
  // var uart = {
  //   serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  //   txUUID: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  //   rxUUID: '6e400003-b5a3-f393-e0a9-e50e24dcca9e'
  // }
  // var bleSerial = new BleUart('foo', uart);

  // provide a send data function
  this.send = function (jsonData) {
    bleSerial.write(JSON.stringify(jsonData));
  }

  // expose a disconnect function
  this.disconnect = function(){


  }

  // this function gets called when new data is received from
  // the Bluetooth LE serial service:
  bleSerial.on('data', function(data){
    
    console.log("Received new data from controller: " + String(data));
    stringData = String(data); 
    jsonString = jsonString + stringData;

    // tests to see how many more open braces to closed braces we have received. Does not take into account escaped braces in this case
    openBraceCount += (stringData.match(/{/g) || []).length - (stringData.match(/}/g) || []).length;

    // if we have closed all of the braces, we are at the end of the JSON.
    if ( openBraceCount === 0 ) {
      console.log("Controller jsonString: " + jsonString);
      jsonObj = JSON.parse(jsonString);
      jsonString = '';
      that.emit('stateUpdate', jsonObj);
    }
  });

  // this function gets called when the program
  // establishes a connection with the remote BLE radio:
  bleSerial.on('connected', function(data){
    console.log("Connected to BLE. Waiting for a message...");
  });

  // thus function gets called if the radio successfully starts scanning:
  bleSerial.on('scanning', function(status){
    console.log("radio status: " + status);
  })

}

//
// Allow instances to listen in on events that we produce for them
//
inherits(processControllerMessages, events.EventEmitter);

module.exports = processControllerMessages;
