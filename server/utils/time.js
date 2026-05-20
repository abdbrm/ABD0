const moment = require('moment-timezone');
const TZ = 'Europe/Moscow';

const now       = ()        => moment().tz(TZ);
const fmt       = (d, f)    => moment(d).tz(TZ).format(f || 'DD.MM.YYYY HH:mm');
const fmtDate   = (d)       => fmt(d, 'DD.MM.YYYY');
const fmtTime   = (d)       => fmt(d, 'HH:mm');
const fmtFull   = (d)       => fmt(d, 'DD.MM.YYYY HH:mm:ss');

module.exports = { now, fmt, fmtDate, fmtTime, fmtFull, TZ };
