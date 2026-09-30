const {widths,bits}=require('./03-code128-reference');
const CODE128B=require('jsbarcode/bin/barcodes').default.CODE128B;
const codes=["AST-0000-00-0001","AST-0000-00-0002","A","Hello World ~!","0000000000"];
for(const c of codes){const ref=new CODE128B(c,{}).encode().data;const m=bits(widths(c));console.log(c.padEnd(18),m===ref?"MATCH":"DIFF",m.length);}
