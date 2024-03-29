/* jshint asi: true, esversion: 6, node: true, laxbreak: true, laxcomma: true, undef: true, unused: true */

const hidparse = require('.')
    , find     = hidparse.find
    , parse    = hidparse.parse
    , data     = new Buffer.from([
  0x05, 0x84,
  0x09, 0x04,
  0xA1, 0x01,
    0x09, 0x24,
    0xA1, 0x02,
      0x75, 0x08, 0x95, 0x01, 0x15, 0x00,
      0x26, 0xFF, 0x00, 0x85, 0x01, 0x09, 0xFE, 0x79, 0x02, 0xB1, 0x23, 0x85, 0x02, 0x09, 0xFF, 0x79,
      0x03, 0xB1, 0x23, 0x85, 0x03, 0x09, 0xFD, 0x79, 0x01, 0xB1, 0x23, 0x05, 0x85, 0x85, 0x04, 0x09,
      0x8F, 0x79, 0x01, 0xB1, 0x23, 0x85, 0x05, 0x09, 0x89, 0x79, 0x04, 0xB1, 0x23, 0x85, 0x06, 0x09,
      0x8B, 0xB1, 0x23, 0x09, 0x2C, 0xB1, 0x23, 0x85, 0x0E, 0x09, 0x83, 0x25, 0x64, 0xB1, 0x23, 0x09,
      0x67, 0xB1, 0x23, 0x85, 0x0C, 0x09, 0x66, 0x81, 0x23, 0x09, 0x66, 0xB1, 0xA3, 0x85, 0x10, 0x09,
      0x8D, 0xB1, 0x23, 0x09, 0x8E, 0xB1, 0x23, 0x85, 0x0F, 0x09, 0x8C, 0xB1, 0xA2, 0x85, 0x11, 0x09,
      0x29, 0xB1, 0xA2, 0x85, 0x09, 0x09, 0x85, 0x75, 0x10, 0x27, 0xFF, 0xFF, 0x00, 0x00, 0xB1, 0xA3,
      0x85, 0x0D, 0x09, 0x68, 0x66, 0x01, 0x10, 0x55, 0x00, 0x75, 0x20, 0x17, 0xFF, 0xFF, 0xFF, 0xFF,
      0x25, 0x00, 0x81, 0xA3, 0x09, 0x68, 0xB1, 0xA3, 0x05, 0x84, 0x85, 0x12, 0x09, 0x57, 0x15, 0x00,
      0x27, 0xFF, 0xFF, 0x00, 0x00, 0x81, 0x22, 0x09, 0x57, 0xB1, 0xA2, 0x85, 0x13, 0x09, 0x55, 0x75,
      0x20, 0x17, 0xFF, 0xFF, 0xFF, 0xFF, 0x25, 0x00, 0x81, 0x22, 0x09, 0x55, 0xB1, 0xA2, 0x05, 0x85,
      0x85, 0x08, 0x09, 0x2A, 0x75, 0x10, 0x15, 0x00, 0x27, 0xFF, 0xFF, 0x00, 0x00, 0x81, 0x22, 0x09,
      0x2A, 0xB1, 0xA2, 0x05, 0x84, 0x85, 0x0A, 0x09, 0x40, 0x67, 0x21, 0xD1, 0xF0, 0x00, 0x55, 0x05,
      0xB1, 0x23, 0x85, 0x0B, 0x09, 0x30, 0xB1, 0xA3, 0x85, 0x14, 0x09, 0x5A, 0x75, 0x08, 0x15, 0x01,
      0x25, 0x03, 0x65, 0x00, 0x55, 0x00, 0x81, 0x22, 0x09, 0x5A, 0xB1, 0xA2, 0x09, 0x02,
      0xA1, 0x02,
        0x85, 0x07, 0x05, 0x85, 0x75, 0x01, 0x15, 0x00, 0x25, 0x01, 0x09, 0x44, 0x81, 0xA3, 0x09, 0x44,
        0xB1, 0xA3, 0x09, 0x45, 0x81, 0xA3, 0x09, 0x45, 0xB1, 0xA3, 0x09, 0xD0, 0x81, 0xA3, 0x09, 0xD0,
        0xB1, 0xA3, 0x09, 0xD1, 0x81, 0xA3, 0x09, 0xD1, 0xB1, 0xA3, 0x09, 0x42, 0x81, 0xA3, 0x09, 0x42,
        0xB1, 0xA3, 0x05, 0x84, 0x09, 0x68, 0x81, 0xA2, 0x09, 0x68, 0xB1, 0xA2, 0x09, 0x69, 0x81, 0xA3,
        0x09, 0x69, 0xB1, 0xA3, 0x05, 0x85, 0x09, 0x43, 0x81, 0xA2, 0x09, 0x43, 0xB1, 0xA2, 0x05, 0x84,
        0x09, 0x73, 0x81, 0xA3, 0x09, 0x73, 0xB1, 0xA3, 0x05, 0x85, 0x09, 0x4B, 0x81, 0xA3, 0x09, 0x4B,
        0xB1, 0xA3, 0x05, 0x84, 0x09, 0x65, 0x81, 0xA3, 0x09, 0x65, 0xB1, 0xA3, 0x05, 0x85, 0x09, 0xDB,
        0x81, 0xA3, 0x09, 0xDB, 0xB1, 0xA3, 0x95, 0x04, 0x81, 0x01, 0xB1, 0x01,
        0xC0,
      0xC0,
      0x06, 0x86,
      0xFF, 0x85, 0x89, 0x09, 0xFD, 0x15, 0x00, 0x26, 0xFF, 0x00, 0x75, 0x08, 0x95, 0x3F, 0x81, 0x02,
      0x85, 0x90, 0x09, 0xFC, 0x95, 0x3F, 0x91, 0x02, 0x85, 0x96, 0x09, 0xF1, 0x95, 0x3F, 0xB1, 0x22,
      0x85, 0x8D, 0x09, 0xF7, 0x95, 0x02, 0xB1, 0x22, 0x85, 0x92, 0x09, 0xF4, 0xB1, 0x23, 0x85, 0x93,
      0x09, 0xF3, 0xB1, 0x22, 0x85, 0x94, 0x09, 0xF2, 0xB1, 0x23, 0x85, 0x8E, 0x09, 0xF6, 0x95, 0x04,
      0xB1, 0x23,
    0xC0
])
    , report = parse(data)

console.log(JSON.stringify(find(report, 0xff86, 0x00fc), null, 2))
console.log(JSON.stringify(find(report, 0xff86, 0x00fd), null, 2))
