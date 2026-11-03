const int TRIG_PIN = D5;
const int ECHO_PIN = D6;

float lastDist = 0;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);
  Serial.println("US-100 test started");
}

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;
  return duration * 0.0343 / 2.0;
}

void loop() {
  float dist = readDistanceCm();

  if (dist < 0) {
    Serial.println("no echo");
  } else {
    float change = dist - lastDist;
    Serial.print(dist, 1);
    Serial.print(" cm   change: ");
    Serial.println(change, 1);
    lastDist = dist;
  }

  delay(40);
}
