/* jshint asi: true, esversion: 6, node: true, laxbreak: true, laxcomma: true, undef: true, unused: true */

/* cf., [APC Application Note 176](https://www.apc.com/salestools/MPAO-98KJ7F/MPAO-98KJ7F_R1_EN.pdf)
        [APC Application Note 178](https://www.apc.com/salestools/MPAO-99NQF6/MPAO-99NQF6_R1_EN.pdf)
        [Modbus Application Protocol Specifiation v1.1b](http://www.modbus.org/docs/Modbus_Application_Protocol_V1_1b.pdf)
        [Device Class Definition for HID 1.11](https://www.usb.org/sites/default/files/documents/hid1_11.pdf)
        [HID Usage Tables 1.12](https://www.usb.org/sites/default/files/documents/hut1_12v2.pdf)
        [HID Sensor Usages](https://www.usb.org/sites/default/files/hutrr39b_0.pdf)

   a mashup of apcupsd's

     lib/apcstatus.c
     drivers/modbus/mapping.{h,cpp}
     drivers/modbus/modbus.cpp
     drivers/modbus/ModbusUsbComm.cpp
 */

// all values here from Appendix B, except for USCC from Appendix X
const mapping =
{ US                               : // UPS_STATUS
  { US_ONLINE                      : 1 << 1
  , US_ONBATTERY                   : 1 << 2
  }
, USCC                             : // UPS_STATUS_CHANGE_CAUSE
  { USCC_HIGH_INPUT_VOLTAGE        :  1
  , USCC_LOW_INPUT_VOLTAGE         :  2
  , USCC_DISTORTED_INPUT           :  3
  , USCC_RAPID_CHANGE              :  4
  , USCC_HIGH_INPUT_FREQ           :  5
  , USCC_LOW_INPUT_FREQ            :  6
  , USCC_FREQ_PHASE_DIFF           :  7
  , USCC_AUTOMATIC_TEST            :  9
  , USCC_LOCAL_UI_CMD              : 11
  , USCC_PROTOCOL_CMD              : 12
  }
, SSS                              : // SIMPLE_SIGNALING_STATUS
  { SSS_SHUTDOWN_IMMINENT          : 1 << 1
  }
, PSE                              : // POWER_SYSTEM_ERROR
  { PSE_OUTPUT_OVERLOAD            : 1 << 0
  }
, BSE                              : // BATTERY_SYSTEM_ERROR
  { BSE_DISCONNECTED               : 1 << 0
  , BSE_NEEDS_REPLACEMENT          : 1 << 2
  }
, BTS                              : // BATTERY_TEST_STATUS
  { BTS_PENDING                    : 1 << 0
  , BTS_IN_PROGRESS                : 1 << 1
  , BTS_PASSED                     : 1 << 2
  , BTS_FAILED                     : 1 << 3
  }
, CS                               : //CALIBRATION_STATUS
  { CS_PENDING                     : 1 << 0
  , CS_IN_PROGRESS                 : 1 << 1
  }
, IS                               : // INPUT_STATUS
  { IS_BOOST                       : 1 << 5
  , IS_TRIM                        : 1 << 6
  }
, OVS                              : // OUTPUT_VOLTAGE_SETTING
  { OVS_100VAC                     : 1 << 0
  , OVS_120VAC                     : 1 << 1
  , OVS_200VAC                     : 1 << 2
  , OVS_208VAC                     : 1 << 3
  , OVS_220VAC                     : 1 << 4
  , OVS_230VAC                     : 1 << 5
  , OVS_240VAC                     : 1 << 6
  }
}

const registers =
{ REG_UPS_STATUS                   : { address:    0, type: 'readUInt32LE', count:  2
                                     , mapping: (props, value) =>
                                       {
                                         props.status = ''
                                         if (value & mapping.UPS_STATUS.US_ONLINE) props.status += 'ONLINE'
                                         if (value & mapping.UPS_STATUS.US_ONBATTERY) props.status += 'ONBATT'
                                       }
                                     }
, REG_UPS_STATUS_CHANGE_CAUSE      : { address:    2, type: 'readUint16BE'
                                     , mapping: (props, value) =>
                                       {
                                         if (props.status.indexOf('ONBATT ') === -1) return

                                         props.LASTXFER = (value === mapping.USCC.USCC_HIGH_INPUT_VOLTAGE)
                                                            ? 'High line voltage'
                                                        : (value === mapping.USCC.USCC_LOW_INPUT_VOLTAGE)
                                                            ? 'Low line voltage'
                                                        : (value === mapping.USCC.USCC_DISTORTED_INPUT)
                                                            ? 'Line voltage notch or spike'
                                                        : (value === mapping.USCC.USCC_RAPID_CHANGE)
                                                            ? 'Unaccepable line voltage changes'
                                                        : ((value == mapping.USCC.USCC_HIGH_INPUT_FREQ)
                                                             || (value === mapping.USCC.USCC_LOW_INPUT_FREQ)
                                                             || (value === mapping.USCC.USCC_FREQ_PHASE_DIFF))
                                                            ? 'Input frequence out of range'
                                                        : (value == mapping.USCC.USCC_AUTOMATIC_TEST)
                                                            ? 'Automatic or explicit self test'
                                                        : ((value === mapping.USCC.USCC_LOCAL_UI_CMD)
                                                             || (value === mapping.USCC.USCC_PROTOCOL_CMD))
                                                            ? 'Forced by software' : 'UNKNOWN EVENT'
                                       }
                                     }
, REG_SIMPLE_SIGNALLING_STATUS     : { address:   18, type: 'readUint16BE'
                                     , mapping: (props, value) =>
                                       {
                                         if (value & mapping.SSS.SSS_SHUTDOWN_IMMINENT) props.status += 'LOWBATT '
                                       }
                                     }
, REG_POWER_SYSTEM_ERROR           : { address:   20, type: 'readUInt32BE', count:  2
                                     , mapping: (props, value) =>
                                       {
                                         if (value & mapping.PSE.PSE_OUTPUT_OVERLOAD) props.status += 'OVERLOAD '
                                       }
                                     }
, REG_BATTERY_SYSTEM_ERROR         : { address:   22, type: 'readUint16BE'
                                     , mapping: (props, value) =>
                                       {
                                         if (value & mapping.BSE.BSE_NEEDS_REPLACEMENT) props.status += 'REPLACEBATT '
                                         if (value & mapping.BSE.BSE_DISCONNECTED) props.status += 'NOBATT '
                                       }
                                     }
, REG_BATTERY_TEST_STATUS          : { address:   23, type: 'readUint16BE'
                                     , mapping: (props, value) =>
                                         {
                                           props.SELFTEST = (value & (mapping.BTS.BTS_PENDING
                                                                        | mapping.BTS.BTS_IN_PROGRESS)) ? 'IP'
                                                          : (value & mapping.BTS.BTS_PASSED)            ? 'OK'
                                                          : (value & mapping.BTS.BTS_FAILED)            ? 'NG'
                                                          : (value === 0)                               ? 'NO' : '??'
                                         }
                                     }
, REG_CALIBRATION_STATUS           : { address:   24, type: 'readUint16BE'
                                     , mapping: (props, value) => {
                                         if (value & (mapping.CS.CS_PENDING | mapping.CS.CS_IN_PROGRESS)) props.status += 'CAL '
                                       }
                                     }
, REG_RUNTIME_REMAINING            : { address:  128, type: 'readUInt32BE', count:  2
                                     , mapping: (props, value) =>
                                       {
                                         props.TIMELEFT = mb2float(value, 0, 1, 'Minutes')
                                       }
                                     }
, REG_STATE_OF_CHARGE_PCT          : { address:  130, type: 'readUint16BE'
                                     , mapping: (props, value) =>
                                       {
                                         props.BCHARGE = mb2float(value, 9, 1, 'Percent')
                                       }
                                     }
, REG_BATTERY_VOLTAGE              : { address:  131, type: 'readInt16BE'
                                     , mapping: (props, value) =>
                                       {
                                         props.BATTV = mb2float(value, 5, 1, 'Volts')
                                       }
                                     }
, REG_BATTERY_TEMPERATURE          : { address:  135, type: 'readInt16BE'
                                     , mapping: (props, value) =>
                                       {
                                         props.ITEMP = mb2float(value, 7, 1, 'C')
                                       }
                                     }
, REG_OUTPUT_0_REAL_POWER_PCT      : { address:  136, type: 'readUint16BE'
                                     , mapping: (props, value) =>
                                       {
                                         props.LOADPCT = mb2float(value, 8, 1, 'Percent')
                                       }
                                     }
, REG_OUTPUT_0_APPARENT_POWER_PCT  : { address:  138, type: 'readUint16BE'
                                     , mapping: (props, value) =>
                                       {
                                         props.LOADAPNT = mb2float(value, 8, 1, 'Percent')
                                       }
                                     }
, REG_OUTPUT_0_CURRENT             : { address:  140, type: 'readUint16BE'
                                       , mapping: (props, value) =>
                                       {
                                         props.OUTCURNT = mb2float(value, 5, 2,' mps')
                                       }
                                     }
, REG_OUTPUT_0_VOLTAGE             : { address:  142, type: 'readUint16BE'
                                     , mapping: (props, value) =>
                                       {
                                         props.OUTPUTV = mb2float(value, 6, 1, 'Volts')
                                       }
                                     }
, REG_OUTPUT_FREQUENCY             : { address:  144, type: 'readUint16BE'
                                     , mapping: (props, value) =>
                                       {
                                         props.LINEFREQ = mb2float(value, 7, 1, 'Hz')
                                       }
                                     }
, REG_INPUT_STATUS                 : { address:  150, type: 'readUint16BE'
                                     , mapping: (props, value) =>
                                         {
                                           if (value & mapping.IS.IS_BOOST) props.status += 'BOOST '
                                           if (value & mapping.IS.IS_TRIM) props.status += 'TRIM '
                                         }
                                     }
, REG_INPUT_0_VOLTAGE              : { address:  151, type: 'readUint16BE'
                                     , mapping: (props, value) =>
                                       {
                                         props.LINEV = mb2float(value, 6, 1, 'Volts')
                                       }
                                     }
, REG_FW_VERSION                   : { address:  516, type: 'toASCIIonly',  count:  8, onceP: true
                                     , mapping: (props, value) =>
                                       {
                                         props.FIRMWARE = value
                                       }
                                     }
, REG_MODEL                        : { address:  532, type: 'toASCIIonly',  count: 16, onceP: true
                                     , mapping: (props, value) =>
                                       {
                                         props.MODEL = value
                                       }
                                     }
, REG_SERIAL_NUMBER                : { address:  564, type: 'toASCIIonly',  count:  8, onceP: true
                                     , mapping: (props, value) =>
                                       {
                                         props.SERIALNO = value
                                       }
                                     }
, REG_OUTPUT_APPARENT_POWER_RATING : { address:  588, type: 'readUint16BE',            onceP: true
                                     , mapping: (props, value) =>
                                       {
                                         props.NOMAPNT = value + ' VA'
                                       }
                                     }
, REG_OUTPUT_REAL_POWER_RATING     : { address:  589, type: 'readUint16BE',            onceP: true
                                     , mapping: (props, value) =>
                                       {
                                         props.NOMPOWER = value + ' Watts'
                                       }
                                     }
, REG_MANUFACTURE_DATE             : { address:  591, type: 'readUint16BE',            onceP: true
                                     , mapping: (props, value) =>
                                       {
                                         props.MANDATE = mb2date(value)
                                       }
                                     }
, REG_OUTPUT_VOLTAGE_SETTING       : { address:  592, type: 'readUint16BE',            onceP: true
                                     , mapping: (props, value) =>
                                       {
                                         const volts = (value & mapping.OVS.OVS_100VAC) ? 100
                                                     : (value & mapping.OVS.OVS_120VAC) ? 120
                                                     : (value & mapping.OVS.OVS_200VAC) ? 200
                                                     : (value & mapping.OVS.OVS_208VAC) ? 208
                                                     : (value & mapping.OVS.OVS_220VAC) ? 220
                                                     : (value & mapping.OVS.OVS_230VAC) ? 230
                                                     : (value & mapping.OVS.OVS_240VAC) ? 240 : -1

                                         props.NOMOUTV = volts + ' Volts'
                                       }
                                     }
, REG_BATTERY_DATE_SETTING         : { address:  595, type: 'readUint16BE',            onceP: true
                                     , mapping: (props, value) =>
                                       {
                                         props.BATTDATE = mb2date(value)
                                       }
                                     }
, REG_NAME                         : { address:  596, type: 'toASCIIonly',  count:  8, onceP: true
                                     , mapping: (props, value) =>
                                       {
                                         props.UPSNAME = value
                                       }
                                     }
, REG_MOG_TURN_OFF_COUNT_SETTING   : { address: 1029, type: 'readInt16BE',             onceP: true
                                     , mapping: (props, value) =>
                                       {
                                         props.DSHUTD = value + ' Seconds'
                                       }
                                     }
, REG_MOG_TURN_ON_COUNT_SETTING    : { address: 1030, type: 'readInt16BE',             onceP: true
                                     , mapping: (props, value) =>
                                       {
                                         props.DWAKE = value + ' Seconds'
                                       }
                                     }
, REG_MODBUS_MAP_ID                : { address: 2048, type: 'toASCIIonly',  count:  2, onceP: true
                                     , mapping: (props, value) =>
                                       {
                                         props.FIRMWARE += '/' + value
                                       }
                                     }
}

Buffer.prototype.toASCIIonly = function(start, end) {
  let result = ''

  if (start <= 0) start = 0
  if (end > this.length) end = this.length

  while (start < end) {
    let c = this.buf[start]

    result += ((0x20 <= c) && (c <= 0x7e)) ? c : ' '
  }

  return result.trim()
}

const mb2date = (value) => {
  const epoch = 946684800000 // usec since 2000-01-01
  const seconds = value * 86400 * 1000
  const date = new Date(epoch + seconds)

  return date.toISOString().split('T')[0]
}

const mb2float = (value, scale, places, units) => {
  return (Math.fixed(value / (1 << scale), places) + ' ' + units)
}
