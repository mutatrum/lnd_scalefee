module.exports = {
  lnd: {
    host: 'localhost',
    port: 8080,
    macaroon: '/home/lnd/.lnd/data/chain/bitcoin/mainnet/admin.macaroon',
    certificate: '/home/lnd/.lnd/tls.cert',
    min_fee: 0,
    max_fee: 150,
    threshold: 10,
  }
}
