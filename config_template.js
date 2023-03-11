module.exports = {
  lnd: {
    host: 'localhost',
    port: 8080,
    macaroon: '~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon',
    certificate: '~/.lnd/tls.cert',
    min_fee: 0,
    max_fee: 150,
    threshold: 10,
  }
}
