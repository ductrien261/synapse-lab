# Third-party 3D models

The `.stl` files in this directory are real electronic components, taken from
the Adafruit CAD parts library:

- Source: <https://github.com/adafruit/Adafruit_CAD_Parts>
- Licence: MIT, Copyright (c) 2016 Adafruit Industries (see `LICENSE-adafruit-cad-parts.txt`)

| File | Original part (Adafruit product number) |
|---|---|
| `tt-motor.stl` | 3777 TT Motor |
| `esp32.stl` | 3405 Adafruit HUZZAH32 ESP32 Feather |
| `relay.stl` | 3191 Power Relay FeatherWing |
| `soil-sensor.stl` | 4026 STEMMA Soil Sensor |
| `battery.stl` | 354 4400 mAh battery |
| `tft.stl` | 2090 2.8in TFT Cap Touch |
| `line-sensor.stl` | 5913 TCRT1000 Sensor |
| `driver.stl` | 3190 DRV8871 Breakout |
| `switch.stl` | 3221 Toggle Switch |
| `boost.stl` | 4654 MiniBoost 5V |

Changes made: the larger meshes (ESP32, relay, TFT, line sensor, motor driver, toggle switch) were reduced
to 8,000 to 22,000 triangles, and each model was re-centred so its base sits at
the origin (the TT motor is centred on all axes). Units are millimetres, as in
the originals. Adafruit does not endorse this project.
