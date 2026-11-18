// Where each code on Window seat's tickets sits, for the flight map. City
// codes (LON, NYC, MIL) use the city centre; airport codes use the airport.
// Stops named in `via` are looked up by city.
export const airports: Record<string, [lat: number, lng: number]> = {
  LON: [51.507, -0.128],
  LHR: [51.47, -0.454],
  LGW: [51.153, -0.182],
  STN: [51.885, 0.235],
  LIS: [38.774, -9.134],
  LTN: [51.875, -0.368],
  GLA: [55.872, -4.433],
  SFO: [37.621, -122.379],
  NYC: [40.713, -74.006],
  YTO: [43.653, -79.383],
  HOU: [29.76, -95.37],
  LOS: [6.577, 3.321],
  BKK: [13.69, 100.75],
  HKT: [8.113, 98.317],
  DOH: [25.273, 51.608],
  MIL: [45.464, 9.19],
  BUD: [47.439, 19.262],
  ROM: [41.903, 12.496],
  RAK: [31.607, -8.036],
  TCI: [28.291, -16.629],
  SEL: [37.566, 126.978],
  NBO: [-1.319, 36.927],
  MBA: [-4.035, 39.594],
  BER: [52.366, 13.503],
  IBZ: [38.873, 1.373],
  BCN: [41.297, 2.078],
  ZNZ: [-6.222, 39.225],
};

export const stops: Record<string, [lat: number, lng: number]> = {
  Abuja: [9.007, 7.263],
  Doha: [25.273, 51.608],
};
