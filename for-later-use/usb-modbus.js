/* jshint asi: true, esversion: 6, node: true, laxbreak: true, laxcomma: true, undef: true, unused: true */

const hidparse   = require('node-hid-parse')
    , crc16m     = require('crc-full').CRC.default('CRC16_MODBUS')
//  , stringify  = require('json-stringify-safe')
    , usb        = require('usb')
    , underscore = require('underscore')

/*
console.log(JSON.stringify(usb, null, 2))
*/


//courtesy of https://stackoverflow.com/questions/5366849/convert-1-to-0001-in-javascript#answer-5367656;
Number.prototype.padLeft = function (n, str) {
  return (this < 0 ? '-' : '') + Array(n - String(Math.abs(this)).length + 1).join(str || '0') + (Math.abs(this))
}

const oops = (device, endpoint, task, ex) => {
  if (!ex) {
    ex = task
    task = endpoint
    endpoint = undefined
  }
  return (device2str(device, endpoint) + ': ' + task + ' error: ' + ex.toString())  
}

const device2str = (device, endpoint) => {
  let result = '/dev/bus/usb/' + device.busNumber.padLeft(3, '0') + '/' + device.deviceAddress.padLeft(3, '0')

  if (endpoint) result += ':' + endpoint.direction + ' ' + endpoint.descriptor.bEndpointAddress
  return result
}

usb.on('attach', (device) => {
  console.log(device2str(device) + ': attached')
}).on('detach', (device) => {
  console.log(device2str(device) + ': detached')
}).setDebugLevel(0)


// from apcupsd-3.14.14/src/lib/usbvidpid.cpp

const registry =
{ APC      : { vendorID  : 0x051D
             , productIDs: [ 0x0002, 0x0003, 0x0004, 0xC801, 0xC802, 0xC803, 0xC804, 0xC805 ]
             }
, SCHNEIDER: { vendorID  : 0x16DE
             , productIDs: [ 0xC801, 0xC802, 0xC803, 0xC804, 0xC805 ]
             }
}
    , products = []


underscore.keys(registry).forEach((manufacturer) => {
  const entry = registry[manufacturer]

  entry.productIDs.forEach((product) => { products.push(entry.vendorID + ':' + product) })
})

underscore.filter(usb.getDeviceList() || [], (device) => {
  const dd = device.deviceDescriptor

  if (products.indexOf(dd.idVendor + ':' + dd.idProduct) === -1) return

/*
  console.log(JSON.stringify(device, null, 2))
  console.log('allConfigDescriptors=' + JSON.stringify(device.allConfigDescriptors, null, 2))
 */

  try { device.open() } catch(ex) {
    console.log(oops(device, null, 'open', ex))
    return true
  }

  device.runtime = {}

/*
  const getDescriptor = ((index, property) => {
    device.getStringDescriptor(index, (err, data) => {
      if (err) return

      device.runtime.descriptors[property] = data.trim()
      console.log('descriptor ' + property + ': ' + data.trim())
    })
  })

  device.runtime.descriptors = {}
  getDescriptor(1, 'vendorName')
  getDescriptor(2, 'productName')
  getDescriptor(3, 'serialNumber')
 */

/*
  device.getBosDescriptor((err, bosDescriptor) => {
    if (err) return console.log(oops(device, 'getBosDescriptor', err))

    device.runtime.bosDescriptor = bosDescriptor
    console.log('bosDescriptor= ' + JSON.stringify(bosDescriptor, null, 2))
  })  
  device.getCapabilities((err, capabilities) => {
    if (err) return console.log(oops(device, 'getCapabilities', err))

    device.runtime.capabilities = capabilities
    console.log('capabilities=' + JSON.stringify(capabilities, null, 2))
  })  
 */

  const getReport = (wOffset, wIndex, retries) => {
    if (!wOffset) wOffset = 0
    if (!wIndex) wIndex = 0
    if (!retries) retries = 4
                                                       
    device.controlTransfer(usb.LIBUSB_ENDPOINT_IN /* | usb.LIBUSB_RECIPIENT_INTERFACE */,
                           usb.LIBUSB_REQUEST_GET_DESCRIPTOR,
                           (usb.LIBUSB_DT_REPORT << 8) + wOffset,
                           wIndex, 4096, (err, data) =>
    {
      let report, rxRTU, rxid, txRTU, txid

      if (err) {
        if ((err.errno === usb.LIBUSB_TRANSFER_TIMED_OUT) && (retries-- > 0)) return getReport(wOffset, wIndex, retries)

        return console.log(oops(device, 'report', err))
    }

      try {
        report = hidparse.parse(data)

/* ModbusRTURx: ff86 00fc
   ModbusRTUTx: ff86 00fd
 */
        rxRTU = hidparse.find(report, 0xff86, 0x00fc)
        rxid = rxRTU[0].value

        txRTU = hidparse.find(report, 0xff86, 0x00fd)
        txid = txRTU[0].value
      } catch(ex) {
        return console.log(oops(device, 'report', ex))
      }

/*
      console.log(JSON.stringify({ rxRTU, txRTU }, null, 2))
 */

      console.log('interface count: ' + device.interfaces.length)

/* report id, address, read registers, register 532, 16 registers, crc16(le) */
      const size          = 64
          , address       = 0x01
          , readRegisters = 0x03
          , txbuf         = Buffer.from([ txid, address, readRegisters, 532 >> 8, 532 & 0xff, 16 >> 8, 16 & 0xff, 0, 0 ])
          , crc           = crc16m.compute(txbuf.slice(1, txbuf.length - 2))

      txbuf[txbuf.length - 2] = crc & 0xff
      txbuf[txbuf.length - 1] = crc >> 8

      if (txbuf.length > size) throw new Error('oops txbuf length=' + txbuf.length)

      const iface     = device.interface(0)
          , endpoints = iface.endpoints
          , inpoints  = underscore.filter(endpoints, (endpoint) =>
            {
              return ((endpoint.direction === 'in') && (endpoint.transferType === usb.LIBUSB_TRANSFER_TYPE_INTERRUPT))
            })
          , outpoints = underscore.filter(endpoints, (endpoint) =>
            {
              return ((endpoint.direction === 'out') && (endpoint.transferType === usb.LIBUSB_TRANSFER_TYPE_INTERRUPT))
            })

      if (iface.isKernelDriverActive()) iface.detachKernelDriver()
      while (true) {
        try {
          iface.claim()
          break
        } catch(ex) {
          if (ex.errno !== usb.LIBUSB_ERROR_BUSY) return console.log(oops(device, 'claim', ex))

          iface.detachKernelDriver()
        }
      }
      console.log('interface ' + iface.descriptor.iInterface + ' claimed')

      console.log('endpoint count: in=' + inpoints.length + ' out=' + outpoints.length + ' total=' + endpoints.length)
      inpoints.forEach((endpoint) => {
        endpoint.startPoll()
        endpoint.on('data', (data) => {
          let length, reason

          const invalid = (property, actual, desired) => {
            return ('received ' + property + '=0x' + actual.toString(16) + ' (expected 0x' + desired.toString(16) + ')')
          }

          /* report id, address, read registers, length, ... */
          reason = (data.length < 4)                ? 'data underrun'
                 : (data[0] !== rxid)               ? invalid('report ID', data[0], rxid)
                 : (data[1] !==  address)           ? invalid('report address', data[1], address)
                 : (data[2] !==  readRegisters)     ? invalid('report opcode', data[2], readRegisters)
                 : ((length = data[3] + 3) >= size) ? ('invalid report size ' + length)
                 : ''
          console.log(device2str(device, endpoint) + ' data: ' + JSON.stringify(data) + (reason && (' reason: ' + reason)))
        })

        endpoint.on('error', (err) => {
          console.log(device2str(device, endpoint) + ' err: ' + JSON.stringify(err.toString()))
        }).on('end', () => {
          console.log(device2str(device, endpoint) + ' end')
        })
      })

      outpoints.forEach((endpoint) => {
        endpoint.on('error', (err) => {
          console.log(device2str(device, endpoint) + ' err: ' + JSON.stringify(err.toString()))
        }).on('end', () => {
          console.log(device2str(device, endpoint) + ' end')
        })
      })

      const outpoint = outpoints[0]
          , packet   = txbuf.slice(0, txbuf.length - 2)    // Modbus over USB does not send CRC...
      try {
        outpoint.transfer(packet, (err) => {
          console.log(device2str(device, outpoint) + ' transfer: ' + JSON.stringify(err && err.toString()))
        })
        console.log(device2str(device, outpoint) + ' write: len=' + packet.length + ' data=0x' + packet.toString('hex') +
                    JSON.stringify(packet))
      } catch(ex) {
        console.log(oops(device, outpoint, 'write', ex))
      }
    })
  }
  getReport(0, 0)

  return true
})
