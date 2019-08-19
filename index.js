/* jshint asi: true, esversion: 6, node: true, laxbreak: true, laxcomma: true, undef: true, unused: true */

const underscore = require('underscore')


const types =
{ 0x05       :
  { name     : 'page'
  , length   : 1
  , subtypes :
    { 0x01   : { token: 'desktop',          description: 'generic desktop controls'             }
    , 0x02   : { token: 'simulation',       description: 'simulation controls'                  }
    , 0x03   : { token: 'VR',               description: 'virtual reality controls'             }
    , 0x04   : { token: 'sport',            description: 'sport controls'                       }
    , 0x05   : { token: 'game',             description: 'game controls'                        }
    , 0x06   : { token: 'device',           description: 'generic device controls'              }
    , 0x07   : { token: 'keyboard',         description: 'keyboard/keypad'                      }
    , 0x08   : { token: 'LED',              description: 'LEDs'                                 }
    , 0x09   : { token: 'button',           description: 'button'                               }
    , 0x0a   : { token: 'ordinal',          description: 'ordinal'                              }
    , 0x0b   : { token: 'telephony',        description: 'telephony'                            }
    , 0x0c   : { token: 'consumer',         description: 'consumer'                             }
    , 0x0d   : { token: 'digitizer',        description: 'digitizer'                            }
    , 0x0f   : { token: 'PID',              description: 'physical interface device'            }
    , 0x10   : { token: 'Unicode',          description: 'Unicode'                              }
    , 0x14   : { token: 'alnum_display',    description: 'alphanumeric display'                 }
    , 0x40   : { token: 'medical',          description: 'medical'                              }
    , 0x80   : { token: 'monitor',          description: 'USB monitor'                          }
    , 0x81   : { token: 'monitor_enum',     description: 'monitor enumerated values'            }
    , 0x82   : { token: 'monitor_VESA_VCP', description: 'monitor VESA virtual control panel'   }
    , 0x84   : { token: 'power_device',     description: 'power device'                         }
    , 0x85   : { token: 'power_batsys',     description: 'power battery system'                 }
    , 0x8c   : { token: 'POS_BCS',          description: 'POS devices - bar code scanner'       }
    , 0x8d   : { token: 'POS_scale',        description: 'POS devices - scale'                  }
    , 0x8e   : { token: 'POS_MSR',          description: 'POS devices - magnetic stripe reader' }
    , 0x90   : { token: 'camera',           description: 'camera control'                       }
    , 0x91   : { token: 'arcade',           description: 'arcade'                               }
    }
  }
, 0x06       :
  { name     : 'page'
  , length   : 2                            // LSB
  }
, 0x09       :
  { name     : 'usage'
  , length   : 1
  }
, 0x15       :
  { name     : 'logical_minimum'
  , length   : 1
  }
, 0x17       :
  { name     : 'logical_minimum'
  , length   : 4
  , signed   : true
  }
, 0x25       :
  { name     : 'logical_maximum'
  , length   : 1
  }
, 0x26       :
  { name     : 'logical_maximum'
  , length   : 2
  }
, 0x27       :
  { name     : 'logical_maximum'
  , length   : 4
  }
, 0x55       :
  { name     : 'unit_exponent'
  , length   : 1
  , subtypes :
    { 0x00   : { pow10:  0                                                                      }
    , 0x01   : { pow10:  1                                                                      }
    , 0x02   : { pow10:  2                                                                      }
    , 0x03   : { pow10:  3                                                                      }
    , 0x04   : { pow10:  4                                                                      }
    , 0x05   : { pow10:  5                                                                      }
    , 0x06   : { pow10:  6                                                                      }
    , 0x07   : { pow10:  7                                                                      }
    , 0x08   : { pow10: -8                                                                      }
    , 0x09   : { pow10: -7                                                                      }
    , 0x0A   : { pow10: -6                                                                      }
    , 0x0B   : { pow10: -5                                                                      }
    , 0x0C   : { pow10: -4                                                                      }
    , 0x0D   : { pow10: -3                                                                      }
    , 0x0E   : { pow10: -2                                                                      }
    , 0x0F   : { pow10: -1                                                                      }
    }
  }
/* TBD: interpret units
   0x00       unspecified
   0x0110     seconds
   0x21d1f000 cm^2 * gram * sec^-3 * amp^-1
 */
, 0x65       :
  { name     : 'unit'
  , length   : 1
  }
, 0x66       :
  { name     : 'unit'
  , length   : 2
  }
, 0x67       :
  { name     : 'unit'
  , length   : 4
  }
, 0x75       :
  { name     : 'report_size'
  , length   : 1
  }
, 0x79       :
  { name     : 'string_index'
  , length   : 1
  }
, 0x85       :
  { name     : 'report_identifier'
  , length   : 1
  }
, 0x81       :
  { name     : 'input'
  , length   : 1
  , type     : 'bits'
  , bits     : { 0x01: 'constant', 0x02: 'variable', 0x20: 'no_preferred', 0x80: 'bit7'         }
  }
, 0x91       :
  { name     : 'output'
  , length   : 1
  , type     : 'bits'
  , bits     : { 0x02: 'variable' }
  }
, 0x95       :
  { name     : 'report_count'
  , length   : 1
  }
, 0xa1       :
  { name     : 'collection'
  , length   : 1
  , action   : 'push'
  , terminal : 0xc0
  , subtypes :
    { 0x01   : { token: 'application'                                                           }
    , 0x02   : { token: 'logical'                                                               }
    }
  }
, 0xb1       :
  { name     : 'feature'
  , length   : 1
  , type     : 'bits'
  , bits     : { 0x01: 'constant', 0x02: 'variable', 0x20: 'no_preferred', 0x80: 'volatile'     }
  }
}


const parse = (data) => {
  const collections = [ { entries: [] } ]
  let   offset      = 0

  while (offset < data.length) {
    const collection = underscore.last(collections)
        , datum      = data[offset++]
        , type       = types[datum]

    if (collection.terminal === datum) {
      delete collection.terminal
      collections.pop()
      continue
    }

    if (!type) throw new Error('unknown type 0x' + datum.toString(16) + ' at offset ' + (offset - 1))
    if (!type.length) throw new Error('logic error (no length in type) at offset ' + offset)

    if ((offset + type.length) > data.length) throw new Error('data underrun at offset ' + offset)

    const entry   = { name: type.name, payload: data.toString('hex', offset, offset + type.length) }
        , value   = data[type.signed ? 'readIntLE' : 'readUIntLE'](offset, type.length)

    offset += type.length
    collection.entries.push(entry)

    if (type.subtypes) underscore.extend(entry, type.subtypes[value])
    if (!type.action) {
      if (type.subtypes) continue

      if (!type.bits) {
        underscore.extend(entry, { value: value })
        continue
      }

      entry.bits = {}
      underscore.keys(type.bits).forEach((bit) => { entry.bits[type.bits[bit]] = !!(value & bit) })
      continue
    }

    if (type.action !== 'push') throw new Error('logic error (expecting push) at offset ' + offset)

    collections.push(entry)
    underscore.extend(entry, { entries: [], terminal: type.terminal })
  }

  if (collections.length !== 1) throw new Error('invalid collection nesting')

  return collections[0].entries
}

module.exports = { parse }
