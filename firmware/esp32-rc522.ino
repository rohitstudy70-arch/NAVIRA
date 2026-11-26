/*
  Navira School RFID Reader Example — ESP32 + RC522
  Libraries: MFRC522, WiFi, HTTPClient, ArduinoJson
  Wiring (ESP32 VSPI): SDA=5, SCK=18, MOSI=23, MISO=19, RST=22, 3.3V/GND
*/
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

constexpr uint8_t SS_PIN = 5;
constexpr uint8_t RST_PIN = 22;
const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* SCAN_URL = "http://YOUR_SERVER:5000/api/attendance/scan";
const char* DEVICE_ID = "GATE01";
const char* DEVICE_API_KEY = "navira-demo-device-key-change-me"; // replace in production
MFRC522 rfid(SS_PIN, RST_PIN);

String cardUid() {
  String uid;
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

void postScan(const String& uid) {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(SCAN_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-api-key", DEVICE_API_KEY);
  String body = "{\"cardUID\":\"" + uid + "\",\"deviceId\":\"" + DEVICE_ID + "\",\"timestamp\":\"\"}";
  int status = http.POST(body); // Server supplies current time when timestamp is empty/invalid only if omitted.
  Serial.printf("RFID %s => HTTP %d\n", uid.c_str(), status);
  Serial.println(http.getString());
  http.end();
}

void setup() {
  Serial.begin(115200); SPI.begin(); rfid.PCD_Init();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(300); Serial.print('.'); }
  Serial.println("\nReader online");
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;
  postScan(cardUid());
  rfid.PICC_HaltA(); rfid.PCD_StopCrypto1();
  delay(250); // API duplicate window is the authoritative protection.
}
