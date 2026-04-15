const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('orders_src.xlsx');

function xlDate(serial) {
  if (!serial || isNaN(serial)) return '';
  var d = new Date(Math.round((serial - 25569) * 864e5));
  return d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'});
}

function deType(note) {
  var n = (note||'').toLowerCase();
  if (n.includes('кнт') || n.includes('конт')) return 'container';
  if (n.includes('жд') || n.includes('ж/д') || n.includes('ваг') || n.includes('рж')) return 'railway';
  if (n.includes('само') || n.includes('pickup')) return 'pickup';
  return 'truck';
}

function prodShort(p) {
  return (p||'').split(' - ')[0].trim();
}

const months = [
  {sn:'январь 2026', mon:'Январь'},
  {sn:'февраль 2026', mon:'Февраль'},
  {sn:'март 2026', mon:'Март'},
  {sn:'апрель 2026', mon:'Апрель'}
];

var allOrders = [];
var id = 1;
months.forEach(function(m) {
  var ws = wb.Sheets[m.sn];
  var data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
  data.slice(4).forEach(function(r) {
    if (!r[2] || r[2].toString().trim() === '') return;
    var shipped = r[14] || r[15] || r[16] || 0;
    if (typeof shipped === 'string') shipped = parseFloat(shipped.replace(/[^0-9.]/g,'')) || 0;
    var total = +r[19] || 0;
    if (!total && +r[18] && (+r[5] || 0)) total = Math.round(+r[18] * (+r[5] || 0) / 1000);
    allOrders.push({
      id: id++,
      month: m.mon,
      notes: (r[0]||'').toString().trim(),
      orderNum: (r[1]||'').toString().trim(),
      client: (r[2]||'').toString().trim(),
      product: (r[3]||'').toString().trim(),
      productShort: prodShort((r[3]||'').toString()),
      batch: (r[4]||'').toString().trim(),
      qtyKg: +r[5] || 0,
      qtyUnits: +r[6] || 0,
      dest: (r[7]||'').toString().trim(),
      status: (r[8]||'').toString().trim(),
      date: xlDate(r[9]),
      truck: (r[10]||'').toString().trim(),
      driver: (r[12]||'').toString().trim(),
      container: (r[13]||'').toString().trim(),
      acts: (r[17]||'').toString().trim(),
      pricePerTon: +r[18] || 0,
      total: total,
      type: deType(r[0])
    });
  });
});

// stats
var totalSum = allOrders.reduce(function(a,b){return a+b.total;},0);
var totalKg  = allOrders.reduce(function(a,b){return a+b.qtyKg;},0);
var clients  = [...new Set(allOrders.map(function(o){return o.client;}))];

console.log('Orders:', allOrders.length);
console.log('Sum:', totalSum.toLocaleString('ru'), '₽');
console.log('Volume:', (totalKg/1000).toFixed(1), 'тн');
console.log('Clients:', clients.length);
console.log('Sample:', JSON.stringify(allOrders[0], null, 2));

fs.writeFileSync('orders_data.js', 'var ORDERS_DATA = ' + JSON.stringify(allOrders) + ';');
console.log('Done: orders_data.js');
