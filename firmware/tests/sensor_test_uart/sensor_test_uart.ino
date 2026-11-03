#include <SoftwareSerial.h>

SoftwareSerial sensor(D5, D6);

void setup() {
  Serial.begin(115200);
  sensor.begin(9600);
  Serial.println("US-100 UART test started");
}

void loop() {
  while (sensor.available()) sensor.read();

  sensor.write(0x55);
  delay(50);

  if (sensor.available() >= 2) {
    int high = sensor.read();
    int low = sensor.read();
    int mm = high * 256 + low;
    Serial.print(mm / 10.0, 1);
    Serial.println(" cm");
  } else {
    Serial.println("no reply");
  }

  delay(100);
}
