#include <Time.h>
#include <TimeLib.h>

#include <Arduino.h>
#include <SPI.h>
#if not defined (_VARIANT_ARDUINO_DUE_X_) && not defined (_VARIANT_ARDUINO_ZERO_)
  #include <SoftwareSerial.h>
#endif

#include <Adafruit_BLE.h>
#include <Adafruit_BluefruitLE_SPI.h>
#include <Adafruit_BluefruitLE_UART.h>

#include "BluefruitConfig.h"
#include "ArduinoJson.h"


#define BLEMODE

/* 
 *  JSON Key strings
 */
 
#define BBQ "bbq"
#define UPPER_LEVEL "ul"
#define LOWER_LEVEL "ll"
#define FAN_LEVEL "fl"
#define BBQ_MODE "bbqm"
#define TIMESTAMP "ts"
#define AUTO "auto"
#define MANUAL "manual"


#define BBQ_PIN 0
#define UPPER_LEVEL_PIN 1
#define LOWER_LEVEL_PIN 2
#define FAN_LEVEL_PIN 3

#define JSON_BUFFER_SIZE 100
#define JSON_OUTPUT_BUFFER_SIZE 250


#define READ_JSON_BUF_SIZE 200

/*=========================================================================
    APPLICATION SETTINGS

    FACTORYRESET_ENABLE       Perform a factory reset when running this sketch
   
                              Enabling this will put your Bluefruit LE module
                              in a 'known good' state and clear any config
                              data set in previous sketches or projects, so
                              running this at least once is a good idea.
   
                              When deploying your project, however, you will
                              want to disable factory reset by setting this
                              value to 0.  If you are making changes to your
                              Bluefruit LE device via AT commands, and those
                              changes aren't persisting across resets, this
                              is the reason why.  Factory reset will erase
                              the non-volatile memory where config data is
                              stored, setting it back to factory default
                              values.
       
                              Some sketches that require you to bond to a
                              central device (HID mouse, keyboard, etc.)
                              won't work at all with this feature enabled
                              since the factory reset will clear all of the
                              bonding data stored on the chip, meaning the
                              central device won't be able to reconnect.
    MINIMUM_FIRMWARE_VERSION  Minimum firmware version to have some new features
    MODE_LED_BEHAVIOUR        LED activity, valid options are
                              "DISABLE" or "MODE" or "BLEUART" or
                              "HWUART"  or "SPI"  or "MANUAL"
    -----------------------------------------------------------------------*/
    #define FACTORYRESET_ENABLE         1
    #define MINIMUM_FIRMWARE_VERSION    "0.6.6"
    #define MODE_LED_BEHAVIOUR          "MODE"
/*=========================================================================*/

// Create the bluefruit object, either software serial...uncomment these lines
/*
SoftwareSerial bluefruitSS = SoftwareSerial(BLUEFRUIT_SWUART_TXD_PIN, BLUEFRUIT_SWUART_RXD_PIN);

Adafruit_BluefruitLE_UART ble(bluefruitSS, BLUEFRUIT_UART_MODE_PIN,
                      BLUEFRUIT_UART_CTS_PIN, BLUEFRUIT_UART_RTS_PIN);
*/

/* ...or hardware serial, which does not need the RTS/CTS pins. Uncomment this line */
// Adafruit_BluefruitLE_UART ble(Serial1, BLUEFRUIT_UART_MODE_PIN);

/* ...hardware SPI, using SCK/MOSI/MISO hardware SPI pins and then user selected CS/IRQ/RST */
#ifdef BLEMODE
Adafruit_BluefruitLE_SPI ble(BLUEFRUIT_SPI_CS, BLUEFRUIT_SPI_IRQ, BLUEFRUIT_SPI_RST);
#endif

/* ...software SPI, using SCK/MOSI/MISO user-defined SPI pins and then user selected CS/IRQ/RST */
//Adafruit_BluefruitLE_SPI ble(BLUEFRUIT_SPI_SCK, BLUEFRUIT_SPI_MISO,
//                             BLUEFRUIT_SPI_MOSI, BLUEFRUIT_SPI_CS,
//                             BLUEFRUIT_SPI_IRQ, BLUEFRUIT_SPI_RST);


// Buffer to jsonTransmission
StaticJsonBuffer<200> jsonBuffer;
JsonObject& root = jsonBuffer.createObject();

double temps[4] = {0.0, 0.0, 0.0, 0.0};
time_t t = 0;
char jsonChars[JSON_OUTPUT_BUFFER_SIZE];  

// A small helper
void error(const __FlashStringHelper*err) {
  Serial.println(err);
  while (1);
}

// which analog pin to connect
#define THERMISTORPIN 0         

// how many samples to take and average, more takes longer
// but is more 'smooth'
#define NUMSAMPLES 5

#define SHHCoA 2.387026310e-06
#define SHHCoB 2.599054080e-04
#define SHHCoC 9.355587799e-08

// the value of the 'other' resistor
#define SERIESRESISTOR 220000    
 
void connected(void)
{
  Serial.println( F("Connected") );
}

void disconnected(void)
{
  Serial.println( F("Disconnected") );
}

void BleUartRX(char data[], uint16_t len)
{
  Serial.print( F("[BLE UART RX]" ) );
  Serial.write(data, len);
  Serial.println();
}
 
void setup(void) {
  Serial.begin(115200);
//  analogReference(EXTERNAL);

  Serial.println(F("BBQ Temperature Controller"));
  Serial.println(F("---------------------------------------"));

#ifdef BLEMODE
  Serial.println(F("Running in BLE Mode"));

   /* Initialise the module */
  Serial.print(F("Initialising the Bluefruit LE module: "));

  if ( !ble.begin(VERBOSE_MODE) )
  {
    error(F("Couldn't find Bluefruit, make sure it's in CoMmanD mode & check wiring?"));
  }
  Serial.println( F("OK!") );

  if ( FACTORYRESET_ENABLE )
  {
    /* Perform a factory reset to make sure everything is in a known state */
    Serial.println(F("Performing a factory reset: "));
    if ( ! ble.factoryReset() ){
      error(F("Couldn't factory reset"));
    }
  }

  if ( !ble.isVersionAtLeast(MINIMUM_FIRMWARE_VERSION) )
  {
    error( F("Callback requires at least 0.7.0") );
  }
  
  ble.reset();


  /* Disable command echo from Bluefruit */
  ble.echo(false);

  Serial.println("Requesting Bluefruit info:");
  /* Print Bluefruit information */
  ble.info();


    /* Set callbacks */
  ble.setConnectCallback(connected);
  ble.setDisconnectCallback(disconnected);
  ble.setBleUartRxCallback(BleUartRX);
  

  Serial.println(F("Finalizing Setup"));
  Serial.println();
  
  ble.verbose(false);  // debug info is a little annoying after this point!

#else
  Serial.println(F("Running in non-BLE Mode"));

  Serial.println(F("Finalizing Setup"));
  Serial.println();
#endif

//setup our JSON Buffer

  root[BBQ] = temps[BBQ_PIN];
  root[UPPER_LEVEL] = temps[UPPER_LEVEL_PIN];
  root[LOWER_LEVEL] = temps[LOWER_LEVEL_PIN];
  root[FAN_LEVEL] = temps[FAN_LEVEL_PIN];
  root[TIMESTAMP] = t; 
}
 
void loop(void) {
  uint8_t i, j;
  double average;
  int samples[NUMSAMPLES];
   
 for (j=0; j<=3; j++) {
   // take N samples in a row, with a slight delay
    for (i=0; i< NUMSAMPLES; i++) {
      samples[i] = analogRead(j);
     delay(10);
    }

    // average all the samples out
    average = 0;
    for (i=0; i< NUMSAMPLES; i++) {
       average += samples[i];
    }
    average /= NUMSAMPLES;
 
  Serial.print("Average analog reading for pin "); 
  Serial.print(j);
  Serial.print(" :");
  Serial.println(average);

  // convert the value to resistance
  average = 1023 / average - 1;
  average = SERIESRESISTOR / average;
  Serial.print("Thermistor resistance "); 
  Serial.println(average); // Verified until here via spreadsheet
  average = log(average); // Compute the LN of the Thermistor Resistance
  Serial.print("ln of Thermistor resistance ");
  Serial.println(average);
  
  temps[j] = (double) SHHCoA + (double) SHHCoB*average + (double) SHHCoC*average*average*average;
  Serial.print("Inverted T in Kelvin ");
  Serial.println(temps[j]);
  temps[j] = (double) 1/temps[j];
  Serial.print("T in Kelvin ");
  Serial.println(temps[j]);
  temps[j] -= 273.15;                         // convert to C
  Serial.print("Temperature "); 
  Serial.print(temps[j]);
  Serial.println(" *C");

  Serial.print("T in Farenheit ");
  Serial.println(1.8*temps[j]+32);
  temps[j] = 1.8*temps[j]+32;

 }
 


#ifdef BLEMODE
 
    
  if (ble.isConnected()) {

    

    // Add broadcast code to broadcast temp readings
      
//    ble.print("AT+BLEUARTTX=");
//    ble.print("Current Temp is ");
//    ble.print(1.8*T+32);
//    ble.println(" F");

    t = now();

    root[BBQ] = double_with_n_digits(temps[BBQ_PIN],1);
    root[UPPER_LEVEL] = double_with_n_digits(temps[UPPER_LEVEL_PIN],1);
    root[LOWER_LEVEL] = double_with_n_digits(temps[LOWER_LEVEL_PIN],1);
    root[FAN_LEVEL] = double_with_n_digits(temps[FAN_LEVEL_PIN],1);
    root[TIMESTAMP] = t;
    
    root.printTo(jsonChars, JSON_OUTPUT_BUFFER_SIZE);

    
    ble.print("AT+BLEUARTTX=");
    ble.println(jsonChars);
    Serial.println(jsonChars);
  }

  // LED Activity command is only supported from 0.6.6
  if ( ble.isVersionAtLeast(MINIMUM_FIRMWARE_VERSION) )
  {
    // Change Mode LED Activity
    Serial.println(F("******************************"));
    Serial.println(F("Change LED activity to " MODE_LED_BEHAVIOUR));
    ble.sendCommandCheckOK("AT+HWModeLED=" MODE_LED_BEHAVIOUR);
    Serial.println(F("******************************"));
  }
#endif

 
  delay(1000);
}
