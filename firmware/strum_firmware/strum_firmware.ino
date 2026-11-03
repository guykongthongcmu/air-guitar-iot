#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include "secrets.h"

const unsigned long SAMPLE_MS   = 25;
const float STRUM_SPEED         = 60.0;
const unsigned long LOCKOUT_MS  = 150;
const float MIN_DIST_CM         = 3.0;
const float MAX_DIST_CM         = 60.0;
const float SMOOTH              = 0.5;
const int   VEL_WINDOW          = 3;
const bool  DEBUG_PRINT         = true;

const int TRIG_PIN = D5;
const int ECHO_PIN = D6;

WiFiClient wifi;
PubSubClient mqtt(wifi);

float dist = -1;
float rawHist[3];
int rawCount = 0;
float distHist[VEL_WINDOW + 1];
unsigned long timeHist[VEL_WINDOW + 1];
int histCount = 0;
unsigned long lastSample = 0;
unsigned long lastStrum = 0;
unsigned long lastMqttTry = 0;
unsigned long lastWifiTry = 0;
unsigned long lastStatus = 0;
unsigned long lastDebug = 0;
unsigned long lastDist = 0;
unsigned long ledBlink = 0;
unsigned long strumFlashUntil = 0;

String topicStrum, topicStatus, topicDist;

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long d = pulseIn(ECHO_PIN, HIGH, 15000);
  if (d == 0) return -1;
  return d * 0.0343 / 2.0;
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    lastWifiTry = 0;
    return;
  }
  if (lastWifiTry != 0 && millis() - lastWifiTry < 30000) return;
  lastWifiTry = millis();
  Serial.println("wifi: connecting");
  WiFi.disconnect();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
}

void connectMqtt() {
  if (WiFi.status() != WL_CONNECTED || mqtt.connected()) return;
  if (millis() - lastMqttTry < 5000) return;
  lastMqttTry = millis();
  String id = "airguitar-" + String(ESP.getChipId(), HEX);
  Serial.println("mqtt: connecting");

  if (mqtt.connect(id.c_str(), topicStatus.c_str(), 0, true, "offline")) {
    mqtt.publish(topicStatus.c_str(), "online", true);
    Serial.println("mqtt: connected");
  } else {
    Serial.print("mqtt: failed, rc=");
    Serial.println(mqtt.state());
  }
}

void publishStrum(const char* dir, float speed) {
  char msg[80];
  snprintf(msg, sizeof(msg), "{\"dir\":\"%s\",\"speed\":%.1f,\"t\":%lu}", dir, speed, millis());
  if (mqtt.connected()) mqtt.publish(topicStrum.c_str(), msg);
  Serial.print("STRUM ");
  Serial.println(msg);
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  topicStrum = String(MQTT_PREFIX) + "/strum";
  topicStatus = String(MQTT_PREFIX) + "/status";
  topicDist = String(MQTT_PREFIX) + "/dist";
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setSocketTimeout(5);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  WiFi.setSleepMode(WIFI_NONE_SLEEP);

  Serial.println("strum firmware started");
}

void loop() {
  connectWifi();
  connectMqtt();
  mqtt.loop();

  unsigned long t = millis();
  if (t < strumFlashUntil) {
    digitalWrite(LED_BUILTIN, HIGH);
  } else if (mqtt.connected()) {
    digitalWrite(LED_BUILTIN, LOW);
  } else if (t - ledBlink >= (WiFi.status() == WL_CONNECTED ? 900UL : 150UL)) {
    ledBlink = t;
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  }

  if (millis() - lastStatus >= 3000) {
    lastStatus = millis();
    Serial.println(mqtt.connected() ? "mqtt: connected" : "mqtt: not connected");
    int ws = WiFi.status();
    if (ws == WL_CONNECTED) Serial.println("ip " + WiFi.localIP().toString());
    else if (ws == WL_NO_SSID_AVAIL) Serial.println("wifi: no network");
    else if (ws == WL_CONNECT_FAILED) Serial.println("wifi: bad pass");
    else Serial.println("wifi: wait " + String(ws));
  }

  unsigned long now = millis();
  if (now - lastSample < SAMPLE_MS) return;
  lastSample = now;

  float raw = readDistanceCm();
  if (now - lastDist >= 500 && mqtt.connected()) {
    lastDist = now;
    char dm[16];
    if (raw < 0) snprintf(dm, sizeof(dm), "none");
    else snprintf(dm, sizeof(dm), "%.1f", raw);
    mqtt.publish(topicDist.c_str(), dm);
  }
  if (raw < MIN_DIST_CM || raw > MAX_DIST_CM) {
    rawCount = 0;
    histCount = 0;
    return;
  }

  rawHist[rawCount % 3] = raw;
  rawCount++;
  if (rawCount < 3) return;
  float a = rawHist[0], b = rawHist[1], c = rawHist[2];
  float med = max(min(a, b), min(max(a, b), c));

  if (histCount == 0) dist = med;
  else dist = SMOOTH * med + (1 - SMOOTH) * dist;

  const int N = VEL_WINDOW + 1;
  distHist[histCount % N] = dist;
  timeHist[histCount % N] = now;
  histCount++;
  if (histCount < N) return;
  int oldest = histCount % N;
  float elapsed = (now - timeHist[oldest]) / 1000.0;
  float speed = (dist - distHist[oldest]) / elapsed;

  if (DEBUG_PRINT && now - lastDebug >= 250) {
    lastDebug = now;
    Serial.print("d=");
    Serial.print(dist, 1);
    Serial.print(" v=");
    Serial.println(speed, 0);
  }

  if (fabs(speed) >= STRUM_SPEED && now - lastStrum >= LOCKOUT_MS) {
    lastStrum = now;
    strumFlashUntil = now + 80;
    if (speed < 0) {
      publishStrum("down", fabs(speed));
    } else {
      publishStrum("up", fabs(speed));
    }
  }
}
