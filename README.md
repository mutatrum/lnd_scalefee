# LND Fee Scale

A stupid simple proportional fee changer, per inbound/outbound ratio of your channels, between a minimum and maximum fee. A channel with no outbound liquidity gets the maximum fee and vice verse. This should encourage liquidity streams toward balanced channels.

First run `npm install`, then copy `config_template.js` to `config.js`, fill in the details and run it. All fee numbers are ppm.

It will update fees once an hour, if they exceed the threshold. 
