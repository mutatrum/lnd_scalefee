require('log-timestamp');

const config = require('./config.js');
const https = require('https');
const fs = require('fs');
const cron = require('node-cron');

let macaroon
let certificate
let identity_pubkey

(async function () {

  console.log('init')

  macaroon = fs.readFileSync(config.lnd.macaroon, {encoding: 'hex'})
  certificate = fs.readFileSync(config.lnd.certificate, {encoding: 'utf-8'})

  const info = await request('GET', '/v1/getinfo')

  identity_pubkey = info.identity_pubkey

  console.log(`connected to ${identity_pubkey}`)

  if (process.argv.length > 2) {
    onSchedule(process.argv[2]);
  } else {
    cron.schedule('* * * * *', () => onSchedule());
  }
})()

async function onSchedule(arg) {
  try {
    const fees = await request('GET', '/v1/fees')
    const channels = await request('GET', '/v1/channels?active_only=true')

    for (var channel of channels.channels) {

      let fee = fees.channel_fees.find(fee => fee.chan_id === channel.chan_id)

      if (!fee) return

      const local_balance = parseInt(channel.local_balance)
      const capacity = parseInt(channel.capacity)
      const ratio = 1 - (local_balance / capacity)
      const fee_range = config.lnd.max_fee - config.lnd.min_fee
      const new_fee = config.lnd.min_fee + Math.round(ratio * fee_range)

      if (Math.abs(fee.fee_per_mil - new_fee) > config.lnd.threshold) {
        const nodeinfo = await request('GET', `/v1/graph/node/${channel.remote_pubkey}`)

        console.log(`${nodeinfo.node.alias}: ${fee.fee_per_mil} -> ${new_fee} ppm (local: ${channel.local_balance}, remote: ${channel.remote_balance}, capacity: ${capacity}, ratio: ${ratio.toFixed(2)})`)

        if (arg) continue

        const [funding_txid_str, output_index] = channel.channel_point.split(':')

        const edgeinfo = await request('GET', `/v1/graph/edge/${channel.chan_id}`)
        const policy = edgeinfo.node1_pub === identity_pubkey ? edgeinfo.node1_policy : edgeinfo.node2_policy

        let requestBody = {
          chan_point: {
            funding_txid_str: funding_txid_str,
            output_index: parseInt(output_index)
          },
          base_fee_msat: 0,
          fee_rate_ppm: new_fee,
          time_lock_delta: policy.time_lock_delta
        }
        let result = await request('POST', '/v1/chanpolicy', requestBody)

        if (result.failed_updates.length > 0) {
          console.log(result)
        }
      }
    }
  }
  catch (error) {
    console.log(error)
  }
}

function request(method, uri, requestBody) {
  const options = {
    host: config.lnd.host,
    port: config.lnd.port,
    path: uri,
    method: method,
    headers : {
      'Accept': 'application/json',
      'Grpc-Metadata-macaroon': macaroon
    },
    ca: certificate
  }
  return new Promise(function(resolve, reject) {
    try {
      const req = https.request(options, res => {
        let body = "";
        res.on("data", data => {
          body += data;
        });
        res.on("end", () => {
          resolve(JSON.parse(body));
        });
      });
      req.on('error', (e) => reject(e));
      if (requestBody) req.write(JSON.stringify(requestBody));
      req.end();
    }
    catch (error) {
      reject(error)
    }
  });
}
